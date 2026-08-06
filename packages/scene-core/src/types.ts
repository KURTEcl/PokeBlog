export type ContentTarget =
	| { type: "internal-route"; path: string }
	| { type: "collection"; collectionId: string; filters?: Record<string, unknown> }
	| { type: "content-entry"; collectionId: string; entryId: string; slug?: string }
	| { type: "external-url"; url: string }
	| { type: "scene"; sceneId: string; spawnId?: string };

export type AssetDistributionPolicy =
	| "public-repository-allowed"
	| "private-repository-only"
	| "local-install-required"
	| "unclear-do-not-use";

export type AssetLicense = {
	name: string;
	version?: string;
	author?: string;
	sourceName?: string;
	sourceUrl?: string;
	attributionRequired: boolean;
	attributionText?: string;
	commercialUseAllowed?: boolean;
	modificationsAllowed?: boolean;
	shareAlike?: boolean;
	distributionPolicy: AssetDistributionPolicy;
};

export type AssetDefinition = {
	id: string;
	name: string;
	imageUrl: string;
	sourceType: "single-sprite" | "tileset-frame" | "sprite-sheet";
	tags: string[];
	license: AssetLicense;
	frame?: { x: number; y: number; width: number; height: number };
	footprint: { widthInTiles: number; heightInTiles: number };
	anchor: { x: number; y: number };
	defaults: { layer: string; collision: boolean; zIndex: number };
};

export type TilesetReference = {
	id: string;
	name: string;
	imageUrl: string;
	tileSize: number;
	columns: number;
	tileCount: number;
	license: AssetLicense;
};

export type TileLayer = {
	id: string;
	name: string;
	zIndex: number;
	/** Row-major tile indices; -1 = empty. Length = grid.width * grid.height */
	tiles: number[];
	tilesetId: string;
};

export type SceneObject = {
	id: string;
	name: string;
	assetId: string;
	x: number;
	y: number;
	layer: string;
	zIndex: number;
	collision: boolean;
	interactionId?: string;
};

export type SceneInteraction = {
	id: string;
	name: string;
	trigger: {
		type: "action" | "arrival" | "click";
		x: number;
		y: number;
		width: number;
		height: number;
		facingRequired?: "up" | "down" | "left" | "right";
	};
	target: ContentTarget;
	panel?: {
		title?: string;
		presentation: "side-panel" | "bottom-sheet" | "fullscreen";
	};
};

export type SpawnPoint = {
	id: string;
	name: string;
	x: number;
	y: number;
	facing: "up" | "down" | "left" | "right";
};

export type SceneDefinition = {
	id: string;
	slug: string;
	name: string;
	status: "draft" | "published";
	version: number;
	grid: { tileSize: number; width: number; height: number };
	presentation: {
		backgroundColor: string;
		/** Full-map backdrop (e.g. assembled room PNG). Drawn under tile layers. */
		backgroundImageUrl?: string;
		letterboxStyle?: string;
		musicUrl?: string;
		camera?: {
			mode: "fit-room" | "follow-player";
			viewportTiles?: { width: number; height: number };
		};
	};
	tilesets: TilesetReference[];
	assets: AssetDefinition[];
	tileLayers: TileLayer[];
	objects: SceneObject[];
	/** 1 = blocked, 0 = walkable. Length = grid.width * grid.height */
	collisions: number[];
	interactions: SceneInteraction[];
	spawnPoints: SpawnPoint[];
	defaultSpawnId: string;
	player: {
		spriteAssetId: string;
		movementSpeed: number;
		facing?: "up" | "down" | "left" | "right";
		charset?: { frameWidth: number; frameHeight: number; columns: number; rows: number };
	};
	createdAt: string;
	updatedAt: string;
};

export type SceneRecord = {
	slug: string;
	name: string;
	status: "draft" | "published";
	updatedAt: string;
	version: number;
	isHome?: boolean;
	draftData: SceneDefinition;
	publishedData: SceneDefinition | null;
};

export type SceneRendererAdapter = {
	mount(container: HTMLElement, scene: SceneDefinition): Promise<void>;
	updateScene(scene: SceneDefinition): void;
	movePlayerTo(tileX: number, tileY: number): void;
	pause(): void;
	resume(): void;
	destroy(): void;
};

export type PanelContent = {
	title: string;
	canonicalUrl: string;
	kind: "route-list" | "html" | "link";
	items?: Array<{ title: string; href: string; summary?: string }>;
	html?: string;
	externalUrl?: string;
};

export type ContentPanelAdapter = {
	canHandle(target: ContentTarget): boolean;
	load(target: ContentTarget): Promise<PanelContent>;
	getCanonicalUrl(target: ContentTarget): string;
};
