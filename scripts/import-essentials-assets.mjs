/**
 * Import Pokémon Essentials graphics from ./recursos into public/scene-assets/essentials/.
 * Driven by scripts/essentials-manifest.json — emits catalog.json for admin previews.
 *
 * Run: node scripts/import-essentials-assets.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "scripts/essentials-manifest.json");
const PE_ROOT = path.join(ROOT, "recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main/Graphics");
const PE_AUDIO_ROOT = path.join(
	ROOT,
	"recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main/Audio",
);
const OUT = path.join(ROOT, "public/scene-assets/essentials");

if (!fs.existsSync(PE_ROOT)) {
	console.warn(
		"[import-essentials] Skip: recursos/Pokemon-Essentials-... not found.\n" +
			"  Place the Essentials dump under recursos/ and run: pnpm import:essentials",
	);
	process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const T = manifest.tileSize;
const COLS = manifest.columns;

const dirs = {
	tiles: path.join(OUT, "tiles"),
	player: path.join(OUT, "player"),
	objects: path.join(OUT, "objects"),
	audio: path.join(OUT, "audio"),
	ui: path.join(OUT, "ui"),
};
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });

function pe(...parts) {
	return path.join(PE_ROOT, ...parts);
}

function peAudio(...parts) {
	return path.join(PE_AUDIO_ROOT, ...parts);
}

async function copyFile(src, dest) {
	await fs.promises.copyFile(src, dest);
	console.log("copy", path.relative(ROOT, dest));
}

async function crop(src, dest, region) {
	await sharp(src).ensureAlpha().extract(region).png().toFile(dest);
	console.log("crop", path.basename(dest), `${region.width}x${region.height}`);
}

/** Collect non-empty, non-redX tile indices for ornament library. */
async function scanArtTiles(src, rows) {
	const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const art = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < COLS; c++) {
			let opaque = 0;
			let red = 0;
			let white = 0;
			for (let y = 0; y < T; y++) {
				for (let x = 0; x < T; x++) {
					const i = ((r * T + y) * info.width + (c * T + x)) * 4;
					const R = data[i];
					const G = data[i + 1];
					const B = data[i + 2];
					const A = data[i + 3];
					if (A < 16) continue;
					opaque++;
					if (R > 200 && G > 200 && B > 200) white++;
					if (R > 180 && G < 100 && B < 100) red++;
				}
			}
			if (opaque < 40) continue;
			if (white > 150 && red > 40) continue; // red-X placeholder
			art.push(r * COLS + c);
		}
	}
	return art;
}

const tilesetSources = new Map();
const tileLibrary = {};

for (const ts of manifest.tilesets) {
	const src = pe(ts.source);
	const dest = path.join(OUT, ts.dest);
	await copyFile(src, dest);
	tilesetSources.set(ts.id, src);
	const maxRows = Math.min(ts.rows, ts.id === "outside" ? 80 : ts.rows);
	tileLibrary[ts.id] = await scanArtTiles(src, maxRows);
	console.log(`library ${ts.id}: ${tileLibrary[ts.id].length} art tiles`);
}

for (const player of manifest.players) {
	await copyFile(pe(player.source), path.join(OUT, player.dest));
}

if (Array.isArray(manifest.ui)) {
	for (const asset of manifest.ui) {
		await copyFile(pe(asset.source), path.join(OUT, asset.dest));
	}
}

for (const prop of manifest.props) {
	const src = tilesetSources.get(prop.sourceTileset);
	if (!src) {
		console.warn(`skip prop ${prop.id}: unknown tileset ${prop.sourceTileset}`);
		continue;
	}
	await crop(src, path.join(OUT, prop.dest), {
		left: prop.col * T,
		top: prop.row * T,
		width: prop.wTiles * T,
		height: prop.hTiles * T,
	});
}

const importedAudio = [];
if (Array.isArray(manifest.audio) && fs.existsSync(PE_AUDIO_ROOT)) {
	for (const clip of manifest.audio) {
		const src = peAudio(clip.source);
		const dest = path.join(OUT, clip.dest);
		if (!fs.existsSync(src)) {
			console.warn(`skip audio ${clip.id}: ${clip.source} not found`);
			continue;
		}
		await copyFile(src, dest);
		importedAudio.push({
			id: clip.id,
			url: `/scene-assets/essentials/${clip.dest}`,
		});
	}
} else if (Array.isArray(manifest.audio)) {
	console.warn("[import-essentials] Audio folder missing — skip SFX import");
}

const catalog = {
	version: manifest.version,
	tileSize: manifest.tileSize,
	columns: manifest.columns,
	baseUrl: "/scene-assets/essentials",
	tilesets: manifest.tilesets.map((ts) => ({
		id: ts.id,
		name: ts.name,
		imageUrl: `/scene-assets/essentials/${ts.dest}`,
		tileSize: manifest.tileSize,
		columns: manifest.columns,
		tileCount: manifest.columns * ts.rows,
	})),
	players: manifest.players.map((p) => ({
		id: p.id,
		name: p.name,
		imageUrl: `/scene-assets/essentials/${p.dest}`,
		frameWidth: 32,
		frameHeight: 48,
		columns: 4,
		rows: 4,
	})),
	props: manifest.props.map((p) => ({
		id: p.id,
		name: p.name,
		imageUrl: `/scene-assets/essentials/${p.dest}`,
		sourceTileset: p.sourceTileset,
		col: p.col,
		row: p.row,
		wTiles: p.wTiles,
		hTiles: p.hTiles,
		tags: p.tags,
		collision: p.collision,
	})),
	audio: importedAudio,
	ui: Array.isArray(manifest.ui)
		? manifest.ui.map((u) => ({
				id: u.id,
				name: u.name,
				imageUrl: `/scene-assets/essentials/${u.dest}`,
			}))
		: [],
	tileLibrary,
};

await fs.promises.writeFile(
	path.join(OUT, "catalog.json"),
	JSON.stringify(catalog, null, 2),
	"utf8",
);
console.log("wrote", path.relative(ROOT, path.join(OUT, "catalog.json")));

/** FR/LG-style assembled room from recursos/tileset-juego (16px → 32px). */
const ROOM_SRC = path.join(ROOT, "recursos/tileset-juego/pokemoncenter.png");
const ROOM_DEST = path.join(OUT, "rooms/poke-center.png");
if (fs.existsSync(ROOM_SRC)) {
	fs.mkdirSync(path.dirname(ROOM_DEST), { recursive: true });
	const meta = await sharp(ROOM_SRC).metadata();
	const w = meta.width ?? 240;
	const h = meta.height ?? 160;
	await sharp(ROOM_SRC)
		.resize(w * 2, h * 2, { kernel: sharp.kernel.nearest })
		.png()
		.toFile(ROOM_DEST);
	console.log("room", path.relative(ROOT, ROOM_DEST), `${w * 2}x${h * 2}`);
} else {
	console.warn("[import-essentials] No recursos/tileset-juego/pokemoncenter.png — skip room backdrop");
}

console.log("\nEssentials import complete → public/scene-assets/essentials/");
