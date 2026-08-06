import { useCallback, useEffect, useState } from "react";
import { Banner, Button } from "@cloudflare/kumo";
import { apiFetch } from "@emdash-cms/admin";
import type { SceneDefinition } from "@poke-emdash/scene-core";
import type { SceneTemplateId } from "@poke-emdash/scene-core";
import { SCENE_TEMPLATE_LABELS } from "@poke-emdash/scene-core";
import { SceneEditor } from "./editor/SceneEditor.js";
import { useMobileEditor } from "./editor/useMobileEditor.js";

const API = "/_emdash/api/plugins/scene-builder";

type SceneListItem = {
	id: string;
	slug: string;
	name: string;
	status: string;
	updatedAt: string;
	isHome?: boolean;
	hasPublished: boolean;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await apiFetch(`${API}/${path}`, init);
	const payload = await response.json();
	const data = (payload as { data?: T }).data ?? (payload as T);
	if (!response.ok) {
		const err = (data as { error?: string }).error ?? response.statusText;
		throw new Error(err);
	}
	return data as T;
}

function ScenesPage() {
	const isMobileEditor = useMobileEditor();
	const [scenes, setScenes] = useState<SceneListItem[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<SceneDefinition | null>(null);
	const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);
	const [routes, setRoutes] = useState<Array<{ path: string; label: string }>>([]);
	const [importText, setImportText] = useState("");
	const [showImport, setShowImport] = useState(false);
	const [newTemplateId, setNewTemplateId] = useState<SceneTemplateId>("blank");

	const reloadList = useCallback(async () => {
		const data = await api<{ scenes: SceneListItem[] }>("scenes");
		setScenes(data.scenes);
		if (!selectedId && data.scenes[0]) setSelectedId(data.scenes[0].id);
	}, [selectedId]);

	useEffect(() => {
		void reloadList().catch((error) =>
			setNotice({ type: "error", message: error instanceof Error ? error.message : "Error" }),
		);
		void api<{ routes: Array<{ path: string; label: string }> }>("route-options")
			.then((data) => setRoutes(data.routes))
			.catch(() => undefined);
	}, [reloadList]);

	useEffect(() => {
		if (!selectedId) return;
		void api<{ id: string; record: { draftData: SceneDefinition } }>(
			`scene-get?id=${encodeURIComponent(selectedId)}`,
		)
			.then((data) => setDraft(data.record.draftData))
			.catch((error) =>
				setNotice({
					type: "error",
					message: error instanceof Error ? error.message : "No se pudo cargar",
				}),
			);
	}, [selectedId]);

	const save = async () => {
		if (!selectedId || !draft) return;
		setBusy(true);
		setNotice(null);
		try {
			await api("scene-save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: selectedId, draft }),
			});
			await reloadList();
			setNotice({ type: "success", message: "Borrador guardado" });
		} catch (error) {
			setNotice({
				type: "error",
				message: error instanceof Error ? error.message : "Error al guardar",
			});
		} finally {
			setBusy(false);
		}
	};

	const publish = async () => {
		if (!selectedId) return;
		setBusy(true);
		try {
			await save();
			await api("scene-publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: selectedId }),
			});
			await reloadList();
			setNotice({ type: "success", message: "Escenario publicado" });
		} catch (error) {
			setNotice({
				type: "error",
				message: error instanceof Error ? error.message : "Error al publicar",
			});
		} finally {
			setBusy(false);
		}
	};

	const create = async () => {
		setBusy(true);
		try {
			const created = await api<{ id: string }>("scenes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Nuevo escenario", templateId: newTemplateId }),
			});
			await reloadList();
			setSelectedId(created.id);
			setNotice({ type: "success", message: "Escenario creado" });
		} catch (error) {
			setNotice({
				type: "error",
				message: error instanceof Error ? error.message : "Error al crear",
			});
		} finally {
			setBusy(false);
		}
	};

	const setHome = async () => {
		if (!selectedId) return;
		await api("scene-home", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: selectedId }),
		});
		await reloadList();
		setNotice({ type: "success", message: "Marcado como escenario principal" });
	};

	const doExport = async () => {
		if (!selectedId) return;
		const data = await api<{ json: string }>(
			`scene-export?id=${encodeURIComponent(selectedId)}`,
		);
		const blob = new Blob([data.json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${draft?.slug ?? "scene"}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const doImport = async () => {
		if (!importText.trim()) return;
		setBusy(true);
		try {
			const created = await api<{ id: string }>("scene-import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ json: importText }),
			});
			setImportText("");
			await reloadList();
			setSelectedId(created.id);
			setNotice({ type: "success", message: "JSON importado" });
		} catch (error) {
			setNotice({
				type: "error",
				message: error instanceof Error ? error.message : "Import falló",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="max-w-[1400px]">
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-kumo-default">Editor de escenarios</h1>
					<p className="mt-1 text-sm text-kumo-subtle">
						{isMobileEditor
							? "Modo móvil: interacciones y ajustes rápidos. Usa escritorio para pintar el mapa."
							: "Diseña suelo, muros y adornos con arte Essentials. Publica para el home."}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<select
						className="h-9 rounded-lg border border-kumo-line bg-kumo-elevated px-2 text-sm"
						value={newTemplateId}
						onChange={(e) => setNewTemplateId(e.target.value as SceneTemplateId)}
						aria-label="Plantilla de escenario"
					>
						{(Object.keys(SCENE_TEMPLATE_LABELS) as SceneTemplateId[]).map((id) => (
							<option key={id} value={id}>
								{SCENE_TEMPLATE_LABELS[id]}
							</option>
						))}
					</select>
					<Button type="button" onClick={() => void create()} disabled={busy}>
						Nuevo
					</Button>
					<Button type="button" onClick={() => void save()} loading={busy}>
						Guardar
					</Button>
					<Button type="button" variant="primary" onClick={() => void publish()} loading={busy}>
						Publicar
					</Button>
					<Button type="button" onClick={() => void setHome()} disabled={!selectedId}>
						Usar en home
					</Button>
					<Button type="button" onClick={() => void doExport()} disabled={!selectedId}>
						Exportar
					</Button>
					<a
						className="inline-flex h-9 items-center rounded-lg border border-kumo-line px-3 text-sm"
						href="/"
						target="_blank"
						rel="noreferrer"
					>
						Preview
					</a>
				</div>
			</div>

			{notice && (
				<Banner
					className="mb-4"
					variant={notice.type === "error" ? "error" : "default"}
					description={notice.message}
				/>
			)}

			<div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
				<section className="rounded-lg border border-kumo-line bg-kumo-base p-3">
					<h2 className="mb-2 text-sm font-semibold">Escenarios</h2>
					<ul className="space-y-1">
						{scenes.map((scene) => (
							<li key={scene.id}>
								<button
									type="button"
									className={`w-full rounded px-2 py-1.5 text-left text-sm ${
										selectedId === scene.id
											? "bg-kumo-brand/15 text-kumo-default"
											: "hover:bg-kumo-elevated"
									}`}
									onClick={() => setSelectedId(scene.id)}
								>
									<div className="font-medium">{scene.name}</div>
									<div className="text-xs text-kumo-subtle">
										{scene.status}
										{scene.isHome ? " · home" : ""}
									</div>
								</button>
							</li>
						))}
					</ul>
					<button
						type="button"
						className="mt-3 text-xs text-kumo-subtle underline"
						onClick={() => setShowImport((v) => !v)}
					>
						{showImport ? "Ocultar import" : "Importar JSON"}
					</button>
					{showImport && (
						<div className="mt-2 space-y-2">
							<textarea
								className="h-24 w-full rounded border border-kumo-line bg-kumo-elevated p-2 font-mono text-xs"
								value={importText}
								onChange={(e) => setImportText(e.target.value)}
								placeholder='{"id":"..."}'
							/>
							<Button type="button" onClick={() => void doImport()} disabled={busy}>
								Importar
							</Button>
						</div>
					)}
				</section>

				{draft ? (
					<SceneEditor draft={draft} routes={routes} onChange={setDraft} />
				) : (
					<p className="text-sm text-kumo-subtle">Selecciona un escenario</p>
				)}
			</div>
		</div>
	);
}

export const pages = {
	"/scenes": ScenesPage,
};
