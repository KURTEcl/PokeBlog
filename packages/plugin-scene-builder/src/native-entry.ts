import { definePlugin } from "emdash";
import { serializeScene } from "@poke-emdash/scene-core";
import {
	createScene,
	deleteScene,
	ensureSeedScene,
	getHomeScene,
	getPublishedBySlug,
	getScene,
	importSceneJson,
	listScenes,
	publishScene,
	saveDraft,
	setHomeScene,
	unpublishScene,
} from "./store.js";

const VERSION = "0.1.0";
const ID = "scene-builder";

function readBody(ctx: { input?: unknown; request?: Request }) {
	return ctx.input ?? null;
}

export function createPlugin() {
	return definePlugin({
		id: ID,
		version: VERSION,
		storage: {
			scenes: { indexes: ["slug", "status", "updatedAt"] },
		},
		admin: {
			entry: "@poke-emdash/plugin-scene-builder/admin",
			pages: [{ path: "/scenes", label: "Editor de escenarios", icon: "layout" }],
		},
		hooks: {
			"plugin:install": {
				handler: async (_event: unknown, ctx: any) => {
					await ensureSeedScene(ctx.storage, ctx.kv);
				},
			},
		},
		routes: {
			"public-home": {
				public: true,
				handler: async (ctx: any) => {
					await ensureSeedScene(ctx.storage, ctx.kv);
					return { scene: await getHomeScene(ctx.storage, ctx.kv) };
				},
			},
			"public-by-slug": {
				public: true,
				handler: async (ctx: any) => {
					const url = new URL(ctx.request.url);
					const slug = url.searchParams.get("slug");
					if (!slug) throw new Error("slug required");
					const scene = await getPublishedBySlug(ctx.storage, slug);
					if (!scene) throw new Error("not found");
					return { scene };
				},
			},
			scenes: {
				handler: async (ctx: any) => {
					await ensureSeedScene(ctx.storage, ctx.kv);
					if (ctx.request.method === "GET") {
						return { scenes: await listScenes(ctx.storage) };
					}
					if (ctx.request.method === "POST") {
						const input = (readBody(ctx) ?? {}) as {
							name?: string;
							slug?: string;
							templateId?: import("@poke-emdash/scene-core").SceneTemplateId;
						};
						return await createScene(ctx.storage, input);
					}
					throw new Error("method not allowed");
				},
			},
			"scene-get": {
				handler: async (ctx: any) => {
					const url = new URL(ctx.request.url);
					const id = url.searchParams.get("id");
					if (!id) throw new Error("id required");
					const record = await getScene(ctx.storage, id);
					if (!record) throw new Error("not found");
					return { id, record };
				},
			},
			"scene-save": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { id?: string; draft?: unknown };
					if (!body?.id || !body.draft) throw new Error("id and draft required");
					const record = await saveDraft(ctx.storage, body.id, body.draft as any);
					return { id: body.id, record };
				},
			},
			"scene-publish": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { id?: string };
					if (!body?.id) throw new Error("id required");
					return { id: body.id, record: await publishScene(ctx.storage, body.id) };
				},
			},
			"scene-unpublish": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { id?: string };
					if (!body?.id) throw new Error("id required");
					return { id: body.id, record: await unpublishScene(ctx.storage, body.id) };
				},
			},
			"scene-home": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { id?: string };
					if (!body?.id) throw new Error("id required");
					await setHomeScene(ctx.kv, body.id);
					const record = await getScene(ctx.storage, body.id);
					if (record) {
						await ctx.storage.scenes.put(body.id, { ...record, isHome: true });
					}
					return { ok: true, id: body.id };
				},
			},
			"scene-delete": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { id?: string };
					if (!body?.id) throw new Error("id required");
					await deleteScene(ctx.storage, body.id);
					return { ok: true };
				},
			},
			"scene-export": {
				handler: async (ctx: any) => {
					const url = new URL(ctx.request.url);
					const id = url.searchParams.get("id");
					if (!id) throw new Error("id required");
					const record = await getScene(ctx.storage, id);
					if (!record) throw new Error("not found");
					return { json: serializeScene(record.draftData) };
				},
			},
			"scene-import": {
				handler: async (ctx: any) => {
					const body = readBody(ctx) as { json?: string };
					if (!body?.json) throw new Error("json required");
					return await importSceneJson(ctx.storage, body.json);
				},
			},
			"route-options": {
				handler: async () => ({
					routes: [
						{ path: "/posts", label: "Posts" },
						{ path: "/decklists", label: "Decklists" },
						{ path: "/results", label: "Results / tournaments" },
						{ path: "/videos", label: "Videos" },
						{ path: "/category/analysis", label: "Analysis" },
						{ path: "/category/tournaments", label: "Tournaments" },
						{ path: "/search", label: "Search" },
						{ path: "/asset-credits", label: "Asset credits" },
					],
				}),
			},
		},
	});
}
