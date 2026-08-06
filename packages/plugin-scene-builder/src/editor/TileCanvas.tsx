import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneDefinition, SceneObject } from "@poke-emdash/scene-core";
import { footprintCells, tileCropRect } from "@poke-emdash/scene-core";

export type EditorTool =
	| "floor"
	| "wall"
	| "erase-wall"
	| "ornament"
	| "collision"
	| "erase-collision"
	| "interaction"
	| "spawn"
	| "select";

type Props = {
	draft: SceneDefinition;
	tool: EditorTool;
	selectedPropId: string | null;
	selectedObjectId: string | null;
	selectedInteractionId: string | null;
	showCollisions: boolean;
	showInteractions: boolean;
	onPaintFloor: (x: number, y: number) => void;
	onPaintWall: (x: number, y: number) => void;
	onEraseWall: (x: number, y: number) => void;
	onPaintCollision: (x: number, y: number, value: 0 | 1) => void;
	onPlaceOrnament: (x: number, y: number) => void;
	onPlaceInteraction: (x: number, y: number) => void;
	onPlaceSpawn: (x: number, y: number) => void;
	activeSpawnId: string;
	onSelectObject: (id: string | null) => void;
	onSelectInteraction: (id: string | null) => void;
};

const DRAG_TOOLS = new Set<EditorTool>([
	"floor",
	"wall",
	"erase-wall",
	"collision",
	"erase-collision",
]);

export function TileCanvas({
	draft,
	tool,
	selectedPropId,
	selectedObjectId,
	selectedInteractionId,
	showCollisions,
	showInteractions,
	onPaintFloor,
	onPaintWall,
	onEraseWall,
	onPaintCollision,
	onPlaceOrnament,
	onPlaceInteraction,
	onPlaceSpawn,
	activeSpawnId,
	onSelectObject,
	onSelectInteraction,
}: Props) {
	const painting = useRef(false);
	const lastCell = useRef("");
	const [previewScale, setPreviewScale] = useState(1);
	const { grid } = draft;
	const tileSize = grid.tileSize * previewScale;
	const width = grid.width;
	const height = grid.height;

	useEffect(() => {
		const mq = window.matchMedia("(pointer: coarse)");
		const update = () => setPreviewScale(mq.matches ? 2 : 1);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		const stopPaint = () => {
			painting.current = false;
			lastCell.current = "";
		};
		window.addEventListener("pointerup", stopPaint);
		window.addEventListener("pointercancel", stopPaint);
		return () => {
			window.removeEventListener("pointerup", stopPaint);
			window.removeEventListener("pointercancel", stopPaint);
		};
	}, []);

	const floorLayer = draft.tileLayers.find((l) => l.id === "layer-floor");
	const wallLayer = draft.tileLayers.find((l) => l.id === "layer-walls");
	const floorTileset = draft.tilesets.find((t) => t.id === floorLayer?.tilesetId);
	const wallTileset = draft.tilesets.find((t) => t.id === wallLayer?.tilesetId);

	const tileStyle = (
		tileset: { imageUrl: string; columns: number; tileSize: number } | undefined,
		index: number,
	): React.CSSProperties => {
		if (!tileset || index < 0) return { visibility: "hidden" };
		const crop = tileCropRect(index, tileset.columns, tileset.tileSize);
		return {
			width: tileSize,
			height: tileSize,
			backgroundImage: `url(${tileset.imageUrl})`,
			backgroundPosition: `-${crop.x * previewScale}px -${crop.y * previewScale}px`,
			backgroundSize: `${tileset.columns * tileset.tileSize * previewScale}px auto`,
			imageRendering: "pixelated",
		};
	};

	const objectAt = (x: number, y: number): SceneObject | undefined =>
		draft.objects.find((obj) => {
			const asset = draft.assets.find((a) => a.id === obj.assetId);
			const fp = asset?.footprint ?? { widthInTiles: 1, heightInTiles: 1 };
			return footprintCells(obj, fp).some((c) => c.x === x && c.y === y);
		});

	const interactionAt = (x: number, y: number) =>
		draft.interactions.find(
			(i) =>
				x >= i.trigger.x &&
				x < i.trigger.x + i.trigger.width &&
				y >= i.trigger.y &&
				y < i.trigger.y + i.trigger.height,
		);

	const handleCell = useCallback(
		(x: number, y: number) => {
			if (tool === "floor") onPaintFloor(x, y);
			else if (tool === "wall") onPaintWall(x, y);
			else if (tool === "erase-wall") onEraseWall(x, y);
			else if (tool === "collision") onPaintCollision(x, y, 1);
			else if (tool === "erase-collision") onPaintCollision(x, y, 0);
			else if (tool === "ornament") onPlaceOrnament(x, y);
			else if (tool === "interaction") onPlaceInteraction(x, y);
			else if (tool === "spawn") onPlaceSpawn(x, y);
			else if (tool === "select") {
				const obj = objectAt(x, y);
				const ix = interactionAt(x, y);
				onSelectObject(obj?.id ?? null);
				onSelectInteraction(ix?.id ?? null);
			}
		},
		[
			tool,
			selectedPropId,
			onPaintFloor,
			onPaintWall,
			onEraseWall,
			onPaintCollision,
			onPlaceOrnament,
			onPlaceInteraction,
			onPlaceSpawn,
			onSelectObject,
			onSelectInteraction,
			draft.objects,
			draft.assets,
			draft.interactions,
		],
	);

	const paintCell = useCallback(
		(x: number, y: number) => {
			const key = `${x},${y}`;
			if (lastCell.current === key) return;
			lastCell.current = key;
			handleCell(x, y);
		},
		[handleCell],
	);

	const onCellPointerDown = (event: React.PointerEvent<HTMLButtonElement>, x: number, y: number) => {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		painting.current = true;
		lastCell.current = "";
		paintCell(x, y);
	};

	const onCellPointerEnter = (event: React.PointerEvent<HTMLButtonElement>, x: number, y: number) => {
		if (!painting.current || !DRAG_TOOLS.has(tool)) return;
		if (event.buttons === 0 && event.pointerType === "mouse") return;
		paintCell(x, y);
	};

	return (
		<div
			className="inline-block max-w-full touch-none overflow-auto rounded-xl border border-kumo-line bg-[#111]"
			style={{ imageRendering: "pixelated" }}
		>
			<div
				className="relative"
				style={{ width: width * tileSize, height: height * tileSize }}
			>
				{draft.presentation.backgroundImageUrl ? (
					<img
						src={draft.presentation.backgroundImageUrl}
						alt=""
						className="pointer-events-none absolute inset-0"
						style={{
							width: width * tileSize,
							height: height * tileSize,
							imageRendering: "pixelated",
							zIndex: 0,
						}}
						draggable={false}
					/>
				) : null}
				{Array.from({ length: width * height }, (_, index) => {
					const x = index % width;
					const y = Math.floor(index / width);
					const floorIndex = floorLayer?.tiles[index] ?? -1;
					if (draft.presentation.backgroundImageUrl && floorIndex < 0) return null;
					return (
						<div
							key={`bg-${index}`}
							className="absolute"
							style={{
								left: x * tileSize,
								top: y * tileSize,
								zIndex: 1,
								...tileStyle(floorTileset, floorIndex),
							}}
						/>
					);
				})}
				{Array.from({ length: width * height }, (_, index) => {
					const x = index % width;
					const y = Math.floor(index / width);
					const wallIndex = wallLayer?.tiles[index] ?? -1;
					if (wallIndex < 0) return null;
					return (
						<div
							key={`wall-${index}`}
							className="absolute"
							style={{
								left: x * tileSize,
								top: y * tileSize,
								zIndex: 2,
								...tileStyle(wallTileset, wallIndex),
							}}
						/>
					);
				})}
				{draft.objects.map((obj) => {
					const asset = draft.assets.find((a) => a.id === obj.assetId);
					if (!asset) return null;
					const fw = asset.footprint.widthInTiles;
					const fh = asset.footprint.heightInTiles;
					const selected = obj.id === selectedObjectId;
					const style: React.CSSProperties = {
						left: obj.x * tileSize,
						top: obj.y * tileSize,
						width: fw * tileSize,
						height: fh * tileSize,
						imageRendering: "pixelated",
						outline: selected ? "2px solid #ffe066" : undefined,
						zIndex: 10 + obj.y,
					};
					if (asset.sourceType === "tileset-frame" && asset.frame) {
						const sheetScale = tileSize / 32;
						style.backgroundImage = `url(${asset.imageUrl})`;
						style.backgroundPosition = `-${asset.frame.x * sheetScale}px -${asset.frame.y * sheetScale}px`;
						style.backgroundSize = `${8 * 32 * sheetScale}px auto`;
					} else {
						style.backgroundImage = `url(${asset.imageUrl})`;
						style.backgroundSize = "100% 100%";
						style.backgroundRepeat = "no-repeat";
					}
					return <div key={obj.id} className="absolute pointer-events-none" style={style} />;
				})}
				{showInteractions &&
					draft.interactions.map((ix) => (
						<div
							key={ix.id}
							className="absolute pointer-events-none"
							style={{
								left: ix.trigger.x * tileSize,
								top: ix.trigger.y * tileSize,
								width: ix.trigger.width * tileSize,
								height: ix.trigger.height * tileSize,
								background:
									ix.id === selectedInteractionId
										? "rgba(56, 140, 255, 0.45)"
										: "rgba(56, 140, 255, 0.22)",
								outline:
									ix.id === selectedInteractionId ? "2px solid #7eb6ff" : "1px solid #4a8fd8",
								zIndex: 50,
							}}
							title={ix.name}
						/>
					))}
				{showCollisions &&
					Array.from({ length: width * height }, (_, index) => {
						if (draft.collisions[index] !== 1) return null;
						const x = index % width;
						const y = Math.floor(index / width);
						return (
							<div
								key={`col-${index}`}
								className="absolute pointer-events-none"
								style={{
									left: x * tileSize,
									top: y * tileSize,
									width: tileSize,
									height: tileSize,
									background: "rgba(220, 60, 60, 0.28)",
									boxShadow: "inset 0 0 0 1px rgba(255,80,80,0.35)",
									zIndex: 40,
								}}
							/>
						);
					})}
				{draft.spawnPoints.map((spawn) => {
					const active = spawn.id === activeSpawnId;
					const arrow =
						spawn.facing === "up"
							? "↑"
							: spawn.facing === "down"
								? "↓"
								: spawn.facing === "left"
									? "←"
									: "→";
					return (
						<div
							key={spawn.id}
							className="absolute pointer-events-none flex items-center justify-center text-sm font-bold"
							style={{
								left: spawn.x * tileSize,
								top: spawn.y * tileSize,
								width: tileSize,
								height: tileSize,
								background: active ? "rgba(255, 224, 102, 0.55)" : "rgba(255, 224, 102, 0.3)",
								outline: active ? "2px solid #ffe066" : "1px solid #ccb84d",
								zIndex: 60,
								color: "#1a1a24",
							}}
							title={`${spawn.name} ${arrow}`}
						>
							{arrow}
						</div>
					);
				})}
				{Array.from({ length: width * height }, (_, index) => {
					const x = index % width;
					const y = Math.floor(index / width);
					return (
						<button
							key={`hit-${index}`}
							type="button"
							className="absolute border border-white/5 hover:border-yellow-300/50 active:border-yellow-300"
							style={{
								left: x * tileSize,
								top: y * tileSize,
								width: tileSize,
								height: tileSize,
								background: "transparent",
								zIndex: 100,
								touchAction: "none",
							}}
							onPointerDown={(event) => onCellPointerDown(event, x, y)}
							onPointerEnter={(event) => onCellPointerEnter(event, x, y)}
						/>
					);
				})}
			</div>
		</div>
	);
}
