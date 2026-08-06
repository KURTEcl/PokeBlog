import { useMemo, useState } from "react";
import { Banner } from "@cloudflare/kumo";
import type { SceneDefinition, SceneInteraction } from "@poke-emdash/scene-core";

type Props = {
	draft: SceneDefinition;
	routes: Array<{ path: string; label: string }>;
	onChange: (draft: SceneDefinition) => void;
};

const inputClass =
	"mt-1 h-11 w-full rounded-lg border border-kumo-line bg-kumo-elevated px-3 text-base";

export function SceneEditorMobile({ draft, routes, onChange }: Props) {
	const [newIx, setNewIx] = useState({
		name: "Nueva interacción",
		x: 0,
		y: 0,
		width: 1,
		height: 1,
		path: routes[0]?.path ?? "/posts",
	});

	const defaultSpawn = useMemo(
		() =>
			draft.spawnPoints.find((s) => s.id === draft.defaultSpawnId) ??
			draft.spawnPoints[0] ??
			null,
		[draft.defaultSpawnId, draft.spawnPoints],
	);

	const update = (patch: Partial<SceneDefinition>) => {
		onChange({ ...draft, ...patch });
	};

	const addInteraction = () => {
		const route = routes.find((r) => r.path === newIx.path);
		const interaction: SceneInteraction = {
			id: `ix-${crypto.randomUUID().slice(0, 6)}`,
			name: newIx.name.trim() || "Nueva interacción",
			trigger: {
				type: "action",
				x: Math.max(0, Math.min(draft.grid.width - 1, newIx.x)),
				y: Math.max(0, Math.min(draft.grid.height - 1, newIx.y)),
				width: Math.max(1, Math.min(draft.grid.width - newIx.x, newIx.width)),
				height: Math.max(1, Math.min(draft.grid.height - newIx.y, newIx.height)),
			},
			target: { type: "internal-route", path: newIx.path },
			panel: {
				title: route?.label ?? "Contenido",
				presentation: "side-panel",
			},
		};
		update({ interactions: [...draft.interactions, interaction] });
	};

	const updateInteraction = (id: string, patch: Partial<SceneInteraction>) => {
		update({
			interactions: draft.interactions.map((i) => (i.id === id ? { ...i, ...patch } : i)),
		});
	};

	const updateInteractionRoute = (id: string, path: string) => {
		const route = routes.find((r) => r.path === path);
		const interaction = draft.interactions.find((i) => i.id === id);
		if (!interaction) return;
		updateInteraction(id, {
			target: { type: "internal-route", path },
			panel: { title: route?.label ?? interaction.panel?.title, presentation: "side-panel" },
		});
	};

	const deleteInteraction = (id: string) => {
		update({
			interactions: draft.interactions.filter((i) => i.id !== id),
			objects: draft.objects.map((o) =>
				o.interactionId === id ? { ...o, interactionId: undefined } : o,
			),
		});
	};

	const useSpawnForNew = () => {
		if (!defaultSpawn) return;
		setNewIx((prev) => ({ ...prev, x: defaultSpawn.x, y: defaultSpawn.y }));
	};

	return (
		<div className="space-y-4 rounded-xl border border-kumo-line bg-kumo-base p-4">
			<Banner
				variant="default"
				title="Modo móvil"
				description="El lienzo completo (suelo, muros, colisiones) funciona mejor en escritorio. Aquí puedes gestionar interacciones, personaje y revisar el escenario."
			/>

			<section className="space-y-2">
				<h2 className="text-sm font-semibold">Escenario</h2>
				<p className="text-xs text-kumo-subtle">
					Grid {draft.grid.width}×{draft.grid.height} · {draft.interactions.length} interacciones
				</p>
				<label className="block text-xs">
					Nombre
					<input
						className={inputClass}
						value={draft.name}
						onChange={(e) => update({ name: e.target.value })}
					/>
				</label>
			</section>

			<section className="space-y-2">
				<h2 className="text-sm font-semibold">Personaje</h2>
				<div className="flex gap-2">
					{(["asset-player-boy", "asset-player-girl"] as const).map((id) => (
						<button
							key={id}
							type="button"
							className={`flex-1 rounded-lg border px-3 py-3 text-sm ${
								draft.player.spriteAssetId === id
									? "border-kumo-brand bg-kumo-brand/10"
									: "border-kumo-line"
							}`}
							onClick={() => update({ player: { ...draft.player, spriteAssetId: id } })}
						>
							{id === "asset-player-boy" ? "Chico" : "Chica"}
						</button>
					))}
				</div>
			</section>

			<section className="space-y-3 rounded-xl border border-kumo-line p-3">
				<h2 className="text-sm font-semibold">Nueva interacción</h2>
				<label className="block text-xs">
					Nombre
					<input
						className={inputClass}
						value={newIx.name}
						onChange={(e) => setNewIx((p) => ({ ...p, name: e.target.value }))}
					/>
				</label>
				<div className="grid grid-cols-2 gap-2">
					<label className="block text-xs">
						X
						<input
							type="number"
							min={0}
							max={draft.grid.width - 1}
							className={inputClass}
							value={newIx.x}
							onChange={(e) =>
								setNewIx((p) => ({ ...p, x: Number(e.target.value) || 0 }))
							}
						/>
					</label>
					<label className="block text-xs">
						Y
						<input
							type="number"
							min={0}
							max={draft.grid.height - 1}
							className={inputClass}
							value={newIx.y}
							onChange={(e) =>
								setNewIx((p) => ({ ...p, y: Number(e.target.value) || 0 }))
							}
						/>
					</label>
					<label className="block text-xs">
						Ancho
						<input
							type="number"
							min={1}
							className={inputClass}
							value={newIx.width}
							onChange={(e) =>
								setNewIx((p) => ({ ...p, width: Number(e.target.value) || 1 }))
							}
						/>
					</label>
					<label className="block text-xs">
						Alto
						<input
							type="number"
							min={1}
							className={inputClass}
							value={newIx.height}
							onChange={(e) =>
								setNewIx((p) => ({ ...p, height: Number(e.target.value) || 1 }))
							}
						/>
					</label>
				</div>
				<label className="block text-xs">
					Enlace del blog
					<select
						className={inputClass}
						value={newIx.path}
						onChange={(e) => setNewIx((p) => ({ ...p, path: e.target.value }))}
					>
						{routes.map((r) => (
							<option key={r.path} value={r.path}>
								{r.label}
							</option>
						))}
					</select>
				</label>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className="rounded-lg border border-kumo-line px-3 py-2 text-sm"
						onClick={useSpawnForNew}
					>
						Usar spawn
					</button>
					<button
						type="button"
						className="rounded-lg bg-kumo-brand px-4 py-2 text-sm font-medium text-white"
						onClick={addInteraction}
					>
						Añadir interacción
					</button>
				</div>
				<p className="text-[11px] text-kumo-subtle">
					Coordenadas en tiles (0,0 = esquina superior izquierda). En escritorio puedes
					pintarlas tocando el mapa.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-sm font-semibold">
					Interacciones ({draft.interactions.length})
				</h2>
				{draft.interactions.length === 0 ? (
					<p className="text-sm text-kumo-subtle">Aún no hay zonas de interacción.</p>
				) : (
					<ul className="space-y-3">
						{draft.interactions.map((ix) => (
							<li key={ix.id} className="space-y-2 rounded-lg border border-kumo-line p-3">
								<input
									className={inputClass}
									value={ix.name}
									onChange={(e) => updateInteraction(ix.id, { name: e.target.value })}
								/>
								<p className="text-[11px] text-kumo-subtle">
									Tiles ({ix.trigger.x}, {ix.trigger.y}) · {ix.trigger.width}×
									{ix.trigger.height}
								</p>
								<select
									className={inputClass}
									value={
										ix.target.type === "internal-route" ? ix.target.path : ""
									}
									onChange={(e) => updateInteractionRoute(ix.id, e.target.value)}
								>
									{routes.map((r) => (
										<option key={r.path} value={r.path}>
											{r.label}
										</option>
									))}
								</select>
								<button
									type="button"
									className="text-sm text-red-600"
									onClick={() => deleteInteraction(ix.id)}
								>
									Eliminar
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
