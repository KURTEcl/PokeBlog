import type { SceneDefinition } from "./types.js";
import { rebuildCollisions } from "./footprint.js";
import { licenseEssentials } from "./essentials-license.js";
import { PE_TILESET_COLUMNS, PE_TILE_SIZE } from "./essentials-tiles.js";
import {
	ESSENTIALS_BASE,
	GYMS_INTERIOR_TILESET,
	INTERIOR_GENERAL_TILESET,
	MART_INTERIOR_TILESET,
	POKE_CENTER_TILESET,
	ensureSceneTileset,
} from "./essentials-catalog.js";
import { DEFAULT_CHARSET } from "./charset.js";

/**
 * Bump when room art / collision map changes so ensureSeedScene refreshes.
 * Layout source of truth: docs/POKE_CENTER.md + recursos/tileset-juego/pokemoncenter.png
 */
export const DEMO_ASSET_PACK = 18;

/** 15×10 @ 32px = 480×320 — matches reference 240×160 @ 16px scaled 2×. */
const W = 15;
const H = 10;

/**
 * Collision from reference (docs/POKE_CENTER.md).
 * `#` blocked · `.` walkable · `m` mat (walkable)
 */
const COLLISION_MAP = [
	"###############",
	"###############",
	"#...#######...#",
	"#...#######...#",
	"#.............#",
	"##.........##.#",
	"###........##.#",
	"###........##.#",
	"#......mm.....#",
	"###############",
];

function filled(value: number, w: number, h: number): number[] {
	return Array.from({ length: w * h }, () => value);
}

function buildCollisionsFromMap(map: string[], w: number, h: number): number[] {
	const out = filled(1, w, h);
	for (let y = 0; y < h; y++) {
		const row = map[y]!;
		if (row.length !== w) {
			throw new Error(`collision row ${y} length ${row.length} !== ${w}`);
		}
		for (let x = 0; x < w; x++) {
			const ch = row[x]!;
			out[y * w + x] = ch === "." || ch === "m" ? 0 : 1;
		}
	}
	return out;
}

function perimeterCollisionMap(w: number, h: number): string[] {
	const rows: string[] = [];
	for (let y = 0; y < h; y++) {
		let row = "";
		for (let x = 0; x < w; x++) {
			const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
			row += edge ? "#" : ".";
		}
		rows.push(row);
	}
	return rows;
}

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

function emptyLayers(w: number, h: number, tilesetId: string) {
	return [
		{
			id: "layer-floor",
			name: "Floor",
			zIndex: 0,
			tiles: filled(-1, w, h),
			tilesetId,
		},
		{
			id: "layer-walls",
			name: "Walls",
			zIndex: 1,
			tiles: filled(-1, w, h),
			tilesetId,
		},
	];
}

const pokeCenterTilesetRef = {
	id: "ts-poke-center",
	name: POKE_CENTER_TILESET.name,
	imageUrl: POKE_CENTER_TILESET.imageUrl,
	tileSize: PE_TILE_SIZE,
	columns: PE_TILESET_COLUMNS,
	tileCount: POKE_CENTER_TILESET.tileCount,
	license: licenseEssentials,
};

/**
 * Demo Pokémon Center — explore-only (interactions added later).
 * Visual: tileset-juego reference. See docs/POKE_CENTER.md.
 */
export function createPokemonRoomScene(now = new Date().toISOString()): SceneDefinition {
	const wallMask = buildCollisionsFromMap(COLLISION_MAP, W, H);

	const scene: SceneDefinition = {
		id: "scene-demo-room",
		slug: "demo-room",
		name: "Pokémon Center",
		status: "published",
		version: DEMO_ASSET_PACK,
		grid: { tileSize: PE_TILE_SIZE, width: W, height: H },
		presentation: {
			backgroundColor: "#000000",
			backgroundImageUrl: `${ESSENTIALS_BASE}/rooms/poke-center.png`,
			letterboxStyle: "contain",
			camera: { mode: "fit-room" },
		},
		tilesets: [pokeCenterTilesetRef],
		assets: playerAssets(),
		tileLayers: emptyLayers(W, H, "ts-poke-center"),
		objects: [],
		collisions: wallMask,
		interactions: [],
		spawnPoints: [{ id: "spawn-main", name: "Entrance", x: 7, y: 7, facing: "up" }],
		defaultSpawnId: "spawn-main",
		player: {
			spriteAssetId: "asset-player-boy",
			movementSpeed: 2.5,
			facing: "up",
			charset: DEFAULT_CHARSET,
		},
		createdAt: now,
		updatedAt: now,
	};

	scene.collisions = rebuildCollisions(scene, wallMask);
	return scene;
}

export { buildCollisionsFromMap, perimeterCollisionMap, filled as filledTiles };
