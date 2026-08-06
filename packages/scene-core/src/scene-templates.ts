import type { SceneDefinition } from "./types.js";
import { rebuildCollisions } from "./footprint.js";
import { licenseEssentials } from "./essentials-license.js";
import { PE_TILE_SIZE } from "./essentials-tiles.js";
import {
	ESSENTIALS_BASE,
	GYMS_INTERIOR_TILESET,
	INTERIOR_GENERAL_TILESET,
	MART_INTERIOR_TILESET,
	POKE_CENTER_TILESET,
	ensureSceneTileset,
	type CatalogTileset,
} from "./essentials-catalog.js";
import { DEFAULT_CHARSET } from "./charset.js";
import { buildCollisionsFromMap, filledTiles, perimeterCollisionMap } from "./demo-scene.js";

export type SceneTemplateId =
	| "blank"
	| "small-room"
	| "gym-arena"
	| "mart"
	| "bedroom"
	| "poke-center-tiled";

export const SCENE_TEMPLATE_LABELS: Record<SceneTemplateId, string> = {
	blank: "En blanco",
	"small-room": "Habitación pequeña",
	"gym-arena": "Gimnasio",
	mart: "Tienda (Mart)",
	bedroom: "Dormitorio",
	"poke-center-tiled": "Poké Center (tileset RSE)",
};

type TemplateSpec = {
	width: number;
	height: number;
	catalog: CatalogTileset;
	collisionMap: string[];
	spawn: { x: number; y: number; facing: "up" | "down" | "left" | "right" };
	cameraMode: "fit-room" | "follow-player";
	name: string;
};

const TEMPLATE_SPECS: Record<SceneTemplateId, TemplateSpec> = {
	blank: {
		width: 12,
		height: 10,
		catalog: INTERIOR_GENERAL_TILESET,
		collisionMap: perimeterCollisionMap(12, 10),
		spawn: { x: 6, y: 8, facing: "up" },
		cameraMode: "fit-room",
		name: "Nuevo escenario",
	},
	"small-room": {
		width: 12,
		height: 10,
		catalog: INTERIOR_GENERAL_TILESET,
		collisionMap: perimeterCollisionMap(12, 10),
		spawn: { x: 6, y: 8, facing: "up" },
		cameraMode: "fit-room",
		name: "Habitación pequeña",
	},
	bedroom: {
		width: 10,
		height: 8,
		catalog: INTERIOR_GENERAL_TILESET,
		collisionMap: perimeterCollisionMap(10, 8),
		spawn: { x: 5, y: 6, facing: "up" },
		cameraMode: "fit-room",
		name: "Dormitorio",
	},
	mart: {
		width: 14,
		height: 10,
		catalog: MART_INTERIOR_TILESET,
		collisionMap: (() => {
			const rows = perimeterCollisionMap(14, 10);
			rows[3] = "#............#";
			return rows;
		})(),
		spawn: { x: 7, y: 8, facing: "up" },
		cameraMode: "fit-room",
		name: "Tienda",
	},
	"gym-arena": {
		width: 20,
		height: 16,
		catalog: GYMS_INTERIOR_TILESET,
		collisionMap: (() => {
			const rows = perimeterCollisionMap(20, 16);
			for (let y = 4; y < 12; y++) {
				const row = rows[y]!.split("");
				row[9] = "#";
				row[10] = "#";
				rows[y] = row.join("");
			}
			return rows;
		})(),
		spawn: { x: 10, y: 13, facing: "up" },
		cameraMode: "follow-player",
		name: "Gimnasio",
	},
	"poke-center-tiled": {
		width: 15,
		height: 10,
		catalog: POKE_CENTER_TILESET,
		collisionMap: perimeterCollisionMap(15, 10),
		spawn: { x: 7, y: 8, facing: "up" },
		cameraMode: "fit-room",
		name: "Poké Center (tileset)",
	},
};

function playerAssets() {
	return [
		{
			id: "asset-player-boy",
			name: "Boy",
			imageUrl: `${ESSENTIALS_BASE}/player/boy-charset.png`,
			sourceType: "sprite-sheet" as const,
			tags: ["player", "boy"],
			license: { ...licenseEssentials },
			footprint: { widthInTiles: 1, heightInTiles: 1 },
			anchor: { x: 0.5, y: 1 },
			defaults: { layer: "actors", collision: false, zIndex: 20 },
		},
		{
			id: "asset-player-girl",
			name: "Girl",
			imageUrl: `${ESSENTIALS_BASE}/player/girl-charset.png`,
			sourceType: "sprite-sheet" as const,
			tags: ["player", "girl"],
			license: { ...licenseEssentials },
			footprint: { widthInTiles: 1, heightInTiles: 1 },
			anchor: { x: 0.5, y: 1 },
			defaults: { layer: "actors", collision: false, zIndex: 20 },
		},
	];
}

export function createSceneFromTemplate(
	templateId: SceneTemplateId,
	overrides?: Partial<SceneDefinition>,
	now = new Date().toISOString(),
): SceneDefinition {
	const spec = TEMPLATE_SPECS[templateId];
	const { width: w, height: h } = spec;
	const { tilesets, tilesetId } = ensureSceneTileset([], spec.catalog);
	const wallMask = buildCollisionsFromMap(spec.collisionMap, w, h);

	const scene: SceneDefinition = {
		id: `scene-${crypto.randomUUID().slice(0, 8)}`,
		slug: `scene-${templateId}`,
		name: spec.name,
		status: "draft",
		version: 1,
		grid: { tileSize: PE_TILE_SIZE, width: w, height: h },
		presentation: {
			backgroundColor: "#1a1a24",
			camera: { mode: spec.cameraMode },
		},
		tilesets,
		assets: playerAssets(),
		tileLayers: [
			{
				id: "layer-floor",
				name: "Floor",
				zIndex: 0,
				tiles: filledTiles(-1, w, h),
				tilesetId,
			},
			{
				id: "layer-walls",
				name: "Walls",
				zIndex: 1,
				tiles: filledTiles(-1, w, h),
				tilesetId,
			},
		],
		objects: [],
		collisions: wallMask,
		interactions: [],
		spawnPoints: [
			{
				id: "spawn-main",
				name: "Start",
				x: spec.spawn.x,
				y: spec.spawn.y,
				facing: spec.spawn.facing,
			},
		],
		defaultSpawnId: "spawn-main",
		player: {
			spriteAssetId: "asset-player-boy",
			movementSpeed: 2.5,
			facing: spec.spawn.facing,
			charset: DEFAULT_CHARSET,
		},
		createdAt: now,
		updatedAt: now,
		...overrides,
	};

	scene.collisions = rebuildCollisions(scene, wallMask);
	return scene;
}

export function listSceneTemplates(): Array<{ id: SceneTemplateId; label: string }> {
	return (Object.keys(SCENE_TEMPLATE_LABELS) as SceneTemplateId[]).map((id) => ({
		id,
		label: SCENE_TEMPLATE_LABELS[id],
	}));
}
