import type { PluginDescriptor } from "emdash";

const VERSION = "0.1.0";

export function sceneBuilderPlugin(): PluginDescriptor {
	return {
		id: "scene-builder",
		version: VERSION,
		format: "native",
		entrypoint: "@poke-emdash/plugin-scene-builder/native",
		adminEntry: "@poke-emdash/plugin-scene-builder/admin",
		options: {},
		storage: {
			scenes: { indexes: ["slug", "status", "updatedAt"] },
		},
		adminPages: [
			{ path: "/scenes", label: "Editor de escenarios", icon: "layout" },
		],
	};
}
