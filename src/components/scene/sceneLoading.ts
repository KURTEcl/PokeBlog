export type SceneLoadingConfig = {
	/** Optional logo shown above the status text (path under /public). */
	logoUrl?: string;
	logoAlt?: string;
	messages: string[];
	messageIntervalMs?: number;
};

export const DEFAULT_SCENE_LOADING: SceneLoadingConfig = {
	messages: [
		"Organizando carpeta",
		"Buscando challa",
		"Cambiando los sleeves",
		"Limpiando el playmat",
	],
	messageIntervalMs: 900,
};
