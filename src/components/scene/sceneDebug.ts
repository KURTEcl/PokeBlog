const DEBUG_STORAGE_KEY = "pokeblog-scene-debug";
const ZOOM_STORAGE_KEY = "pokeblog-scene-zoom";

export const SCENE_DEBUG_ZOOM_LEVELS = [1, 2, 3, 4, 5] as const;
export type SceneDebugZoom = (typeof SCENE_DEBUG_ZOOM_LEVELS)[number];

export function readSceneDebugEnabled(): boolean {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	if (params.has("scene-debug")) {
		return params.get("scene-debug") !== "0";
	}
	try {
		return localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export function writeSceneDebugEnabled(enabled: boolean): void {
	try {
		localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "1" : "0");
	} catch {
		/* ignore */
	}
}

export function readSceneDebugZoom(defaultZoom: SceneDebugZoom = 3): SceneDebugZoom {
	if (typeof window === "undefined") return defaultZoom;
	try {
		const raw = localStorage.getItem(ZOOM_STORAGE_KEY);
		const n = raw ? Number.parseInt(raw, 10) : defaultZoom;
		if (SCENE_DEBUG_ZOOM_LEVELS.includes(n as SceneDebugZoom)) {
			return n as SceneDebugZoom;
		}
	} catch {
		/* ignore */
	}
	return defaultZoom;
}

export function writeSceneDebugZoom(zoom: SceneDebugZoom): void {
	try {
		localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
	} catch {
		/* ignore */
	}
}
