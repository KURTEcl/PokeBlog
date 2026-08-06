import type { ContentPanelAdapter, ContentTarget, PanelContent } from "@poke-emdash/scene-core";

const LABELS: Record<string, string> = {
	"/posts": "Artículos del blog",
	"/decklists": "Decklists Pokémon",
	"/results": "Resultados de torneos",
	"/search": "Buscar en el sitio",
	"/asset-credits": "Créditos de assets",
};

async function fetchRouteSummary(path: string): Promise<PanelContent> {
	const title = LABELS[path] ?? path;
	const canonicalUrl = path;

	if (path === "/posts") {
		try {
			const res = await fetch("/posts");
			const html = await res.text();
			const items = [...html.matchAll(/href="(\/posts\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)/gi)]
				.slice(0, 8)
				.map((m) => ({ href: m[1]!, title: m[2]!.trim() }));
			if (items.length) {
				return { title, canonicalUrl, kind: "route-list", items };
			}
		} catch {
			/* fall through */
		}
	}

	return {
		title,
		canonicalUrl,
		kind: "link",
		externalUrl: path,
		items: [{ title: `Abrir ${title}`, href: path, summary: "Vista completa del contenido" }],
	};
}

export const routeAdapter: ContentPanelAdapter = {
	canHandle(target) {
		return target.type === "internal-route";
	},
	getCanonicalUrl(target) {
		return target.type === "internal-route" ? target.path : "/";
	},
	async load(target) {
		if (target.type !== "internal-route") {
			throw new Error("unsupported");
		}
		return fetchRouteSummary(target.path);
	},
};

export const adapters: ContentPanelAdapter[] = [routeAdapter];

export async function loadPanelContent(target: ContentTarget): Promise<PanelContent> {
	const adapter = adapters.find((a) => a.canHandle(target));
	if (!adapter) {
		if (target.type === "external-url") {
			return {
				title: "Enlace externo",
				canonicalUrl: target.url,
				kind: "link",
				externalUrl: target.url,
				items: [{ title: "Abrir enlace", href: target.url }],
			};
		}
		throw new Error("No hay adaptador para este destino");
	}
	return adapter.load(target);
}
