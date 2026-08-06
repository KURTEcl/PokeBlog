export function tileToIndex(x: number, y: number, width: number): number {
	return y * width + x;
}

export function indexToTile(index: number, width: number): { x: number; y: number } {
	return { x: index % width, y: Math.floor(index / width) };
}

export function tileToWorld(
	tileX: number,
	tileY: number,
	tileSize: number,
): { x: number; y: number } {
	return {
		x: tileX * tileSize + tileSize / 2,
		y: tileY * tileSize + tileSize / 2,
	};
}

export function worldToTile(
	worldX: number,
	worldY: number,
	tileSize: number,
): { x: number; y: number } {
	return {
		x: Math.floor(worldX / tileSize),
		y: Math.floor(worldY / tileSize),
	};
}

export function inBounds(
	x: number,
	y: number,
	width: number,
	height: number,
): boolean {
	return x >= 0 && y >= 0 && x < width && y < height;
}
