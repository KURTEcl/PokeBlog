import type { SceneDefinition } from "./types.js";
import { tileToIndex } from "./coords.js";

export const GRID_MIN = 8;
export const GRID_MAX = 64;

export type ResizeSceneGridResult = {
	scene: SceneDefinition;
	trimmed: {
		objects: number;
		interactions: number;
		spawnPoints: number;
	};
};

function resizeTileArray(
	tiles: number[],
	oldW: number,
	oldH: number,
	newW: number,
	newH: number,
	fill: number,
): number[] {
	const out = Array.from({ length: newW * newH }, () => fill);
	const copyW = Math.min(oldW, newW);
	const copyH = Math.min(oldH, newH);
	for (let y = 0; y < copyH; y++) {
		for (let x = 0; x < copyW; x++) {
			out[y * newW + x] = tiles[tileToIndex(x, y, oldW)] ?? fill;
		}
	}
	return out;
}

/**
 * Resize scene grid; trims entities outside the new bounds.
 */
export function resizeSceneGrid(
	scene: SceneDefinition,
	newW: number,
	newH: number,
): ResizeSceneGridResult {
	const oldW = scene.grid.width;
	const oldH = scene.grid.height;
	if (newW === oldW && newH === oldH) {
		return { scene, trimmed: { objects: 0, interactions: 0, spawnPoints: 0 } };
	}
	if (newW < GRID_MIN || newH < GRID_MIN || newW > GRID_MAX || newH > GRID_MAX) {
		throw new Error(`Grid must be ${GRID_MIN}–${GRID_MAX} tiles per axis`);
	}

	const objects = scene.objects.filter((o) => o.x < newW && o.y < newH);
	const interactions = scene.interactions.filter(
		(i) =>
			i.trigger.x < newW &&
			i.trigger.y < newH &&
			i.trigger.x + i.trigger.width <= newW &&
			i.trigger.y + i.trigger.height <= newH,
	);
	const spawnPoints = scene.spawnPoints.filter((s) => s.x < newW && s.y < newH);
	const defaultSpawnId = spawnPoints.some((s) => s.id === scene.defaultSpawnId)
		? scene.defaultSpawnId
		: (spawnPoints[0]?.id ?? "spawn-main");

	const tileLayers = scene.tileLayers.map((layer) => ({
		...layer,
		tiles: resizeTileArray(layer.tiles, oldW, oldH, newW, newH, -1),
	}));

	const collisions = resizeTileArray(scene.collisions, oldW, oldH, newW, newH, 0);

	return {
		scene: {
			...scene,
			grid: { ...scene.grid, width: newW, height: newH },
			tileLayers,
			collisions,
			objects,
			interactions,
			spawnPoints:
				spawnPoints.length > 0
					? spawnPoints
					: [{ id: "spawn-main", name: "Start", x: Math.floor(newW / 2), y: newH - 2, facing: "up" }],
			defaultSpawnId,
		},
		trimmed: {
			objects: scene.objects.length - objects.length,
			interactions: scene.interactions.length - interactions.length,
			spawnPoints: scene.spawnPoints.length - spawnPoints.length,
		},
	};
}
