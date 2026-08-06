import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneDefinition, SceneInteraction } from "@poke-emdash/scene-core";
import {
	ALL_TILESETS,
	CATALOG_PROPS,
	POKE_CENTER_TILESET,
	applyObjectCollisions,
	catalogTilesetById,
	ensureSceneTileset,
	licenseEssentials,
	propsForTileset,
	rebuildCollisions,
	resizeSceneGrid,
	GRID_MIN,
	GRID_MAX,
	tileAsOrnament,
	tileCropRect,
	tileToIndex,
} from "@poke-emdash/scene-core";
import { TileCanvas, type EditorTool } from "./TileCanvas.js";
import { OrnamentPalette } from "./OrnamentPalette.js";
import { TilesetPalette } from "./TilesetPalette.js";
import { useMobileEditor } from "./useMobileEditor.js";
import { SceneEditorMobile } from "./SceneEditorMobile.js";

type Props = {
	draft: SceneDefinition;
	routes: Array<{ path: string; label: string }>;
	onChange: (draft: SceneDefinition) => void;
};

const TOOLS: Array<{ id: EditorTool; label: string; group: string }> = [
	{ id: "floor", label: "Suelo", group: "paint" },
	{ id: "wall", label: "Muro", group: "paint" },
	{ id: "erase-wall", label: "Borrar muro", group: "paint" },
	{ id: "ornament", label: "Adorno", group: "paint" },
	{ id: "collision", label: "Colisión", group: "logic" },
	{ id: "erase-collision", label: "Borrar colisión", group: "logic" },
	{ id: "interaction", label: "Interacción", group: "logic" },
	{ id: "spawn", label: "Spawn", group: "logic" },
	{ id: "select", label: "Seleccionar", group: "logic" },
];

export function SceneEditor(props: Props) {
	const isMobileEditor = useMobileEditor();
	if (isMobileEditor) {
		return <SceneEditorMobile {...props} />;
	}
	return <SceneEditorDesktop {...props} />;
}

function SceneEditorDesktop({ draft, routes, onChange }: Props) {
	const [tool, setTool] = useState<EditorTool>("floor");
	const [floorTilesetId, setFloorTilesetId] = useState(POKE_CENTER_TILESET.id);
	const [wallTilesetId, setWallTilesetId] = useState(POKE_CENTER_TILESET.id);
	const [ornamentTilesetFilter, setOrnamentTilesetFilter] = useState<string | "all">("all");
	const [selectedTileIndex, setSelectedTileIndex] = useState(80);
	const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
	const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
	const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
	const [showCollisions, setShowCollisions] = useState(true);
	const [showInteractions, setShowInteractions] = useState(true);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [syncWallsToCollision, setSyncWallsToCollision] = useState(true);
	const [activeSpawnId, setActiveSpawnId] = useState(draft.defaultSpawnId);
	const interactionPanelRef = useRef<HTMLDivElement>(null);

	const floorCatalog = catalogTilesetById(floorTilesetId) ?? POKE_CENTER_TILESET;
	const wallCatalog = catalogTilesetById(wallTilesetId) ?? POKE_CENTER_TILESET;
	const ornamentCatalog =
		ornamentTilesetFilter === "all"
			? POKE_CENTER_TILESET
			: (catalogTilesetById(ornamentTilesetFilter) ?? POKE_CENTER_TILESET);

	const activePaintCatalog = tool === "wall" || tool === "erase-wall" ? wallCatalog : floorCatalog;

	const selectedObject = useMemo(
		() => draft.objects.find((o) => o.id === selectedObjectId) ?? null,
		[draft.objects, selectedObjectId],
	);

	const selectedInteraction = useMemo(
		() => draft.interactions.find((i) => i.id === selectedInteractionId) ?? null,
		[draft.interactions, selectedInteractionId],
	);

	useEffect(() => {
		if (!selectedInteractionId) return;
		interactionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}, [selectedInteractionId]);

	const update = (patch: Partial<SceneDefinition>) => {
		// Never wipe authored collisions on unrelated edits (interactions, name, etc.).
		onChange({ ...draft, ...patch });
	};

	/** Place/update objects: merge colliding footprints onto the existing collision map. */
	const updateWithObjectCollisions = (patch: Partial<SceneDefinition>) => {
		const next = { ...draft, ...patch };
		next.collisions = applyObjectCollisions(
			[...(patch.collisions ?? draft.collisions)],
			next.grid.width,
			next.grid.height,
			next.objects,
			next.assets,
		);
		onChange(next);
	};

	const setLayerTileset = (layerId: string, catalogId: string) => {
		const catalog = catalogTilesetById(catalogId);
		if (!catalog) return;
		const { tilesets, tilesetId } = ensureSceneTileset(draft.tilesets, catalog);
		update({
			tilesets,
			tileLayers: draft.tileLayers.map((layer) =>
				layer.id === layerId ? { ...layer, tilesetId } : layer,
			),
		});
	};

	const paintLayer = (layerId: string, x: number, y: number, index: number) => {
		const idx = tileToIndex(x, y, draft.grid.width);
		const tileLayers = draft.tileLayers.map((layer) => {
			if (layer.id !== layerId) return layer;
			const tiles = [...layer.tiles];
			tiles[idx] = index;
			return { ...layer, tiles };
		});
		update({ tileLayers });
	};

	const paintLayerWithTileset = (
		layerId: string,
		catalogId: string,
		x: number,
		y: number,
		index: number,
	) => {
		const catalog = catalogTilesetById(catalogId);
		if (!catalog) return;
		const { tilesets, tilesetId } = ensureSceneTileset(draft.tilesets, catalog);
		const idx = tileToIndex(x, y, draft.grid.width);
		const tileLayers = draft.tileLayers.map((layer) => {
			if (layer.id !== layerId) return layer;
			const tiles = [...layer.tiles];
			tiles[idx] = index;
			return { ...layer, tilesetId };
		});
		update({ tilesets, tileLayers });
	};

	const onPaintFloor = (x: number, y: number) =>
		paintLayerWithTileset("layer-floor", floorTilesetId, x, y, selectedTileIndex);
	const onPaintWall = (x: number, y: number) => {
		const catalog = catalogTilesetById(wallTilesetId);
		if (!catalog) return;
		const { tilesets, tilesetId } = ensureSceneTileset(draft.tilesets, catalog);
		const idx = tileToIndex(x, y, draft.grid.width);
		const tileLayers = draft.tileLayers.map((layer) => {
			if (layer.id !== "layer-walls") return layer;
			const tiles = [...layer.tiles];
			tiles[idx] = selectedTileIndex;
			return { ...layer, tilesetId };
		});
		const patch: Partial<SceneDefinition> = { tilesets, tileLayers };
		if (syncWallsToCollision) {
			const collisions = [...draft.collisions];
			collisions[idx] = 1;
			patch.collisions = collisions;
		}
		update(patch);
	};
	const onEraseWall = (x: number, y: number) => {
		const idx = tileToIndex(x, y, draft.grid.width);
		const tileLayers = draft.tileLayers.map((layer) => {
			if (layer.id !== "layer-walls") return layer;
			const tiles = [...layer.tiles];
			tiles[idx] = -1;
			return layer;
		});
		const patch: Partial<SceneDefinition> = { tileLayers };
		if (syncWallsToCollision) {
			const collisions = [...draft.collisions];
			collisions[idx] = 0;
			patch.collisions = collisions;
		}
		update(patch);
	};

	const onPaintCollision = (x: number, y: number, value: 0 | 1) => {
		const collisions = [...draft.collisions];
		collisions[tileToIndex(x, y, draft.grid.width)] = value;
		onChange({ ...draft, collisions });
	};

	const placeNamedProp = (propId: string, x: number, y: number) => {
		const prop = CATALOG_PROPS.find((p) => p.id === propId);
		if (!prop) return;
		const catalog = catalogTilesetById(prop.sourceTileset);
		let tilesets = draft.tilesets;
		if (catalog) {
			const ensured = ensureSceneTileset(tilesets, catalog);
			tilesets = ensured.tilesets;
		}
		const assetId = `asset-${prop.id}`;
		let assets = draft.assets;
		if (!assets.some((a) => a.id === assetId)) {
			assets = [
				...assets,
				{
					id: assetId,
					name: prop.name,
					imageUrl: prop.imageUrl,
					sourceType: prop.tilesetFrame ? ("tileset-frame" as const) : ("single-sprite" as const),
					tags: prop.tags,
					license: licenseEssentials,
					frame: prop.tilesetFrame
						? tileCropRect(prop.row * 8 + prop.col)
						: undefined,
					footprint: { widthInTiles: prop.wTiles, heightInTiles: prop.hTiles },
					anchor: { x: 0.5, y: 1 },
					defaults: {
						layer: "objects",
						collision: prop.collision,
						zIndex: 10,
					},
				},
			];
		}
		const objId = `obj-${propId}-${crypto.randomUUID().slice(0, 6)}`;
		const objects = [
			...draft.objects,
			{
				id: objId,
				name: prop.name,
				assetId,
				x: Math.max(0, Math.min(draft.grid.width - prop.wTiles, x)),
				y: Math.max(0, Math.min(draft.grid.height - prop.hTiles, y - prop.hTiles + 1)),
				layer: "objects",
				zIndex: 10,
				collision: prop.collision,
			},
		];
		updateWithObjectCollisions({ assets, tilesets, objects });
		setSelectedObjectId(objId);
		setTool("select");
	};

	const placeTileOrnament = (x: number, y: number) => {
		const catalog = ornamentCatalog;
		const prop = tileAsOrnament(catalog, selectedTileIndex);
		const { tilesets, tilesetId: _id } = ensureSceneTileset(draft.tilesets, catalog);
		void _id;
		const assetId = `asset-${prop.id}`;
		let assets = draft.assets;
		if (!assets.some((a) => a.id === assetId)) {
			assets = [
				...assets,
				{
					id: assetId,
					name: prop.name,
					imageUrl: prop.imageUrl,
					sourceType: "tileset-frame" as const,
					tags: prop.tags,
					license: licenseEssentials,
					frame: tileCropRect(selectedTileIndex, catalog.columns, catalog.tileSize),
					footprint: { widthInTiles: 1, heightInTiles: 1 },
					anchor: { x: 0.5, y: 1 },
					defaults: { layer: "objects", collision: true, zIndex: 10 },
				},
			];
		}
		const objId = `obj-tile-${catalog.id}-${selectedTileIndex}-${crypto.randomUUID().slice(0, 6)}`;
		const objects = [
			...draft.objects,
			{
				id: objId,
				name: `${catalog.name} #${selectedTileIndex}`,
				assetId,
				x,
				y,
				layer: "objects",
				zIndex: 10,
				collision: true,
			},
		];
		updateWithObjectCollisions({ assets, tilesets, objects });
		setSelectedObjectId(objId);
	};

	const onPlaceOrnament = (x: number, y: number) => {
		if (selectedPropId) placeNamedProp(selectedPropId, x, y);
		else placeTileOrnament(x, y);
	};

	const onPlaceInteraction = (x: number, y: number) => {
		const existing = draft.interactions.find(
			(i) =>
				x >= i.trigger.x &&
				x < i.trigger.x + i.trigger.width &&
				y >= i.trigger.y &&
				y < i.trigger.y + i.trigger.height,
		);
		if (existing) {
			setSelectedInteractionId(existing.id);
			setSelectedObjectId(null);
			setShowInteractions(true);
			setTool("select");
			return;
		}
		const id = `ix-${crypto.randomUUID().slice(0, 6)}`;
		const interaction: SceneInteraction = {
			id,
			name: "Nueva interacción",
			trigger: { type: "action", x, y, width: 1, height: 1 },
			target: { type: "internal-route", path: routes[0]?.path ?? "/posts" },
			panel: {
				title: routes[0]?.label ?? "Contenido",
				presentation: "side-panel",
			},
		};
		update({ interactions: [...draft.interactions, interaction] });
		setSelectedInteractionId(id);
		setShowInteractions(true);
	};

	const linkInteraction = (path: string, label: string) => {
		if (!selectedObject) return;
		const ixId = selectedObject.interactionId ?? `ix-${crypto.randomUUID().slice(0, 6)}`;
		const asset = draft.assets.find((a) => a.id === selectedObject.assetId);
		const fw = asset?.footprint.widthInTiles ?? 1;
		const fh = asset?.footprint.heightInTiles ?? 1;
		const interaction: SceneInteraction = {
			id: ixId,
			name: label,
			trigger: {
				type: "action",
				x: selectedObject.x,
				y: selectedObject.y + fh - 1,
				width: fw,
				height: 1,
				facingRequired: "up",
			},
			target: { type: "internal-route", path },
			panel: { title: label, presentation: "side-panel" },
		};
		const interactions = selectedObject.interactionId
			? draft.interactions.map((i) => (i.id === ixId ? interaction : i))
			: [...draft.interactions, interaction];
		const objects = draft.objects.map((o) =>
			o.id === selectedObject.id ? { ...o, interactionId: ixId } : o,
		);
		update({ interactions, objects });
		setSelectedInteractionId(ixId);
	};

	const updateSelectedInteraction = (patch: Partial<SceneInteraction>) => {
		if (!selectedInteraction) return;
		update({
			interactions: draft.interactions.map((i) =>
				i.id === selectedInteraction.id ? { ...i, ...patch } : i,
			),
		});
	};

	const updateSelectedTrigger = (
		patch: Partial<SceneInteraction["trigger"]>,
	) => {
		if (!selectedInteraction) return;
		updateSelectedInteraction({
			trigger: { ...selectedInteraction.trigger, ...patch },
		});
	};

	const deleteSelectedObject = () => {
		if (!selectedObject) return;
		const objects = draft.objects.filter((o) => o.id !== selectedObject.id);
		const interactions = selectedObject.interactionId
			? draft.interactions.filter((i) => i.id !== selectedObject.interactionId)
			: draft.interactions;
		update({ objects, interactions });
		setSelectedObjectId(null);
	};

	const deleteSelectedInteraction = () => {
		if (!selectedInteraction) return;
		update({
			interactions: draft.interactions.filter((i) => i.id !== selectedInteraction.id),
			objects: draft.objects.map((o) =>
				o.interactionId === selectedInteraction.id ? { ...o, interactionId: undefined } : o,
			),
		});
		setSelectedInteractionId(null);
	};

	const onPlaceSpawn = (x: number, y: number) => {
		const spawnId = activeSpawnId || draft.defaultSpawnId;
		const spawnPoints = draft.spawnPoints.map((s) =>
			s.id === spawnId ? { ...s, x, y } : s,
		);
		onChange({ ...draft, spawnPoints });
	};

	const setSpawnFacing = (facing: "up" | "down" | "left" | "right") => {
		const spawnId = activeSpawnId || draft.defaultSpawnId;
		onChange({
			...draft,
			spawnPoints: draft.spawnPoints.map((s) =>
				s.id === spawnId ? { ...s, facing } : s,
			),
		});
	};

	const handleGridResize = (width: number, height: number) => {
		try {
			const { scene, trimmed } = resizeSceneGrid(draft, width, height);
			if (trimmed.objects || trimmed.interactions || trimmed.spawnPoints) {
				// eslint-disable-next-line no-alert
				window.alert(
					`Grid reducido: se eliminaron ${trimmed.objects} objetos, ${trimmed.interactions} interacciones, ${trimmed.spawnPoints} spawns fuera del área.`,
				);
			}
			onChange(scene);
		} catch (error) {
			// eslint-disable-next-line no-alert
			window.alert(error instanceof Error ? error.message : "No se pudo redimensionar");
		}
	};

	const rebuildAutoCollisions = () => {
		onChange({ ...draft, collisions: rebuildCollisions(draft) });
	};

	return (
		<div className="overflow-hidden rounded-2xl border border-kumo-line bg-kumo-base shadow-sm">
			{/* App toolbar */}
			<div className="flex flex-wrap items-center gap-2 border-b border-kumo-line bg-kumo-elevated/40 px-3 py-2">
				<div className="flex flex-wrap gap-1">
					{TOOLS.filter((t) => t.group === "paint").map((t) => (
						<button
							key={t.id}
							type="button"
							className={`rounded-full px-3 py-1.5 text-xs font-medium ${
								tool === t.id
									? "bg-kumo-brand text-white"
									: "bg-kumo-base text-kumo-default hover:bg-kumo-elevated"
							}`}
							onClick={() => {
								setTool(t.id);
								if (t.id !== "ornament") setSelectedPropId(null);
							}}
						>
							{t.label}
						</button>
					))}
				</div>
				<div className="mx-1 h-5 w-px bg-kumo-line" />
				<div className="flex flex-wrap gap-1">
					{TOOLS.filter((t) => t.group === "logic").map((t) => (
						<button
							key={t.id}
							type="button"
							className={`rounded-full px-3 py-1.5 text-xs font-medium ${
								tool === t.id
									? "bg-kumo-brand text-white"
									: "bg-kumo-base text-kumo-default hover:bg-kumo-elevated"
							}`}
							onClick={() => setTool(t.id)}
						>
							{t.label}
						</button>
					))}
				</div>
				<div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
					<label className="flex items-center gap-1.5">
						<input
							type="checkbox"
							checked={showCollisions}
							onChange={(e) => setShowCollisions(e.target.checked)}
						/>
						Colisiones
					</label>
					<label className="flex items-center gap-1.5">
						<input
							type="checkbox"
							checked={showInteractions}
							onChange={(e) => setShowInteractions(e.target.checked)}
						/>
						Interacciones
					</label>
					<label className="flex items-center gap-1.5">
						<input
							type="checkbox"
							checked={syncWallsToCollision}
							onChange={(e) => setSyncWallsToCollision(e.target.checked)}
						/>
						Muros → colisión
					</label>
					<button
						type="button"
						className="rounded-full border border-kumo-line px-2 py-1 hover:bg-kumo-base"
						onClick={rebuildAutoCollisions}
						title="⚠️ Borra colisiones pintadas a mano y deja solo las de objetos con collision"
					>
						Auto-colisión
					</button>
				</div>
			</div>

			<div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
				<section className="overflow-auto p-3">
					<TileCanvas
						draft={draft}
						tool={tool}
						selectedPropId={selectedPropId}
						selectedObjectId={selectedObjectId}
						selectedInteractionId={selectedInteractionId}
						showCollisions={showCollisions}
						showInteractions={showInteractions}
						onPaintFloor={onPaintFloor}
						onPaintWall={onPaintWall}
						onEraseWall={onEraseWall}
						onPaintCollision={onPaintCollision}
						onPlaceOrnament={onPlaceOrnament}
						onPlaceInteraction={onPlaceInteraction}
						onPlaceSpawn={onPlaceSpawn}
						activeSpawnId={activeSpawnId}
						onSelectObject={setSelectedObjectId}
						onSelectInteraction={setSelectedInteractionId}
					/>
					<p className="mt-2 text-[11px] text-kumo-subtle">
						{tool === "floor" && "Pinta suelo. Puedes usar un tileset distinto al de muros."}
						{tool === "wall" && "Pinta muros. Tileset independiente del suelo."}
						{tool === "ornament" &&
							"Coloca un adorno de la biblioteca o un tile suelto de cualquier tileset."}
						{tool === "collision" && "Marca celdas bloqueadas (rojo)."}
						{tool === "erase-collision" && "Quita bloqueo de celdas."}
						{tool === "interaction" &&
							"Toca una celda vacía para crear zona 1×1 (azul). Puedes crear varias seguidas."}
						{tool === "spawn" && "Click para colocar el punto de partida del personaje."}
						{tool === "select" &&
							"Click en zona azul → editar tamaño / Eliminar interacción."}
						{tool === "erase-wall" && "Borra tiles de muro."}
					</p>
				</section>

				<aside className="space-y-4 border-t border-kumo-line p-3 lg:border-l lg:border-t-0">
					<label className="block text-sm">
						<span className="font-medium">Nombre</span>
						<input
							className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
							value={draft.name}
							onChange={(e) => onChange({ ...draft, name: e.target.value })}
						/>
					</label>

					<div className="grid grid-cols-2 gap-2">
						<label className="block text-xs">
							Ancho (tiles)
							<input
								type="number"
								min={GRID_MIN}
								max={GRID_MAX}
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={draft.grid.width}
								onChange={(e) =>
									handleGridResize(Number(e.target.value) || draft.grid.width, draft.grid.height)
								}
							/>
						</label>
						<label className="block text-xs">
							Alto (tiles)
							<input
								type="number"
								min={GRID_MIN}
								max={GRID_MAX}
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={draft.grid.height}
								onChange={(e) =>
									handleGridResize(draft.grid.width, Number(e.target.value) || draft.grid.height)
								}
							/>
						</label>
					</div>

					<div className="space-y-2 rounded-xl border border-kumo-line p-3 text-sm">
						<h3 className="font-semibold">Spawn (inicio)</h3>
						<label className="block text-xs">
							Punto activo
							<select
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={activeSpawnId}
								onChange={(e) => setActiveSpawnId(e.target.value)}
							>
								{draft.spawnPoints.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name} ({s.x}, {s.y})
									</option>
								))}
							</select>
						</label>
						<label className="block text-xs">
							Spawn por defecto
							<select
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={draft.defaultSpawnId}
								onChange={(e) => onChange({ ...draft, defaultSpawnId: e.target.value })}
							>
								{draft.spawnPoints.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</label>
						<label className="block text-xs">
							Dirección
							<select
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={
									draft.spawnPoints.find((s) => s.id === activeSpawnId)?.facing ?? "up"
								}
								onChange={(e) =>
									setSpawnFacing(
										e.target.value as "up" | "down" | "left" | "right",
									)
								}
							>
								<option value="up">Arriba</option>
								<option value="down">Abajo</option>
								<option value="left">Izquierda</option>
								<option value="right">Derecha</option>
							</select>
						</label>
						<button
							type="button"
							className="text-xs text-kumo-brand underline"
							onClick={() => setTool("spawn")}
						>
							Colocar en mapa (herramienta Spawn)
						</button>
					</div>

					<label className="block text-sm">
						<span className="font-medium">Personaje</span>
						<select
							className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
							value={draft.player.spriteAssetId}
							onChange={(e) =>
								onChange({
									...draft,
									player: { ...draft.player, spriteAssetId: e.target.value },
								})
							}
						>
							{draft.assets
								.filter((a) => a.tags.includes("player"))
								.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name}
									</option>
								))}
						</select>
					</label>

					{(tool === "floor" || tool === "wall" || tool === "erase-wall") && (
						<div className="space-y-2 rounded-xl border border-kumo-line p-2">
							<label className="block text-xs font-medium">
								Tileset de {tool === "floor" ? "suelo" : "muros"}
								<select
									className="mt-1 h-8 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2 text-sm"
									value={tool === "floor" ? floorTilesetId : wallTilesetId}
									onChange={(e) => {
										if (tool === "floor") {
											setFloorTilesetId(e.target.value);
											setLayerTileset("layer-floor", e.target.value);
										} else {
											setWallTilesetId(e.target.value);
											setLayerTileset("layer-walls", e.target.value);
										}
									}}
								>
									{ALL_TILESETS.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</label>
							<p className="text-[10px] text-kumo-subtle">
								Ej: suelo de Interior general + muros de Poké Center.
							</p>
							<TilesetPalette
								tileset={activePaintCatalog}
								selectedIndex={selectedTileIndex}
								onSelect={setSelectedTileIndex}
								maxRows={activePaintCatalog.id === "outside" ? 40 : undefined}
							/>
						</div>
					)}

					{tool === "ornament" && (
						<div className="space-y-3 rounded-xl border border-kumo-line p-2">
							<label className="block text-xs font-medium">
								Filtrar adornos por tileset
								<select
									className="mt-1 h-8 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2 text-sm"
									value={ornamentTilesetFilter}
									onChange={(e) =>
										setOrnamentTilesetFilter(
											e.target.value === "all" ? "all" : e.target.value,
										)
									}
								>
									<option value="all">Todos ({CATALOG_PROPS.length})</option>
									{ALL_TILESETS.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name} ({propsForTileset(t.id).length})
										</option>
									))}
								</select>
							</label>
							<OrnamentPalette
								tilesetFilter={ornamentTilesetFilter}
								selectedPropId={selectedPropId}
								onSelect={(id) => {
									setSelectedPropId(id);
									if (id) setTool("ornament");
								}}
							/>
							<div className="border-t border-kumo-line pt-2">
								<p className="mb-1 text-xs font-medium">O cualquier tile del sheet</p>
								<label className="mb-2 block text-[10px] text-kumo-subtle">
									Tileset para tile suelto
									<select
										className="mt-1 h-8 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2 text-sm"
										value={
											ornamentTilesetFilter === "all"
												? POKE_CENTER_TILESET.id
												: ornamentTilesetFilter
										}
										onChange={(e) => {
											setOrnamentTilesetFilter(e.target.value);
											setSelectedPropId(null);
										}}
									>
										{ALL_TILESETS.map((t) => (
											<option key={t.id} value={t.id}>
												{t.name}
											</option>
										))}
									</select>
								</label>
								<TilesetPalette
									tileset={ornamentCatalog}
									selectedIndex={selectedTileIndex}
									onSelect={(index) => {
										setSelectedTileIndex(index);
										setSelectedPropId(null);
									}}
									maxRows={ornamentCatalog.id === "outside" ? 40 : 60}
								/>
							</div>
						</div>
					)}

					{selectedObject && (
						<div className="space-y-2 rounded-xl border border-kumo-line p-3 text-sm">
							<h3 className="font-semibold">Objeto: {selectedObject.name}</h3>
							<label className="block text-xs">
								Enlace del blog
								<select
									className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
									value={
										selectedObject.interactionId &&
										draft.interactions.find((i) => i.id === selectedObject.interactionId)
											?.target.type === "internal-route"
											? (
													draft.interactions.find(
														(i) => i.id === selectedObject.interactionId,
													)?.target as { path: string }
												).path
											: ""
									}
									onChange={(e) => {
										const route = routes.find((r) => r.path === e.target.value);
										linkInteraction(e.target.value, route?.label ?? "Contenido");
									}}
								>
									<option value="">— sin enlace —</option>
									{routes.map((r) => (
										<option key={r.path} value={r.path}>
											{r.label}
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="text-xs text-red-600"
								onClick={deleteSelectedObject}
							>
								Eliminar objeto
							</button>
						</div>
					)}

					{selectedInteraction && (
						<div
							ref={interactionPanelRef}
							className="space-y-2 rounded-xl border border-kumo-line p-3 text-sm"
						>
							<h3 className="font-semibold">Interacción</h3>
							<label className="block text-xs">
								Nombre
								<input
									className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
									value={selectedInteraction.name}
									onChange={(e) =>
										updateSelectedInteraction({ name: e.target.value })
									}
								/>
							</label>
							<div className="grid grid-cols-2 gap-2">
								<label className="block text-xs">
									Ancho (tiles)
									<input
										type="number"
										min={1}
										max={draft.grid.width}
										className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
										value={selectedInteraction.trigger.width}
										onChange={(e) => {
											const width = Math.max(
												1,
												Math.min(
													draft.grid.width - selectedInteraction.trigger.x,
													Number(e.target.value) || 1,
												),
											);
											updateSelectedTrigger({ width });
										}}
									/>
								</label>
								<label className="block text-xs">
									Alto (tiles)
									<input
										type="number"
										min={1}
										max={draft.grid.height}
										className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
										value={selectedInteraction.trigger.height}
										onChange={(e) => {
											const height = Math.max(
												1,
												Math.min(
													draft.grid.height - selectedInteraction.trigger.y,
													Number(e.target.value) || 1,
												),
											);
											updateSelectedTrigger({ height });
										}}
									/>
								</label>
							</div>
							<p className="text-[10px] text-kumo-subtle">
								Origen en ({selectedInteraction.trigger.x},{" "}
								{selectedInteraction.trigger.y}). Crece hacia la derecha y abajo.
							</p>
							<label className="block text-xs">
								Ruta
								<select
									className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
									value={
										selectedInteraction.target.type === "internal-route"
											? selectedInteraction.target.path
											: ""
									}
									onChange={(e) => {
										const route = routes.find((r) => r.path === e.target.value);
										updateSelectedInteraction({
											target: { type: "internal-route", path: e.target.value },
											panel: {
												title: route?.label ?? "Contenido",
												presentation: "side-panel",
											},
										});
									}}
								>
									{routes.map((r) => (
										<option key={r.path} value={r.path}>
											{r.label}
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="text-xs text-red-600"
								onClick={deleteSelectedInteraction}
							>
								Eliminar interacción
							</button>
						</div>
					)}

					<button
						type="button"
						className="text-xs text-kumo-subtle underline"
						onClick={() => setShowAdvanced((v) => !v)}
					>
						{showAdvanced ? "Ocultar avanzado" : "Avanzado (slug)"}
					</button>
					{showAdvanced && (
						<label className="block text-sm">
							<span className="font-medium">Slug</span>
							<input
								className="mt-1 h-9 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-2"
								value={draft.slug}
								onChange={(e) => onChange({ ...draft, slug: e.target.value })}
							/>
						</label>
					)}
				</aside>
			</div>
		</div>
	);
}
