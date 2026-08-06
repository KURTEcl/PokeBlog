import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	createPokemonRoomScene,
	DESKTOP_SCENE_ZOOM,
	MOBILE_SCENE_ZOOM,
	type ContentTarget,
	type PanelContent,
	type SceneDefinition,
} from "@poke-emdash/scene-core";
import { loadPanelContent } from "./contentAdapters";
import { createPhaserAdapter } from "./phaserAdapter";
import {
	readSceneDebugEnabled,
	readSceneDebugZoom,
	SCENE_DEBUG_ZOOM_LEVELS,
	writeSceneDebugEnabled,
	writeSceneDebugZoom,
	type SceneDebugZoom,
} from "./sceneDebug";
import { playSceneSfx, SCENE_SFX } from "./sceneAudio";
import SceneLoader from "./SceneLoader";
import { DEFAULT_SCENE_LOADING } from "./sceneLoading";
import { useVisualViewport } from "./useVisualViewport";

const MIN_SCENE_LOAD_MS = 2200;

type PadDir = "up" | "down" | "left" | "right";

type Props = {
	initialScene?: SceneDefinition | null;
};

export default function SceneHome({ initialScene = null }: Props) {
	const hostRef = useRef<HTMLDivElement>(null);
	const controlsRef = useRef<HTMLDivElement>(null);
	const adapterRef = useRef<ReturnType<typeof createPhaserAdapter> | null>(null);
	const padHeldRef = useRef(new Set<PadDir>());
	const [scene] = useState<SceneDefinition>(
		() => initialScene ?? createPokemonRoomScene(),
	);
	const [panel, setPanel] = useState<PanelContent | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const [loadingPanel, setLoadingPanel] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [touchControls, setTouchControls] = useState(() => {
		if (typeof window === "undefined") return false;
		return (
			window.matchMedia("(pointer: coarse)").matches ||
			window.matchMedia("(max-width: 720px)").matches
		);
	});
	const [sceneDebug, setSceneDebug] = useState(() => readSceneDebugEnabled());
	const [debugZoom, setDebugZoom] = useState<SceneDebugZoom>(() =>
		readSceneDebugZoom(DESKTOP_SCENE_ZOOM),
	);
	const [sceneReady, setSceneReady] = useState(false);
	const visualViewport = useVisualViewport();
	const panelOpenRef = useRef(false);
	const loadingPanelRef = useRef(false);
	panelOpenRef.current = panelOpen;
	loadingPanelRef.current = loadingPanel;

	const sceneScale = touchControls
		? MOBILE_SCENE_ZOOM
		: sceneDebug
			? debugZoom
			: DESKTOP_SCENE_ZOOM;

	const applySceneScale = useCallback(() => {
		adapterRef.current?.setScaleMultiplier(sceneScale);
	}, [sceneScale]);

	const toggleSceneDebug = useCallback(() => {
		setSceneDebug((prev) => {
			const next = !prev;
			writeSceneDebugEnabled(next);
			return next;
		});
	}, []);

	const selectDebugZoom = useCallback((zoom: SceneDebugZoom) => {
		setDebugZoom(zoom);
		writeSceneDebugZoom(zoom);
	}, []);

	const closePanel = () => {
		if (!panelOpenRef.current) return;
		setPanelOpen(false);
		adapterRef.current?.resume();
		if (history.state?.scenePanel) {
			history.pushState({}, "", "/");
		} else if (window.location.pathname !== "/") {
			history.pushState({}, "", "/");
		}
	};

	const openTarget = async (target: ContentTarget, title?: string) => {
		if (panelOpenRef.current || loadingPanelRef.current) return;
		loadingPanelRef.current = true;
		setLoadingPanel(true);
		setError(null);
		try {
			const content = await loadPanelContent(target);
			if (panelOpenRef.current) return;
			if (title) content.title = title;
			setPanel(content);
			setPanelOpen(true);
			playSceneSfx(SCENE_SFX.menuOpen);
			adapterRef.current?.pause();
			const url = content.canonicalUrl;
			if (url && url !== window.location.pathname) {
				history.pushState({ scenePanel: true, url }, "", url);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo abrir el contenido");
		} finally {
			loadingPanelRef.current = false;
			setLoadingPanel(false);
		}
	};

	const dismissMenu = () => {
		if (panelOpenRef.current) closePanel();
	};

	useLayoutEffect(() => {
		document.getElementById("scene-boot-loader")?.remove();
	}, []);

	useEffect(() => {
		window.dispatchEvent(new Event("resize"));
	}, [visualViewport.height, visualViewport.offsetTop]);

	useEffect(() => {
		const mqCoarse = window.matchMedia("(pointer: coarse)");
		const mqNarrow = window.matchMedia("(max-width: 720px)");
		const update = () => {
			setTouchControls(mqCoarse.matches || mqNarrow.matches);
		};
		update();
		mqCoarse.addEventListener("change", update);
		mqNarrow.addEventListener("change", update);
		return () => {
			mqCoarse.removeEventListener("change", update);
			mqNarrow.removeEventListener("change", update);
		};
	}, []);

	useEffect(() => {
		applySceneScale();
	}, [applySceneScale]);

	useEffect(() => {
		if (touchControls) return;
		const onKey = (event: KeyboardEvent) => {
			if (panelOpenRef.current) return;
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}
			if (event.key === "`" || (event.key === "d" && event.shiftKey && event.ctrlKey)) {
				event.preventDefault();
				toggleSceneDebug();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [touchControls, toggleSceneDebug]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		setSceneReady(false);
		const loadStarted = Date.now();

		const adapter = createPhaserAdapter({
			onInteract: (target, title) => {
				void openTarget(target, title);
			},
			onDismissMenu: dismissMenu,
		});
		adapterRef.current = adapter;
		const finishLoading = () => {
			const wait = Math.max(0, MIN_SCENE_LOAD_MS - (Date.now() - loadStarted));
			const timer = window.setTimeout(() => setSceneReady(true), wait);
			return () => window.clearTimeout(timer);
		};
		let clearLoadTimer: (() => void) | undefined;

		void adapter
			.mount(host, scene)
			.then(() => {
				adapter.setScaleMultiplier(sceneScale);
				clearLoadTimer = finishLoading();
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al montar Phaser");
				clearLoadTimer = finishLoading();
			});

		const onKey = (event: KeyboardEvent) => {
			if (!panelOpenRef.current) return;
			if (
				event.key === "Escape" ||
				event.key === "b" ||
				event.key === "B" ||
				event.key === "Backspace"
			) {
				event.preventDefault();
				dismissMenu();
			}
		};
		const onPop = () => {
			if (window.location.pathname === "/") closePanel();
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("popstate", onPop);

		return () => {
			clearLoadTimer?.();
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("popstate", onPop);
			adapter.destroy();
			adapterRef.current = null;
			setSceneReady(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per scene id
	}, [scene.id]);

	const syncPad = useCallback(() => {
		const held = padHeldRef.current;
		let x = 0;
		let y = 0;
		if (held.has("left")) x = -1;
		else if (held.has("right")) x = 1;
		if (held.has("up")) y = -1;
		else if (held.has("down")) y = 1;

		if (panelOpenRef.current && (x !== 0 || y !== 0)) {
			held.clear();
			controlsRef.current
				?.querySelectorAll<HTMLElement>(".gba-dpad__btn.is-pressed")
				.forEach((btn) => btn.classList.remove("is-pressed"));
			adapterRef.current?.setPad(0, 0);
			dismissMenu();
			return;
		}

		adapterRef.current?.setPad(x, y);
		if (x !== 0 || y !== 0) adapterRef.current?.tickPad();
	}, []);

	const pressPad = useCallback(
		(dir: PadDir, btn: HTMLButtonElement) => {
			padHeldRef.current.add(dir);
			btn.classList.add("is-pressed");
			adapterRef.current?.unlockAudio();
			syncPad();
		},
		[syncPad],
	);

	const releasePad = useCallback(
		(dir: PadDir, btn: HTMLButtonElement) => {
			padHeldRef.current.delete(dir);
			btn.classList.remove("is-pressed");
			syncPad();
		},
		[syncPad],
	);

	const bindPadDir = useCallback(
		(dir: PadDir) => ({
			onTouchStart: (event: React.TouchEvent<HTMLButtonElement>) => {
				event.preventDefault();
				event.stopPropagation();
				pressPad(dir, event.currentTarget);
			},
			onTouchEnd: (event: React.TouchEvent<HTMLButtonElement>) => {
				event.preventDefault();
				event.stopPropagation();
				releasePad(dir, event.currentTarget);
			},
			onTouchCancel: (event: React.TouchEvent<HTMLButtonElement>) => {
				releasePad(dir, event.currentTarget);
			},
			onContextMenu: (event: React.SyntheticEvent) => {
				event.preventDefault();
			},
		}),
		[pressPad, releasePad],
	);

	const fireFace = useCallback((action: () => void) => {
		adapterRef.current?.unlockAudio();
		action();
	}, []);

	useLayoutEffect(() => {
		if (!touchControls) return;
		const el = controlsRef.current;
		if (!el) return;
		const block = (event: Event) => event.preventDefault();
		el.addEventListener("selectstart", block);
		el.addEventListener("contextmenu", block);
		return () => {
			el.removeEventListener("selectstart", block);
			el.removeEventListener("contextmenu", block);
		};
	}, [touchControls]);

	useLayoutEffect(() => {
		if (!touchControls) return;
		const held = padHeldRef.current;
		let frame = 0;
		const pump = () => {
			if (held.size > 0) syncPad();
			frame = requestAnimationFrame(pump);
		};
		frame = requestAnimationFrame(pump);
		return () => {
			cancelAnimationFrame(frame);
			held.clear();
			adapterRef.current?.setPad(0, 0);
		};
	}, [touchControls, syncPad]);

	return (
		<div
			className="scene-shell"
			style={{
				top: visualViewport.offsetTop,
				height: visualViewport.height,
			}}
		>
			<div className={`scene-canvas-host ${sceneReady ? "is-ready" : ""}`} ref={hostRef}>
				{!sceneReady && <SceneLoader config={DEFAULT_SCENE_LOADING} />}
				{!touchControls && sceneDebug && (
					<div className="scene-debug-bar" aria-label="Zoom de escena (debug)">
						<span className="scene-debug-bar__label">DEBUG</span>
						<div className="scene-debug-bar__zooms" role="group" aria-label="Escala">
							{SCENE_DEBUG_ZOOM_LEVELS.map((level) => (
								<button
									key={level}
									type="button"
									className={debugZoom === level ? "is-active" : ""}
									aria-pressed={debugZoom === level}
									onClick={() => selectDebugZoom(level)}
								>
									×{level}
								</button>
							))}
						</div>
						<button
							type="button"
							className="scene-debug-bar__close"
							aria-label="Salir de debug"
							onClick={toggleSceneDebug}
						>
							×
						</button>
					</div>
				)}
			</div>

			{touchControls && (
				<div
					ref={controlsRef}
					className="scene-controls-bar"
					aria-label="Controles del escenario"
				>
					<div className="gba-dpad" role="group" aria-label="D-pad">
						<button
							type="button"
							className="gba-dpad__btn gba-dpad__btn--up"
							aria-label="Arriba"
							{...bindPadDir("up")}
						/>
						<button
							type="button"
							className="gba-dpad__btn gba-dpad__btn--left"
							aria-label="Izquierda"
							{...bindPadDir("left")}
						/>
						<span className="gba-dpad__center" aria-hidden="true" />
						<button
							type="button"
							className="gba-dpad__btn gba-dpad__btn--right"
							aria-label="Derecha"
							{...bindPadDir("right")}
						/>
						<button
							type="button"
							className="gba-dpad__btn gba-dpad__btn--down"
							aria-label="Abajo"
							{...bindPadDir("down")}
						/>
					</div>
					<div className="gba-face-buttons" role="group" aria-label="Botones de acción">
						<button
							type="button"
							className="gba-btn gba-btn--b"
							aria-label="Cancelar"
							onTouchStart={(event) => {
								event.preventDefault();
								event.stopPropagation();
								fireFace(dismissMenu);
							}}
							onContextMenu={(event) => event.preventDefault()}
						/>
						<button
							type="button"
							className="gba-btn gba-btn--a"
							aria-label="Acción"
							onTouchStart={(event) => {
								event.preventDefault();
								event.stopPropagation();
								fireFace(() => {
									if (panelOpenRef.current) return;
									adapterRef.current?.tryAction();
								});
							}}
							onContextMenu={(event) => event.preventDefault()}
						/>
					</div>
				</div>
			)}

			{error && (
				<div className="scene-error" role="alert">
					{error}
				</div>
			)}

			<div
				className={`scene-panel ${panelOpen ? "is-open" : ""}`}
				role="dialog"
				aria-modal={panelOpen}
				aria-label={panel?.title ?? "Contenido"}
				hidden={!panelOpen}
			>
				<header className="scene-panel-header">
					<h2>{loadingPanel ? "Cargando…" : panel?.title}</h2>
					<button type="button" onClick={dismissMenu} aria-label="Cancelar panel">
						Cancelar
					</button>
				</header>
				<div className="scene-panel-body">
					{panel?.items && (panel.kind === "route-list" || panel.kind === "link") && (
						<ul className="scene-panel-list">
							{panel.items.map((item: { title: string; href: string; summary?: string }) => (
								<li key={item.href}>
									<a href={item.href}>{item.title}</a>
									{item.summary && <p>{item.summary}</p>}
								</li>
							))}
						</ul>
					)}
					{panel?.canonicalUrl && (
						<p className="scene-panel-canonical">
							<a href={panel.canonicalUrl}>Abrir página completa</a>
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
