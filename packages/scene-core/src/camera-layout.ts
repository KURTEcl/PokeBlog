import type { SceneDefinition } from "./types.js";

export type CameraLayout = {
	viewportW: number;
	viewportH: number;
	scale: number;
	followPlayer: boolean;
	/** Mobile: keep the player centered in the viewport. */
	followMode: "none" | "center";
	mapW: number;
	mapH: number;
};

export type CameraLayoutOptions = {
	/** Test multiplier applied to the computed integer CSS scale (×1–×5). */
	scaleMultiplier?: number;
};

const MIN_VIEWPORT_TILES = 8;

function isTouchLayout(containerW: number): boolean {
	if (containerW > 0 && containerW <= 720) return true;
	if (typeof globalThis.matchMedia !== "function") return false;
	return (
		globalThis.matchMedia("(pointer: coarse)").matches ||
		globalThis.matchMedia("(max-width: 720px)").matches
	);
}

/**
 * Resolve Phaser viewport size and CSS integer scale for fullscreen display.
 */
export function resolveCameraLayout(
	scene: SceneDefinition,
	containerW: number,
	containerH: number,
	options: CameraLayoutOptions = {},
): CameraLayout {
	const scaleBoost = Math.max(1, Math.min(5, options.scaleMultiplier ?? 1));
	const tileSize = scene.grid.tileSize;
	const mapW = scene.grid.width * tileSize;
	const mapH = scene.grid.height * tileSize;
	const mode = scene.presentation.camera?.mode ?? "fit-room";
	const vp = Math.max(containerW, 1);
	const vh = Math.max(containerH, 1);

	if (isTouchLayout(vp)) {
		const minViewport = MIN_VIEWPORT_TILES * tileSize;
		let scale = scaleBoost;
		while (scale >= 1) {
			const minW = Math.min(minViewport, Math.floor(vp / scale));
			const minH = Math.min(minViewport, Math.floor(vh / scale));
			const viewportH = Math.min(mapH, Math.max(minH, Math.floor(vh / scale)));
			const viewportW = Math.min(mapW, Math.max(minW, Math.floor(vp / scale)));
			if (viewportH * scale <= vh && viewportW * scale <= vp) {
				return {
					viewportW,
					viewportH,
					scale,
					followPlayer: true,
					followMode: "center",
					mapW,
					mapH,
				};
			}
			scale--;
		}

		return {
			viewportW: Math.min(mapW, vp),
			viewportH: Math.min(mapH, vh),
			scale: 1,
			followPlayer: true,
			followMode: "center",
			mapW,
			mapH,
		};
	}

	const explicit = scene.presentation.camera?.viewportTiles;
	if (mode === "fit-room" && !explicit) {
		const baseScale = Math.max(1, Math.floor(Math.min(vp / mapW, vh / mapH)));
		const scale = Math.min(scaleBoost, baseScale);
		return {
			viewportW: mapW,
			viewportH: mapH,
			scale,
			followPlayer: false,
			followMode: "none",
			mapW,
			mapH,
		};
	}

	let viewportTilesW: number;
	let viewportTilesH: number;

	if (explicit) {
		viewportTilesW = Math.min(scene.grid.width, explicit.width);
		viewportTilesH = Math.min(scene.grid.height, explicit.height);
	} else {
		let bestScale = 1;
		viewportTilesW = Math.min(scene.grid.width, 15);
		viewportTilesH = Math.min(scene.grid.height, 10);
		for (let scale = 1; scale <= 8; scale++) {
			const maxW = Math.floor(vp / (tileSize * scale));
			const maxH = Math.floor(vh / (tileSize * scale));
			if (maxW >= MIN_VIEWPORT_TILES && maxH >= MIN_VIEWPORT_TILES) {
				bestScale = scale;
				viewportTilesW = Math.min(scene.grid.width, maxW);
				viewportTilesH = Math.min(scene.grid.height, maxH);
			}
		}
		void bestScale;
	}

	viewportTilesW = Math.max(MIN_VIEWPORT_TILES, Math.min(scene.grid.width, viewportTilesW));
	viewportTilesH = Math.max(MIN_VIEWPORT_TILES, Math.min(scene.grid.height, viewportTilesH));

	const viewportW = viewportTilesW * tileSize;
	const viewportH = viewportTilesH * tileSize;
	const baseScale = Math.max(1, Math.floor(Math.min(vp / viewportW, vh / viewportH)));
	const scale = baseScale * scaleBoost;
	const followPlayer = mode === "follow-player" || mapW > viewportW || mapH > viewportH;

	return {
		viewportW,
		viewportH,
		scale,
		followPlayer,
		followMode: followPlayer ? "center" : "none",
		mapW,
		mapH,
	};
}
