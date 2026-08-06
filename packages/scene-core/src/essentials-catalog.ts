/**
 * Typed Essentials asset catalog — mirrors scripts/essentials-manifest.json.
 */
import { PE_TILESET_COLUMNS, PE_TILE_SIZE, peTileIndex } from "./essentials-tiles.js";
import { licenseEssentials } from "./essentials-license.js";

export const ESSENTIALS_BASE = "/scene-assets/essentials";

export type CatalogTilePreset = { id: string; name: string; index: number };

export type CatalogProp = {
	id: string;
	name: string;
	imageUrl: string;
	sourceTileset: string;
	col: number;
	row: number;
	wTiles: number;
	hTiles: number;
	tags: string[];
	collision: boolean;
	tilesetFrame?: boolean;
};

export type CatalogTileset = {
	id: string;
	name: string;
	imageUrl: string;
	tileSize: number;
	columns: number;
	tileCount: number;
};

/** Poké Center interior tile indices (row × 8 + col). Skip red-X empty slots. */
export const POKE_CENTER_TILES = {
	floorCream: peTileIndex(10, 0),
	floorCreamAlt: peTileIndex(10, 1),
	/** Center tile of the red entrance mat (full mat is a 3-wide prop). */
	floorMat: peTileIndex(21, 1),
	wallBack: peTileIndex(1, 0),
	wallBackMid: peTileIndex(1, 1),
	wallSide: peTileIndex(1, 2),
	wallCornerTL: peTileIndex(1, 0),
	wallCornerTR: peTileIndex(1, 2),
	wallTrim: peTileIndex(0, 1),
	wallBlock: peTileIndex(1, 1),
	wallLower: peTileIndex(1, 0),
	/** 2×2 floor Poké Ball emblem (top-left). */
	floorBallTL: peTileIndex(15, 0),
	floorBallTR: peTileIndex(15, 1),
	floorBallBL: peTileIndex(16, 0),
	floorBallBR: peTileIndex(16, 1),
} as const;

export const POKE_CENTER_TILESET: CatalogTileset = {
	id: "poke-center-interior",
	name: "Poké Center interior",
	imageUrl: `${ESSENTIALS_BASE}/tiles/poke-center-interior.png`,
	tileSize: PE_TILE_SIZE,
	columns: PE_TILESET_COLUMNS,
	tileCount: PE_TILESET_COLUMNS * 40,
};

export const INTERIOR_GENERAL_TILESET: CatalogTileset = {
	id: "interior-general",
	name: "Interior general",
	imageUrl: `${ESSENTIALS_BASE}/tiles/interior-general.png`,
	tileSize: PE_TILE_SIZE,
	columns: PE_TILESET_COLUMNS,
	tileCount: PE_TILESET_COLUMNS * 251,
};

export const MART_INTERIOR_TILESET: CatalogTileset = {
	id: "mart-interior",
	name: "Mart interior",
	imageUrl: `${ESSENTIALS_BASE}/tiles/mart-interior.png`,
	tileSize: PE_TILE_SIZE,
	columns: PE_TILESET_COLUMNS,
	tileCount: PE_TILESET_COLUMNS * 18,
};

export const GYMS_INTERIOR_TILESET: CatalogTileset = {
	id: "gyms-interior",
	name: "Gyms interior",
	imageUrl: `${ESSENTIALS_BASE}/tiles/gyms-interior.png`,
	tileSize: PE_TILE_SIZE,
	columns: PE_TILESET_COLUMNS,
	tileCount: PE_TILESET_COLUMNS * 144,
};

export const ALL_TILESETS: CatalogTileset[] = [
	POKE_CENTER_TILESET,
	INTERIOR_GENERAL_TILESET,
	MART_INTERIOR_TILESET,
	GYMS_INTERIOR_TILESET,
	{
		id: "outside",
		name: "Outside",
		imageUrl: `${ESSENTIALS_BASE}/tiles/outside.png`,
		tileSize: PE_TILE_SIZE,
		columns: PE_TILESET_COLUMNS,
		tileCount: PE_TILESET_COLUMNS * 502,
	},
];

/** Touch control sprites from Essentials UI/Controls help */
export const UI_CONTROLS = {
	arrows: `${ESSENTIALS_BASE}/ui/help-arrows.png`,
	action: `${ESSENTIALS_BASE}/ui/help-action.png`,
	back: `${ESSENTIALS_BASE}/ui/help-back.png`,
} as const;

/** Native pixel dimensions for Essentials help UI sprites */
export const UI_CONTROL_SIZES = {
	arrows: { width: 102, height: 68, cell: 34 },
	key: { width: 102, height: 42 },
	displayScale: 1,
} as const;

/** Fixed CSS integer scale for the Phaser canvas on touch devices. */
export const MOBILE_SCENE_ZOOM = 2;

/** Default CSS integer scale for the Phaser canvas on desktop. */
export const DESKTOP_SCENE_ZOOM = 3;

export function catalogTilesetById(id: string): CatalogTileset | undefined {
	return ALL_TILESETS.find((t) => t.id === id);
}

export function sceneTilesetId(catalogId: string): string {
	return `ts-${catalogId}`;
}

export function ensureSceneTileset(
	tilesets: Array<{
		id: string;
		name: string;
		imageUrl: string;
		tileSize: number;
		columns: number;
		tileCount: number;
		license: typeof licenseEssentials;
	}>,
	catalog: CatalogTileset,
) {
	const id = sceneTilesetId(catalog.id);
	const existing = tilesets.find((t) => t.id === id || t.imageUrl === catalog.imageUrl);
	if (existing) return { tilesets, tilesetId: existing.id };
	return {
		tilesets: [
			...tilesets,
			{
				id,
				name: catalog.name,
				imageUrl: catalog.imageUrl,
				tileSize: catalog.tileSize,
				columns: catalog.columns,
				tileCount: catalog.tileCount,
				license: licenseEssentials,
			},
		],
		tilesetId: id,
	};
}

/** Named furniture crops (verified against Poké Center interior sheet). */
export const CATALOG_PROPS: CatalogProp[] = [
	{
		id: "pc",
		name: "PC",
		imageUrl: `${ESSENTIALS_BASE}/objects/pc.png`,
		sourceTileset: "poke-center-interior",
		col: 7,
		row: 27,
		wTiles: 1,
		hTiles: 2,
		tags: ["interact", "tech"],
		collision: true,
	},
	{
		id: "plant",
		name: "Plant",
		imageUrl: `${ESSENTIALS_BASE}/objects/plant.png`,
		sourceTileset: "poke-center-interior",
		col: 6,
		row: 27,
		wTiles: 1,
		hTiles: 1,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "counter",
		name: "Counter",
		imageUrl: `${ESSENTIALS_BASE}/objects/counter.png`,
		sourceTileset: "poke-center-interior",
		col: 0,
		row: 28,
		wTiles: 2,
		hTiles: 1,
		tags: ["interact"],
		collision: true,
	},
	{
		id: "counter-wide",
		name: "Counter wide",
		imageUrl: `${ESSENTIALS_BASE}/objects/counter-wide.png`,
		sourceTileset: "poke-center-interior",
		col: 0,
		row: 28,
		wTiles: 5,
		hTiles: 1,
		tags: ["interact"],
		collision: true,
	},
	{
		id: "healing-machine",
		name: "Healing machine",
		imageUrl: `${ESSENTIALS_BASE}/objects/healing-machine.png`,
		sourceTileset: "poke-center-interior",
		col: 5,
		row: 24,
		wTiles: 2,
		hTiles: 2,
		tags: ["interact"],
		collision: true,
	},
	{
		id: "heal-cross",
		name: "Heal cross panel",
		imageUrl: `${ESSENTIALS_BASE}/objects/heal-cross.png`,
		sourceTileset: "poke-center-interior",
		col: 7,
		row: 25,
		wTiles: 1,
		hTiles: 1,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "mat",
		name: "Entrance mat",
		imageUrl: `${ESSENTIALS_BASE}/objects/mat.png`,
		sourceTileset: "poke-center-interior",
		col: 0,
		row: 21,
		wTiles: 3,
		hTiles: 1,
		tags: ["deco", "entrance"],
		collision: false,
	},
	{
		id: "wall-tv",
		name: "Wall screen",
		imageUrl: `${ESSENTIALS_BASE}/objects/wall-tv.png`,
		sourceTileset: "poke-center-interior",
		col: 0,
		row: 6,
		wTiles: 1,
		hTiles: 2,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "wall-map",
		name: "Wall map",
		imageUrl: `${ESSENTIALS_BASE}/objects/wall-map.png`,
		sourceTileset: "poke-center-interior",
		col: 2,
		row: 6,
		wTiles: 1,
		hTiles: 2,
		tags: ["interact"],
		collision: true,
	},
	{
		id: "wall-cabinet",
		name: "Wall cabinet",
		imageUrl: `${ESSENTIALS_BASE}/objects/wall-cabinet.png`,
		sourceTileset: "poke-center-interior",
		col: 3,
		row: 6,
		wTiles: 1,
		hTiles: 2,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "sofa",
		name: "Sofa",
		imageUrl: `${ESSENTIALS_BASE}/objects/sofa.png`,
		sourceTileset: "poke-center-interior",
		col: 2,
		row: 29,
		wTiles: 3,
		hTiles: 2,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "glass-table",
		name: "Glass table",
		imageUrl: `${ESSENTIALS_BASE}/objects/glass-table.png`,
		sourceTileset: "poke-center-interior",
		col: 5,
		row: 29,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "poster",
		name: "Poster",
		imageUrl: `${ESSENTIALS_BASE}/objects/poster.png`,
		sourceTileset: "poke-center-interior",
		col: 2,
		row: 16,
		wTiles: 1,
		hTiles: 1,
		tags: ["interact"],
		collision: true,
	},
	{
		id: "pokeball-floor",
		name: "Poké Ball floor emblem",
		imageUrl: `${ESSENTIALS_BASE}/objects/pokeball-floor.png`,
		sourceTileset: "poke-center-interior",
		col: 0,
		row: 15,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "floor"],
		collision: false,
	},
	{
		id: "statue",
		name: "Statue",
		imageUrl: `${ESSENTIALS_BASE}/objects/statue.png`,
		sourceTileset: "poke-center-interior",
		col: 3,
		row: 31,
		wTiles: 1,
		hTiles: 2,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "server-rack",
		name: "Server rack",
		imageUrl: `${ESSENTIALS_BASE}/objects/server-rack.png`,
		sourceTileset: "poke-center-interior",
		col: 6,
		row: 31,
		wTiles: 1,
		hTiles: 2,
		tags: ["tech"],
		collision: true,
	},
	{
		id: "plant-small",
		name: "Small plant",
		imageUrl: `${ESSENTIALS_BASE}/objects/plant-small.png`,
		sourceTileset: "poke-center-interior",
		col: 5,
		row: 34,
		wTiles: 1,
		hTiles: 1,
		tags: ["deco"],
		collision: true,
	},
	{
		id: "door",
		name: "Door",
		imageUrl: `${ESSENTIALS_BASE}/objects/door.png`,
		sourceTileset: "interior-general",
		col: 2,
		row: 2,
		wTiles: 1,
		hTiles: 2,
		tags: ["door"],
		collision: false,
	},
	{
		id: "bed",
		name: "Bed",
		imageUrl: `${ESSENTIALS_BASE}/objects/bed.png`,
		sourceTileset: "interior-general",
		col: 0,
		row: 14,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "chair",
		name: "Chair",
		imageUrl: `${ESSENTIALS_BASE}/objects/chair.png`,
		sourceTileset: "interior-general",
		col: 4,
		row: 10,
		wTiles: 1,
		hTiles: 1,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "tv",
		name: "TV",
		imageUrl: `${ESSENTIALS_BASE}/objects/tv.png`,
		sourceTileset: "interior-general",
		col: 6,
		row: 8,
		wTiles: 1,
		hTiles: 1,
		tags: ["interact", "furniture"],
		collision: true,
	},
	{
		id: "bookshelf-home",
		name: "Bookshelf",
		imageUrl: `${ESSENTIALS_BASE}/objects/bookshelf-home.png`,
		sourceTileset: "interior-general",
		col: 0,
		row: 10,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "table-home",
		name: "Table",
		imageUrl: `${ESSENTIALS_BASE}/objects/table-home.png`,
		sourceTileset: "interior-general",
		col: 2,
		row: 12,
		wTiles: 2,
		hTiles: 1,
		tags: ["deco", "furniture"],
		collision: true,
	},
	{
		id: "mart-counter",
		name: "Mart counter",
		imageUrl: `${ESSENTIALS_BASE}/objects/mart-counter.png`,
		sourceTileset: "mart-interior",
		col: 0,
		row: 10,
		wTiles: 4,
		hTiles: 1,
		tags: ["interact", "shop"],
		collision: true,
	},
	{
		id: "mart-shelf",
		name: "Mart shelf",
		imageUrl: `${ESSENTIALS_BASE}/objects/mart-shelf.png`,
		sourceTileset: "mart-interior",
		col: 4,
		row: 4,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "shop"],
		collision: true,
	},
	{
		id: "mart-register",
		name: "Mart register",
		imageUrl: `${ESSENTIALS_BASE}/objects/mart-register.png`,
		sourceTileset: "mart-interior",
		col: 6,
		row: 10,
		wTiles: 1,
		hTiles: 1,
		tags: ["interact", "shop"],
		collision: true,
	},
	{
		id: "gym-mat",
		name: "Gym battle mat",
		imageUrl: `${ESSENTIALS_BASE}/objects/gym-mat.png`,
		sourceTileset: "gyms-interior",
		col: 0,
		row: 15,
		wTiles: 4,
		hTiles: 3,
		tags: ["deco", "gym", "floor"],
		collision: false,
	},
	{
		id: "gym-statue",
		name: "Gym statue",
		imageUrl: `${ESSENTIALS_BASE}/objects/gym-statue.png`,
		sourceTileset: "gyms-interior",
		col: 3,
		row: 27,
		wTiles: 2,
		hTiles: 2,
		tags: ["deco", "gym"],
		collision: true,
	},
	{
		id: "gym-bar",
		name: "Gym railing",
		imageUrl: `${ESSENTIALS_BASE}/objects/gym-bar.png`,
		sourceTileset: "gyms-interior",
		col: 0,
		row: 6,
		wTiles: 2,
		hTiles: 1,
		tags: ["deco", "gym"],
		collision: true,
	},
	{
		id: "gym-counter",
		name: "Gym desk",
		imageUrl: `${ESSENTIALS_BASE}/objects/gym-counter.png`,
		sourceTileset: "gyms-interior",
		col: 0,
		row: 28,
		wTiles: 3,
		hTiles: 1,
		tags: ["interact", "gym"],
		collision: true,
	},
];

export function propsForTileset(tilesetId: string | "all"): CatalogProp[] {
	if (tilesetId === "all") return CATALOG_PROPS;
	return CATALOG_PROPS.filter((p) => p.sourceTileset === tilesetId);
}

export function tileCropRect(
	index: number,
	columns = PE_TILESET_COLUMNS,
	tileSize = PE_TILE_SIZE,
): { x: number; y: number; width: number; height: number } {
	const col = index % columns;
	const row = Math.floor(index / columns);
	return { x: col * tileSize, y: row * tileSize, width: tileSize, height: tileSize };
}

export function tileAsOrnament(
	tileset: CatalogTileset,
	index: number,
	opts?: { name?: string; collision?: boolean },
): CatalogProp {
	const col = index % tileset.columns;
	const row = Math.floor(index / tileset.columns);
	return {
		id: `tile-${tileset.id}-${index}`,
		name: opts?.name ?? `Tile ${index}`,
		imageUrl: tileset.imageUrl,
		sourceTileset: tileset.id,
		col,
		row,
		wTiles: 1,
		hTiles: 1,
		tags: ["tileset-tile", "deco"],
		collision: opts?.collision ?? true,
		tilesetFrame: true,
	};
}
