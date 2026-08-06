import { describe, expect, it } from "vitest";
import {
	createPokemonRoomScene,
	createSceneFromTemplate,
	findPath,
	findNearestWalkable,
	parseSceneJson,
	resizeSceneGrid,
	resolveCameraLayout,
	serializeScene,
	validateScene,
	footprintCells,
	rebuildCollisions,
} from "../src/index";

describe("scene-core", () => {
	it("demo scene validates", () => {
		const scene = createPokemonRoomScene();
		expect(validateScene(scene)).toEqual([]);
	});

	it("round-trips JSON", () => {
		const scene = createPokemonRoomScene();
		const again = parseSceneJson(serializeScene(scene));
		expect(again.slug).toBe("demo-room");
	});

	it("finds a path around walls", () => {
		const scene = createPokemonRoomScene();
		const path = findPath(
			scene.collisions,
			scene.grid.width,
			scene.grid.height,
			{ x: 7, y: 7 },
			{ x: 4, y: 5 },
		);
		expect(path).toBeTruthy();
		expect(path!.length).toBeGreaterThan(1);
	});

	it("rejects unclear license on publish check", () => {
		const scene = createPokemonRoomScene();
		scene.assets[0]!.license = {
			...scene.assets[0]!.license,
			distributionPolicy: "unclear-do-not-use",
		};
		const issues = validateScene(scene);
		expect(issues.some((i) => i.message.includes("unclear"))).toBe(true);
	});

	it("multi-tile footprint covers all cells", () => {
		const cells = footprintCells({ x: 4, y: 7 }, { widthInTiles: 3, heightInTiles: 2 });
		expect(cells).toHaveLength(6);
		expect(cells).toContainEqual({ x: 6, y: 8 });
	});

	it("rebuildCollisions keeps authored wall mask when no objects", () => {
		const scene = createPokemonRoomScene();
		const blocked = scene.collisions;
		// Entrance mat tiles are walkable
		expect(blocked[8 * scene.grid.width + 7]).toBe(0);
		expect(blocked[8 * scene.grid.width + 8]).toBe(0);
		// Void row blocked
		expect(blocked[9 * scene.grid.width + 7]).toBe(1);
		// Counter band blocked
		expect(blocked[3 * scene.grid.width + 7]).toBe(1);
	});

	it("gym template uses follow-player camera and larger grid", () => {
		const scene = createSceneFromTemplate("gym-arena");
		expect(scene.grid.width).toBe(20);
		expect(scene.presentation.camera?.mode).toBe("follow-player");
		expect(validateScene(scene)).toEqual([]);
	});

	it("resizeSceneGrid trims out-of-bounds objects", () => {
		const scene = createSceneFromTemplate("blank");
		scene.objects = [
			{
				id: "obj-1",
				name: "Test",
				assetId: "asset-player-boy",
				x: 10,
				y: 8,
				layer: "objects",
				zIndex: 1,
				collision: false,
			},
		];
		const { scene: smaller, trimmed } = resizeSceneGrid(scene, 8, 8);
		expect(smaller.grid.width).toBe(8);
		expect(smaller.objects).toHaveLength(0);
		expect(trimmed.objects).toBe(1);
	});

	it("findNearestWalkable returns adjacent tile when goal is blocked", () => {
		const scene = createPokemonRoomScene();
		const { collisions, grid } = scene;
		// Counter band at y=3, x=7 is blocked in poke center
		const blocked = { x: 7, y: 3 };
		expect(collisions[blocked.y * grid.width + blocked.x]).toBe(1);
		const nearest = findNearestWalkable(collisions, grid.width, grid.height, blocked);
		expect(nearest).not.toBeNull();
		expect(nearest!.x).toBe(7);
		expect(nearest!.y).toBe(4);
		const path = findPath(
			collisions,
			grid.width,
			grid.height,
			{ x: 7, y: 7 },
			nearest!,
		);
		expect(path).not.toBeNull();
		expect(path!.length).toBeGreaterThan(1);
	});

	it("resolveCameraLayout fits small home room", () => {
		const scene = createPokemonRoomScene();
		const layout = resolveCameraLayout(scene, 800, 600);
		expect(layout.followPlayer).toBe(false);
		expect(layout.viewportW).toBe(480);
		expect(layout.viewportH).toBe(320);
	});

	it("resolveCameraLayout centers player on touch-width containers", () => {
		const scene = createPokemonRoomScene();
		const layout = resolveCameraLayout(scene, 390, 700, { scaleMultiplier: 2 });
		expect(layout.followMode).toBe("center");
		expect(layout.followPlayer).toBe(true);
		expect(layout.scale).toBe(2);
		expect(layout.viewportW).toBeLessThan(480);
		expect(layout.viewportH).toBeLessThanOrEqual(320);
	});
});
