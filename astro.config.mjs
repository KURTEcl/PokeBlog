import node from "@astrojs/node";
import react from "@astrojs/react";
import auditLog from "@emdash-cms/plugin-audit-log";
import { pokemonTcgPlugin } from "@poke-emdash/plugin-pokemon-tcg";
import { themeSettingsPlugin } from "@poke-emdash/plugin-theme-settings";
import { sceneBuilderPlugin } from "@poke-emdash/plugin-scene-builder";
import { defineConfig, fontProviders, passthroughImageService } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

const siteUrl = import.meta.env.DEV ? "http://localhost:4321" : "https://tcg.kurte.cl";

export default defineConfig({
	site: siteUrl,
	output: "server",
	security: {
		allowedDomains: [{ hostname: "tcg.kurte.cl", protocol: "https" }],
	},
	adapter: node({
		mode: "standalone",
	}),
	image: {
		service: passthroughImageService(),
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			siteUrl,
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [
				auditLog,
				themeSettingsPlugin(),
				pokemonTcgPlugin(),
				sceneBuilderPlugin(),
			],
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Space Grotesk",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
