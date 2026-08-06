import {
	assertValidScene,
	createPokemonRoomScene,
	createSceneFromTemplate,
	DEMO_ASSET_PACK,
	type SceneDefinition,
	type SceneRecord,
	type SceneTemplateId,
	validateScene,
} from "@poke-emdash/scene-core";

type StorageCollection = {
	get: (id: string) => Promise<SceneRecord | null | undefined>;
	put: (id: string, data: SceneRecord) => Promise<void>;
	delete: (id: string) => Promise<void>;
	query: (opts?: {
		orderBy?: Record<string, "asc" | "desc">;
		limit?: number;
	}) => Promise<{ items: Array<{ id: string; data: SceneRecord }> }>;
};

type Kv = {
	get: (key: string) => Promise<unknown>;
	set: (key: string, value: unknown) => Promise<void>;
};

export async function ensureSeedScene(storage: { scenes: StorageCollection }, kv: Kv) {
	const existing = await storage.scenes.query({ limit: 100 });
	const demo = existing.items.find(
		({ id, data }) => id === "scene-demo-room" || data.slug === "demo-room",
	);

	const scene = createPokemonRoomScene();
	const record: SceneRecord = {
		slug: scene.slug,
		name: scene.name,
		status: "published",
		updatedAt: scene.updatedAt,
		version: scene.version,
		isHome: true,
		draftData: scene,
		publishedData: scene,
	};

	if (!demo) {
		await storage.scenes.put(scene.id, record);
		await kv.set("homeSceneId", scene.id);
		await kv.set("demoAssetPack", DEMO_ASSET_PACK);
		return;
	}

	const pack = Number((await kv.get("demoAssetPack")) ?? 0);
	const publishedUrl = demo.data.publishedData?.assets?.[0]?.imageUrl ?? "";
	const published = demo.data.publishedData;
	const publishedBg = published?.presentation?.backgroundImageUrl ?? "";
	const staleArt =
		publishedUrl.includes("/placeholders/") ||
		!publishedUrl.includes("/scene-assets/") ||
		(published?.version ?? 0) < DEMO_ASSET_PACK ||
		published?.grid?.width !== scene.grid.width ||
		published?.grid?.height !== scene.grid.height ||
		publishedBg !== (scene.presentation.backgroundImageUrl ?? "");

	if (pack >= DEMO_ASSET_PACK && !staleArt) return;

	await storage.scenes.put(demo.id, {
		...demo.data,
		...record,
		isHome: true,
	});
	await kv.set("homeSceneId", demo.id);
	await kv.set("demoAssetPack", DEMO_ASSET_PACK);
}

export async function listScenes(storage: { scenes: StorageCollection }) {
	const result = await storage.scenes.query({
		orderBy: { updatedAt: "desc" },
		limit: 100,
	});
	return result.items.map(({ id, data }) => ({
		id,
		slug: data.slug,
		name: data.name,
		status: data.status,
		updatedAt: data.updatedAt,
		version: data.version,
		isHome: Boolean(data.isHome),
		hasPublished: Boolean(data.publishedData),
	}));
}

export async function getScene(storage: { scenes: StorageCollection }, id: string) {
	return (await storage.scenes.get(id)) ?? null;
}

export async function getPublishedBySlug(
	storage: { scenes: StorageCollection },
	slug: string,
): Promise<SceneDefinition | null> {
	const result = await storage.scenes.query({ limit: 100 });
	const match = result.items.find(({ data }) => data.slug === slug && data.publishedData);
	return match?.data.publishedData ?? null;
}

export async function getHomeScene(
	storage: { scenes: StorageCollection },
	kv: Kv,
): Promise<SceneDefinition | null> {
	const homeId = (await kv.get("homeSceneId")) as string | null;
	if (homeId) {
		const record = await storage.scenes.get(homeId);
		if (record?.publishedData) return record.publishedData;
	}
	const result = await storage.scenes.query({ limit: 100 });
	const published = result.items.find(({ data }) => data.publishedData);
	return published?.data.publishedData ?? null;
}

export async function saveDraft(
	storage: { scenes: StorageCollection },
	id: string,
	draft: SceneDefinition,
) {
	const issues = validateScene(draft);
	if (issues.length) throw new Error(issues.map((i) => i.message).join("; "));

	const existing = await storage.scenes.get(id);
	const now = new Date().toISOString();
	const nextDraft = { ...draft, id, updatedAt: now, status: "draft" as const };
	const record: SceneRecord = {
		slug: nextDraft.slug,
		name: nextDraft.name,
		status: existing?.publishedData ? "published" : "draft",
		updatedAt: now,
		version: (existing?.version ?? 0) + 1,
		isHome: existing?.isHome,
		draftData: nextDraft,
		publishedData: existing?.publishedData ?? null,
	};
	await storage.scenes.put(id, record);
	return record;
}

export async function createScene(
	storage: { scenes: StorageCollection },
	input?: { name?: string; slug?: string; templateId?: SceneTemplateId },
) {
	const templateId = input?.templateId ?? "blank";
	const base = createSceneFromTemplate(templateId);
	const id = `scene-${crypto.randomUUID().slice(0, 8)}`;
	const now = new Date().toISOString();
	const draft: SceneDefinition = {
		...base,
		id,
		slug: input?.slug ?? `escenario-${id.slice(-6)}`,
		name: input?.name ?? base.name,
		status: "draft",
		createdAt: now,
		updatedAt: now,
	};
	const record: SceneRecord = {
		slug: draft.slug,
		name: draft.name,
		status: "draft",
		updatedAt: now,
		version: 1,
		draftData: draft,
		publishedData: null,
	};
	await storage.scenes.put(id, record);
	return { id, record };
}

export async function publishScene(
	storage: { scenes: StorageCollection },
	id: string,
) {
	const existing = await storage.scenes.get(id);
	if (!existing) throw new Error("Escenario no encontrado");
	const draft = assertValidScene(existing.draftData);
	const now = new Date().toISOString();
	const published: SceneDefinition = {
		...draft,
		status: "published",
		updatedAt: now,
		version: existing.version + 1,
	};
	const record: SceneRecord = {
		...existing,
		status: "published",
		updatedAt: now,
		version: published.version,
		draftData: published,
		publishedData: published,
	};
	await storage.scenes.put(id, record);
	return record;
}

export async function unpublishScene(
	storage: { scenes: StorageCollection },
	id: string,
) {
	const existing = await storage.scenes.get(id);
	if (!existing) throw new Error("Escenario no encontrado");
	const now = new Date().toISOString();
	const record: SceneRecord = {
		...existing,
		status: "draft",
		updatedAt: now,
		publishedData: null,
	};
	await storage.scenes.put(id, record);
	return record;
}

export async function setHomeScene(kv: Kv, id: string) {
	await kv.set("homeSceneId", id);
}

export async function deleteScene(storage: { scenes: StorageCollection }, id: string) {
	await storage.scenes.delete(id);
}

export async function importSceneJson(
	storage: { scenes: StorageCollection },
	raw: string,
) {
	const parsed = assertValidScene(JSON.parse(raw));
	const id = parsed.id || `scene-${crypto.randomUUID().slice(0, 8)}`;
	const now = new Date().toISOString();
	const draft = { ...parsed, id, updatedAt: now, status: "draft" as const };
	const record: SceneRecord = {
		slug: draft.slug,
		name: draft.name,
		status: "draft",
		updatedAt: now,
		version: draft.version || 1,
		draftData: draft,
		publishedData: null,
	};
	await storage.scenes.put(id, record);
	return { id, record };
}
