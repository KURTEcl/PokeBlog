import type { AssetLicense } from "./types.js";

/** Pokémon Essentials / Nintendo-derived art — local install only, never redistribute. */
export const licenseEssentials: AssetLicense = {
	name: "Proprietary — Pokémon Essentials (local)",
	author: "Pokémon Essentials / Nintendo-derived",
	sourceName: "Pokémon Essentials dump in recursos/",
	attributionRequired: true,
	attributionText:
		"Pokémon Essentials graphics are for local development only. Do not redistribute.",
	commercialUseAllowed: false,
	modificationsAllowed: false,
	shareAlike: false,
	distributionPolicy: "local-install-required",
};
