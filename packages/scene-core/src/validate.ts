import type { AssetDefinition, ContentTarget, SceneDefinition } from "./types.js";

export type ValidationIssue = { path: string; message: string };

export function validateContentTarget(target: unknown, path = "target"): ValidationIssue[] {
	if (!target || typeof target !== "object") return [{ path, message: "Target inválido" }];
	const t = target as ContentTarget;
	switch (t.type) {
		case "internal-route":
			return typeof t.path === "string" && t.path.startsWith("/")
				? []
				: [{ path, message: "Ruta interna debe empezar con /" }];
		case "external-url":
			return typeof t.url === "string" && /^https?:\/\//.test(t.url)
				? []
				: [{ path, message: "URL externa inválida" }];
		case "collection":
			return typeof t.collectionId === "string" && t.collectionId
				? []
				: [{ path, message: "collectionId requerido" }];
		case "content-entry":
			return typeof t.collectionId === "string" && typeof t.entryId === "string"
				? []
				: [{ path, message: "collectionId y entryId requeridos" }];
		case "scene":
			return typeof t.sceneId === "string" && t.sceneId
				? []
				: [{ path, message: "sceneId requerido" }];
		default:
			return [{ path, message: "Tipo de target desconocido" }];
	}
}

export function assetBlocksPublish(asset: AssetDefinition): boolean {
	return asset.license.distributionPolicy === "unclear-do-not-use";
}

export function validateScene(scene: unknown): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	if (!scene || typeof scene !== "object") {
		return [{ path: "", message: "Escenario inválido" }];
	}
	const s = scene as SceneDefinition;

	for (const field of ["id", "slug", "name"] as const) {
		if (typeof s[field] !== "string" || !s[field]) {
			issues.push({ path: field, message: `${field} requerido` });
		}
	}
	if (!s.grid || typeof s.grid.width !== "number" || typeof s.grid.height !== "number") {
		issues.push({ path: "grid", message: "grid.width/height requeridos" });
		return issues;
	}
	const cells = s.grid.width * s.grid.height;
	if (!Array.isArray(s.collisions) || s.collisions.length !== cells) {
		issues.push({ path: "collisions", message: `collisions debe tener ${cells} celdas` });
	}
	if (!Array.isArray(s.spawnPoints) || s.spawnPoints.length === 0) {
		issues.push({ path: "spawnPoints", message: "Al menos un spawn" });
	} else if (!s.spawnPoints.some((p) => p.id === s.defaultSpawnId)) {
		issues.push({ path: "defaultSpawnId", message: "defaultSpawnId no existe" });
	}
	for (const asset of s.assets ?? []) {
		if (assetBlocksPublish(asset)) {
			issues.push({
				path: `assets.${asset.id}.license`,
				message: `Asset "${asset.name}" tiene licencia unclear-do-not-use`,
			});
		}
		if (!asset.license?.name) {
			issues.push({ path: `assets.${asset.id}.license`, message: "Licencia incompleta" });
		}
	}
	for (const interaction of s.interactions ?? []) {
		issues.push(...validateContentTarget(interaction.target, `interactions.${interaction.id}`));
	}
	return issues;
}

export function assertValidScene(scene: unknown): SceneDefinition {
	const issues = validateScene(scene);
	if (issues.length) {
		throw new Error(issues.map((i) => `${i.path}: ${i.message}`).join("; "));
	}
	return scene as SceneDefinition;
}

export function serializeScene(scene: SceneDefinition): string {
	return JSON.stringify(scene, null, 2);
}

export function parseSceneJson(raw: string): SceneDefinition {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error("JSON inválido");
	}
	return assertValidScene(data);
}
