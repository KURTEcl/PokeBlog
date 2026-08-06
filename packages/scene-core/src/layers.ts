export const SCENE_LAYERS = [
	"ground",
	"floor-deco",
	"objects",
	"actors",
	"overhead",
	"ui",
] as const;

export type SceneLayerName = (typeof SCENE_LAYERS)[number];

export function layerZIndex(name: string): number {
	const idx = SCENE_LAYERS.indexOf(name as SceneLayerName);
	return idx === -1 ? 0 : idx * 10;
}
