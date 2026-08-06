/**
 * Tile indices for Pokémon Essentials RPG Maker tilesets (8 columns, 32px tiles).
 * Poké Center interior sheet.
 */
export const PE_TILESET_COLUMNS = 8;
export const PE_TILE_SIZE = 32;

/** Light patterned floor (row 9). */
export const PE_FLOOR = 72;
/** Tan wall block (row 12). */
export const PE_WALL = 98;
/** Wall / trim accent (row 11). */
export const PE_WALL_TRIM = 88;

export function peTileIndex(row: number, col: number): number {
	return row * PE_TILESET_COLUMNS + col;
}
