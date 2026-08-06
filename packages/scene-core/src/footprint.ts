import { tileToIndex, inBounds } from "./coords.js";
import type { AssetDefinition, SceneDefinition, SceneObject } from "./types.js";

/** Footprint cells occupied by an object (origin = top-left tile). */
export function footprintCells(
	obj: Pick<SceneObject, "x" | "y">,
	footprint: { widthInTiles: number; heightInTiles: number },
): Array<{ x: number; y: number }> {
	const cells: Array<{ x: number; y: number }> = [];
	for (let dy = 0; dy < footprint.heightInTiles; dy++) {
		for (let dx = 0; dx < footprint.widthInTiles; dx++) {
			cells.push({ x: obj.x + dx, y: obj.y + dy });
		}
	}
	return cells;
}

export function applyObjectCollisions(
	collisions: number[],
	width: number,
	height: number,
	objects: SceneObject[],
	assets: AssetDefinition[],
): number[] {
	const next = [...collisions];
	for (const obj of objects) {
		if (!obj.collision) continue;
		const asset = assets.find((a) => a.id === obj.assetId);
		const fp = asset?.footprint ?? { widthInTiles: 1, heightInTiles: 1 };
		for (const cell of footprintCells(obj, fp)) {
			if (!inBounds(cell.x, cell.y, width, height)) continue;
			next[tileToIndex(cell.x, cell.y, width)] = 1;
		}
	}
	return next;
}

/** Rebuild collision layer from walls + colliding objects' footprints. */
export function rebuildCollisions(scene: SceneDefinition, wallMask?: number[]): number[] {
	const cells = scene.grid.width * scene.grid.height;
	const base = wallMask ? [...wallMask] : Array.from({ length: cells }, () => 0);
	return applyObjectCollisions(
		base,
		scene.grid.width,
		scene.grid.height,
		scene.objects,
		scene.assets,
	);
}
