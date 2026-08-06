import Phaser from "phaser";
/**
 * Phaser 4 runtime: spritesheet frames (not setCrop on full sheets),
 * integer CSS letterbox scale, charset walk animation, Y-sort.
 */
import {
	findPath,
	findNearestWalkable,
	tileToIndex,
	tileToWorld,
	worldToTile,
	charsetFrame,
	facingFromDelta,
	DEFAULT_CHARSET,
	resolveCameraLayout,
	type CameraLayout,
	type Facing,
	type ContentTarget,
	type SceneDefinition,
	type SceneRendererAdapter,
} from "@poke-emdash/scene-core";
import { SCENE_GAME_SFX, SCENE_SFX, sceneSfxUrl, type SceneGameSfxId } from "./sceneAudio";

export type SceneRuntimeEvents = {
	onInteract: (target: ContentTarget, title?: string) => void;
	/** Fired when the player tries to move or tap the map while the side panel (menu) is open. */
	onDismissMenu?: () => void;
	onReady?: () => void;
};

const PLAYER_DEPTH_BASE = 30;
const STEP_MS = 280;
const SFX_VOLUME = 0.55;

const SCENE_SFX_URLS = Object.fromEntries(
	Object.values(SCENE_GAME_SFX).map((id) => [id, sceneSfxUrl(id)]),
) as Record<SceneGameSfxId, string>;

function charsetFrameIndex(facing: Facing, walkFrame: number, columns = 4): number {
	const row = { down: 0, left: 1, right: 2, up: 3 }[facing];
	const col = Math.max(0, Math.min(columns - 1, walkFrame));
	return row * columns + col;
}

class HubScene extends Phaser.Scene {
	sceneData!: SceneDefinition;
	eventsBridge!: SceneRuntimeEvents;
	cameraLayout!: CameraLayout;
	player!: Phaser.GameObjects.Image;
	cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	wasd!: {
		up: Phaser.Input.Keyboard.Key;
		down: Phaser.Input.Keyboard.Key;
		left: Phaser.Input.Keyboard.Key;
		right: Phaser.Input.Keyboard.Key;
	};
	path: Array<{ x: number; y: number }> = [];
	tileX = 0;
	tileY = 0;
	facing: Facing = "down";
	walkFrame = 0;
	stepProgress = 0;
	stepFrom = { x: 0, y: 0 };
	stepTo = { x: 0, y: 0 };
	moving = false;
	pausedPlay = false;
	pad: { x: number; y: number } = { x: 0, y: 0 };
	animTimer = 0;
	playerTextureKey = "";
	audioUnlocked = false;
	bumpLatch = { dx: 0, dy: 0 };
	sfx: Partial<Record<SceneGameSfxId, Phaser.Sound.BaseSound>> = {};
	pendingClickFacing: Facing | null = null;
	tapState = { key: "", time: 0 };

	playSfx(id: SceneGameSfxId) {
		const sfx = this.sfx[id];
		if (!sfx) return;
		const play = () => {
			if (sfx.isPlaying) sfx.stop();
			sfx.play();
		};
		if (this.sound.locked) {
			this.sound.once("unlocked", play);
			return;
		}
		play();
	}

	unlockAudio() {
		if (this.audioUnlocked) return;
		this.audioUnlocked = true;
		if (this.sound.locked) this.sound.unlock();
	}

	playBump(dx: number, dy: number) {
		if (this.bumpLatch.dx === dx && this.bumpLatch.dy === dy) return;
		this.bumpLatch = { dx, dy };
		this.playSfx(SCENE_GAME_SFX.bump);
	}

	clearBumpLatch() {
		this.bumpLatch = { dx: 0, dy: 0 };
	}

	playerWorld(tileX: number, tileY: number): { x: number; y: number } {
		const world = tileToWorld(tileX, tileY, this.sceneData.grid.tileSize);
		return { x: world.x, y: world.y + this.sceneData.grid.tileSize / 2 };
	}

	objectDepth(obj: { y: number; assetId: string; zIndex: number }): number {
		const asset = this.sceneData.assets.find((a) => a.id === obj.assetId);
		const fh = asset?.footprint.heightInTiles ?? 1;
		return obj.zIndex + obj.y + fh - 1;
	}

	playerDepth(): number {
		return PLAYER_DEPTH_BASE + this.tileY;
	}

	constructor() {
		super("hub");
	}

	init(data: {
		scene: SceneDefinition;
		events: SceneRuntimeEvents;
		cameraLayout: CameraLayout;
	}) {
		this.sceneData = data.scene;
		this.eventsBridge = data.events;
		this.cameraLayout = data.cameraLayout;
	}

	preload() {
		const { grid, tilesets, assets, player, presentation } = this.sceneData;
		if (presentation.backgroundImageUrl) {
			this.load.image("scene-bg", presentation.backgroundImageUrl);
		}
		for (const ts of tilesets) {
			this.load.spritesheet(ts.id, ts.imageUrl, {
				frameWidth: ts.tileSize,
				frameHeight: ts.tileSize,
			});
		}
		for (const asset of assets) {
			if (asset.sourceType === "sprite-sheet" && asset.tags.includes("player")) {
				const layout = player.charset ?? DEFAULT_CHARSET;
				this.load.spritesheet(asset.id, asset.imageUrl, {
					frameWidth: layout.frameWidth,
					frameHeight: layout.frameHeight,
				});
			} else if (asset.sourceType === "tileset-frame") {
				// Drawn from tileset spritesheet via frame index in frame.x/tileSize
				continue;
			} else {
				this.load.image(asset.id, asset.imageUrl);
			}
		}
		for (const [id, url] of Object.entries(SCENE_SFX_URLS)) {
			this.load.audio(id, url);
		}
		void grid;
	}

	create() {
		const { grid, presentation } = this.sceneData;
		this.cameras.main.setBackgroundColor("#000000");
		this.cameras.main.setBounds(0, 0, grid.width * grid.tileSize, grid.height * grid.tileSize);
		this.cameras.main.setZoom(1);
		this.cameras.main.roundPixels = true;
		this.cameras.main.setSize(this.cameraLayout.viewportW, this.cameraLayout.viewportH);

		if (presentation.backgroundImageUrl && this.textures.exists("scene-bg")) {
			const bg = this.add.image(0, 0, "scene-bg");
			bg.setOrigin(0, 0);
			bg.setDisplaySize(grid.width * grid.tileSize, grid.height * grid.tileSize);
			bg.setDepth(-10);
		}

		for (const layer of [...this.sceneData.tileLayers].sort((a, b) => a.zIndex - b.zIndex)) {
			const tileset = this.sceneData.tilesets.find((t) => t.id === layer.tilesetId);
			if (!tileset) continue;
			for (let i = 0; i < layer.tiles.length; i++) {
				const tileIndex = layer.tiles[i]!;
				if (tileIndex < 0) continue;
				const x = i % grid.width;
				const y = Math.floor(i / grid.width);
				const img = this.add.image(
					x * grid.tileSize + grid.tileSize / 2,
					y * grid.tileSize + grid.tileSize / 2,
					tileset.id,
					tileIndex,
				);
				img.setDisplaySize(grid.tileSize, grid.tileSize);
				img.setDepth(layer.zIndex);
			}
		}

		for (const obj of [...this.sceneData.objects].sort(
			(a, b) => this.objectDepth(a) - this.objectDepth(b),
		)) {
			const asset = this.sceneData.assets.find((a) => a.id === obj.assetId);
			if (!asset) continue;
			const fw = asset.footprint.widthInTiles;
			const fh = asset.footprint.heightInTiles;
			const cx = obj.x * grid.tileSize + (fw * grid.tileSize) / 2;
			const cy = obj.y * grid.tileSize + fh * grid.tileSize;

			let img: Phaser.GameObjects.Image;
			if (asset.sourceType === "tileset-frame" && asset.frame) {
				const tileset =
					this.sceneData.tilesets.find((t) => t.imageUrl === asset.imageUrl) ??
					this.sceneData.tilesets[0];
				if (!tileset) continue;
				const frameIndex =
					Math.floor(asset.frame.y / tileset.tileSize) * tileset.columns +
					Math.floor(asset.frame.x / tileset.tileSize);
				img = this.add.image(cx, cy, tileset.id, frameIndex);
				img.setDisplaySize(grid.tileSize * fw, grid.tileSize * fh);
			} else {
				img = this.add.image(cx, cy, asset.id);
				img.setDisplaySize(grid.tileSize * fw, grid.tileSize * fh);
			}
			img.setOrigin(asset.anchor.x, asset.anchor.y);
			img.setDepth(this.objectDepth(obj));
		}

		const spawn =
			this.sceneData.spawnPoints.find((s) => s.id === this.sceneData.defaultSpawnId) ??
			this.sceneData.spawnPoints[0]!;
		this.tileX = spawn.x;
		this.tileY = spawn.y;
		this.facing = spawn.facing as Facing;

		const playerAsset = this.sceneData.assets.find(
			(a) => a.id === this.sceneData.player.spriteAssetId,
		);
		this.playerTextureKey = playerAsset?.id ?? "";
		const world = this.playerWorld(this.tileX, this.tileY);
		const layout = this.sceneData.player.charset ?? DEFAULT_CHARSET;
		this.player = this.add.image(
			world.x,
			world.y,
			this.playerTextureKey,
			charsetFrameIndex(this.facing, 0, layout.columns),
		);
		this.player.setOrigin(playerAsset?.anchor.x ?? 0.5, playerAsset?.anchor.y ?? 1);
		this.player.setDisplaySize(layout.frameWidth, layout.frameHeight);
		this.player.setDepth(this.playerDepth());

		if (this.cameraLayout.followMode === "center" && this.player) {
			this.updateCenteredCamera();
		} else if (this.cameraLayout.followPlayer && this.player) {
			this.cameras.main.startFollow(this.player, true, 1, 1);
		} else {
			this.cameras.main.stopFollow();
			const { grid } = this.sceneData;
			this.cameras.main.centerOn(
				(grid.width * grid.tileSize) / 2,
				(grid.height * grid.tileSize) / 2,
			);
		}

		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.wasd = this.input.keyboard.addKeys({
				up: Phaser.Input.Keyboard.KeyCodes.W,
				down: Phaser.Input.Keyboard.KeyCodes.S,
				left: Phaser.Input.Keyboard.KeyCodes.A,
				right: Phaser.Input.Keyboard.KeyCodes.D,
			}) as typeof this.wasd;
			this.input.keyboard.on("keydown", () => this.unlockAudio());
			this.input.keyboard.on("keydown-SPACE", () => this.tryAction());
			this.input.keyboard.on("keydown-ENTER", () => this.tryAction());
		}

		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			this.unlockAudio();
			if (this.pausedPlay) {
				this.eventsBridge.onDismissMenu?.();
				return;
			}
			const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
			const tile = worldToTile(worldPoint.x, worldPoint.y, grid.tileSize);
			const hitObj = this.findObjectAt(tile.x, tile.y);
			const interactionId = hitObj?.interactionId ?? this.findInteractionAt(tile.x, tile.y);
			const tapKey = interactionId ?? `map:${tile.x},${tile.y}`;
			const now = Date.now();
			const isDouble = tapKey === this.tapState.key && now - this.tapState.time < 450;
			this.tapState = { key: tapKey, time: now };

			if (isDouble && interactionId) {
				this.showClickMarker(worldPoint.x, worldPoint.y);
				this.triggerInteraction(interactionId);
				return;
			}

			this.showClickMarker(worldPoint.x, worldPoint.y);
			this.moveToTile(tile.x, tile.y);
		});

		for (const id of Object.values(SCENE_GAME_SFX)) {
			if (this.cache.audio.exists(id)) {
				this.sfx[id] = this.sound.add(id, { volume: SFX_VOLUME });
			}
		}

		this.eventsBridge.onReady?.();
	}

	updatePlayerSprite() {
		const layout = this.sceneData.player.charset ?? DEFAULT_CHARSET;
		const frame = this.moving && this.walkFrame > 0 ? this.walkFrame : 0;
		this.player.setFrame(charsetFrameIndex(this.facing, frame, layout.columns));
		void charsetFrame;
	}

	setPad(x: number, y: number) {
		this.pad = { x, y };
	}

	/** Run one movement step from the virtual pad (called from HTML controls). */
	tickPadInput() {
		if (this.pausedPlay || !this.player || this.moving || this.path.length > 0) return;
		const { dx, dy } = this.getMovementIntent();
		if (dx !== 0 || dy !== 0) this.tryStep(dx, dy);
	}

	showClickMarker(worldX: number, worldY: number) {
		const ring = this.add.circle(worldX, worldY, 3, 0xffffff, 0.9);
		ring.setStrokeStyle(1, 0x6aa3ff, 1);
		ring.setDepth(1000);
		this.tweens.add({
			targets: ring,
			scaleX: 3,
			scaleY: 3,
			alpha: 0,
			duration: 350,
			ease: "Cubic.easeOut",
			onComplete: () => ring.destroy(),
		});
	}

	applyCameraLayout(layout: CameraLayout) {
		this.cameraLayout = layout;
		this.cameras.main.setBackgroundColor("#000000");
		this.cameras.main.setSize(layout.viewportW, layout.viewportH);
		this.cameras.main.stopFollow();
		if (layout.followMode === "center" && this.player) {
			this.updateCenteredCamera();
		} else if (layout.followPlayer && this.player) {
			this.cameras.main.startFollow(this.player, true, 1, 1);
		} else {
			const { grid } = this.sceneData;
			this.cameras.main.centerOn(
				(grid.width * grid.tileSize) / 2,
				(grid.height * grid.tileSize) / 2,
			);
		}
	}

	updateCenteredCamera() {
		const cam = this.cameras.main;
		const maxScrollX = Math.max(0, this.cameraLayout.mapW - cam.width);
		const maxScrollY = Math.max(0, this.cameraLayout.mapH - cam.height);
		const scrollX = Phaser.Math.Clamp(this.player.x - cam.width / 2, 0, maxScrollX);
		const scrollY = Phaser.Math.Clamp(this.player.y - cam.height / 2, 0, maxScrollY);
		cam.setScroll(scrollX, scrollY);
	}

	moveToTile(x: number, y: number) {
		if (this.moving) return;
		const { width, height } = this.sceneData.grid;
		const clickFacing = facingFromDelta(x - this.tileX, y - this.tileY);
		if (clickFacing) this.pendingClickFacing = clickFacing;
		const goal = findNearestWalkable(this.sceneData.collisions, width, height, { x, y });
		if (!goal) return;
		const path = findPath(
			this.sceneData.collisions,
			width,
			height,
			{ x: this.tileX, y: this.tileY },
			goal,
		);
		if (!path || path.length < 2) {
			if (clickFacing) {
				this.facing = clickFacing;
				this.pendingClickFacing = null;
				this.walkFrame = 0;
				this.updatePlayerSprite();
			}
			return;
		}
		this.path = path.slice(1);
		this.beginStep();
	}

	findObjectAt(tileX: number, tileY: number) {
		for (const obj of this.sceneData.objects) {
			const asset = this.sceneData.assets.find((a) => a.id === obj.assetId);
			const fw = asset?.footprint.widthInTiles ?? 1;
			const fh = asset?.footprint.heightInTiles ?? 1;
			if (
				tileX >= obj.x &&
				tileX < obj.x + fw &&
				tileY >= obj.y &&
				tileY < obj.y + fh
			) {
				return obj;
			}
		}
		return null;
	}

	findInteractionAt(tileX: number, tileY: number): string | null {
		for (const interaction of this.sceneData.interactions) {
			const t = interaction.trigger;
			if (
				tileX >= t.x &&
				tileX < t.x + t.width &&
				tileY >= t.y &&
				tileY < t.y + t.height
			) {
				return interaction.id;
			}
		}
		return null;
	}

	tryStep(dx: number, dy: number) {
		if (this.moving) return;
		const nx = this.tileX + dx;
		const ny = this.tileY + dy;
		const { width, height } = this.sceneData.grid;
		const blocked =
			nx < 0 ||
			ny < 0 ||
			nx >= width ||
			ny >= height ||
			this.sceneData.collisions[tileToIndex(nx, ny, width)] === 1;

		if (blocked) {
			this.playBump(dx, dy);
			const newFacing = facingFromDelta(dx, dy);
			if (newFacing && newFacing !== this.facing) {
				this.facing = newFacing;
				this.walkFrame = 0;
				this.updatePlayerSprite();
			}
			return;
		}

		const newFacing = facingFromDelta(dx, dy);
		if (newFacing && newFacing !== this.facing) {
			this.facing = newFacing;
			this.walkFrame = 0;
			this.updatePlayerSprite();
		}
		this.clearBumpLatch();
		this.path = [{ x: nx, y: ny }];
		this.beginStep();
	}

	beginStep() {
		if (this.path.length === 0) return;
		const next = this.path[0]!;
		const dx = next.x - this.tileX;
		const dy = next.y - this.tileY;
		const newFacing = facingFromDelta(dx, dy);
		if (newFacing) this.facing = newFacing;
		this.stepFrom = this.playerWorld(this.tileX, this.tileY);
		this.stepTo = this.playerWorld(next.x, next.y);
		this.stepProgress = 0;
		this.walkFrame = 1;
		this.moving = true;
		this.updatePlayerSprite();
	}

	completeStep() {
		const next = this.path.shift()!;
		this.tileX = next.x;
		this.tileY = next.y;
		this.player.setPosition(this.stepTo.x, this.stepTo.y);
		this.player.setDepth(this.playerDepth());
		this.walkFrame = 0;
		this.moving = false;
		this.updatePlayerSprite();

		const arrival = this.sceneData.interactions.find(
			(i) =>
				i.trigger.type === "arrival" &&
				this.tileX >= i.trigger.x &&
				this.tileX < i.trigger.x + i.trigger.width &&
				this.tileY >= i.trigger.y &&
				this.tileY < i.trigger.y + i.trigger.height,
		);
		if (arrival) this.triggerInteraction(arrival.id);

		if (this.path.length > 0) {
			this.beginStep();
			return;
		}

		if (this.pendingClickFacing) {
			this.facing = this.pendingClickFacing;
			this.pendingClickFacing = null;
			this.walkFrame = 0;
			this.updatePlayerSprite();
		}

		const { dx, dy } = this.getMovementIntent();
		if (dx !== 0 || dy !== 0) this.tryStep(dx, dy);
	}

	facingMatches(required: Facing): boolean {
		return this.facing === required;
	}

	tryAction() {
		if (this.pausedPlay || this.moving) return;
		const nearby = this.sceneData.interactions.find((i) => {
			const { x, y, width, height, facingRequired } = i.trigger;
			const inRange =
				this.tileX >= x - 1 &&
				this.tileX <= x + width &&
				this.tileY >= y - 1 &&
				this.tileY <= y + height;
			if (!inRange) return false;
			if (facingRequired && !this.facingMatches(facingRequired)) return false;
			return true;
		});
		if (nearby) this.triggerInteraction(nearby.id);
	}

	triggerInteraction(id: string) {
		if (this.pausedPlay) return;
		const interaction = this.sceneData.interactions.find((i) => i.id === id);
		if (!interaction) return;
		if (interaction.trigger.type === "arrival") {
			this.playSfx(SCENE_GAME_SFX.doorEnter);
		}
		this.eventsBridge.onInteract(
			interaction.target,
			interaction.panel?.title ?? interaction.name,
		);
	}

	pausePlay() {
		this.pausedPlay = true;
		this.path = [];
		this.moving = false;
		this.walkFrame = 0;
		this.menuDismissLatch = false;
		this.updatePlayerSprite();
	}

	resumePlay() {
		this.pausedPlay = false;
		this.menuDismissLatch = false;
	}

	private menuDismissLatch = false;

	private getMovementIntent(): { dx: number; dy: number } {
		let dx = this.pad.x;
		let dy = this.pad.y;
		if (this.cursors?.left.isDown || this.wasd?.left.isDown) dx = -1;
		else if (this.cursors?.right.isDown || this.wasd?.right.isDown) dx = 1;
		if (this.cursors?.up.isDown || this.wasd?.up.isDown) dy = -1;
		else if (this.cursors?.down.isDown || this.wasd?.down.isDown) dy = 1;
		if (dx !== 0 && dy !== 0) dy = 0;
		return { dx, dy };
	}

	/** True when keyboard or on-screen pad requests a step while movement is paused. */
	private hasMovementIntent(): boolean {
		const { dx, dy } = this.getMovementIntent();
		return dx !== 0 || dy !== 0;
	}

	update(_time: number, delta: number) {
		if (!this.player) return;

		if (this.cameraLayout.followMode === "center") {
			this.updateCenteredCamera();
		}

		if (this.pausedPlay) {
			if (this.hasMovementIntent()) {
				if (!this.menuDismissLatch) {
					this.menuDismissLatch = true;
					this.eventsBridge.onDismissMenu?.();
				}
			} else {
				this.menuDismissLatch = false;
			}
			return;
		}

		if (!this.moving && this.path.length === 0) {
			const { dx, dy } = this.getMovementIntent();
			if (dx === 0 && dy === 0) this.clearBumpLatch();
			else this.tryStep(dx, dy);
		}

		if (this.moving) {
			const stepDuration = STEP_MS / Math.max(1, this.sceneData.player.movementSpeed / 2);
			this.stepProgress += delta;
			const t = Math.min(1, this.stepProgress / stepDuration);
			this.player.setPosition(
				Phaser.Math.Linear(this.stepFrom.x, this.stepTo.x, t),
				Phaser.Math.Linear(this.stepFrom.y, this.stepTo.y, t),
			);

			this.animTimer += delta;
			if (this.animTimer > stepDuration / 3) {
				this.animTimer = 0;
				this.walkFrame = this.walkFrame === 1 ? 2 : 1;
				this.updatePlayerSprite();
			}

			if (t >= 1) this.completeStep();
		}
	}
}

function applyFullscreenScale(
	game: Phaser.Game,
	container: HTMLElement,
	viewportW: number,
	viewportH: number,
	scale: number,
) {
	const canvas = game.canvas;
	canvas.style.width = `${viewportW * scale}px`;
	canvas.style.height = `${viewportH * scale}px`;
	canvas.style.imageRendering = "pixelated";
	canvas.style.display = "block";
	canvas.style.margin = "0 auto";
	container.style.display = "flex";
	container.style.alignItems = "flex-start";
	container.style.justifyContent = "center";
	container.style.background = "#000000";
	return scale;
}

export function createPhaserAdapter(events: SceneRuntimeEvents): SceneRendererAdapter & {
	setPad: (x: number, y: number) => void;
	tryAction: () => void;
	unlockAudio: () => void;
	tickPad: () => void;
	setScaleMultiplier: (multiplier: number) => void;
} {
	let game: Phaser.Game | null = null;
	let hub: HubScene | null = null;
	let host: HTMLElement | null = null;
	let sceneDef: SceneDefinition | null = null;
	let cameraLayout: CameraLayout | null = null;
	let onResize: (() => void) | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let scaleMultiplier = 1;

	const getHub = (): HubScene | null => {
		if (hub) return hub;
		if (!game) return null;
		const scene = game.scene.getScene("hub");
		if (scene instanceof HubScene) {
			hub = scene;
		}
		return hub;
	};

	const relayout = () => {
		if (!game || !host || !sceneDef) return;
		cameraLayout = resolveCameraLayout(
			sceneDef,
			host.clientWidth || window.innerWidth,
			host.clientHeight || window.innerHeight,
			{ scaleMultiplier },
		);
		game.scale.resize(cameraLayout.viewportW, cameraLayout.viewportH);
		getHub()?.applyCameraLayout(cameraLayout);
		applyFullscreenScale(
			game,
			host,
			cameraLayout.viewportW,
			cameraLayout.viewportH,
			cameraLayout.scale,
		);
	};

	return {
		async mount(container, scene) {
			host = container;
			sceneDef = scene;
			cameraLayout = resolveCameraLayout(
				scene,
				container.clientWidth || window.innerWidth,
				container.clientHeight || window.innerHeight,
				{ scaleMultiplier },
			);

			await new Promise<void>((resolve, reject) => {
				try {
					game = new Phaser.Game({
						type: Phaser.AUTO,
						parent: container,
						width: cameraLayout!.viewportW,
						height: cameraLayout!.viewportH,
						backgroundColor: scene.presentation.backgroundColor,
						scale: {
							mode: Phaser.Scale.NONE,
						},
						render: {
							pixelArt: true,
							antialias: false,
							antialiasGL: false,
							roundPixels: true,
						},
						banner: false,
					});
					game.scene.add(
						"hub",
						HubScene,
						true,
						{
							scene,
							cameraLayout: cameraLayout!,
							events: {
								...events,
								onReady: () => {
									hub = game!.scene.getScene("hub") as HubScene;
									if (game && host && cameraLayout) {
										applyFullscreenScale(
											game,
											host,
											cameraLayout.viewportW,
											cameraLayout.viewportH,
											cameraLayout.scale,
										);
									}
									events.onReady?.();
									resolve();
								},
							},
						},
					);
					hub = game.scene.getScene("hub") as HubScene | null;

					onResize = () => relayout();
					window.addEventListener("resize", onResize);
					if (typeof ResizeObserver !== "undefined") {
						resizeObserver = new ResizeObserver(() => relayout());
						resizeObserver.observe(container);
					}
				} catch (error) {
					reject(error);
				}
			});
		},
		updateScene(nextScene) {
			sceneDef = nextScene;
			cameraLayout = resolveCameraLayout(
				nextScene,
				host?.clientWidth || window.innerWidth,
				host?.clientHeight || window.innerHeight,
				{ scaleMultiplier },
			);
			hub?.scene.restart({ scene: nextScene, events, cameraLayout });
			hub = game?.scene.getScene("hub") as HubScene | null;
			relayout();
		},
		movePlayerTo(tileX, tileY) {
			getHub()?.moveToTile(tileX, tileY);
		},
		pause() {
			getHub()?.pausePlay();
		},
		resume() {
			getHub()?.resumePlay();
		},
		destroy() {
			if (onResize) window.removeEventListener("resize", onResize);
			resizeObserver?.disconnect();
			resizeObserver = null;
			game?.destroy(true);
			game = null;
			hub = null;
			host = null;
			sceneDef = null;
			cameraLayout = null;
			onResize = null;
		},
		setPad(x: number, y: number) {
			getHub()?.setPad(x, y);
		},
		tryAction() {
			getHub()?.tryAction();
		},
		unlockAudio() {
			getHub()?.unlockAudio();
		},
		tickPad() {
			getHub()?.tickPadInput();
		},
		setScaleMultiplier(multiplier) {
			scaleMultiplier = Math.max(1, Math.min(5, Math.round(multiplier)));
			relayout();
		},
	};
}
