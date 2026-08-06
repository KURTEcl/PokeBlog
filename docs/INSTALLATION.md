# Installation guide

PokeBlog is a Pokémon TCG blog on [EmDash](https://emdashcms.com) with an interactive Phaser 4 home room. This guide covers a fresh install from clone to running site.

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 22+ |
| pnpm | 11+ |
| Git | any recent |

Optional but required for the interactive home scene:

- A local copy of [Pokémon Essentials 21 with Unofficial EBDX](https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX) (see [Asset integration](#asset-integration) below).

## 1. Clone the repository

```bash
git clone <your-git-remote> PokeBlog
cd PokeBlog
```

## 2. Install dependencies

```bash
pnpm install
```

If `recursos/` is already present (step 3), `postinstall` runs `pnpm import:essentials` automatically.

## 3. Integrate Pokémon Essentials assets

**These graphics are not included in this repository.** You must obtain them separately and place them under `recursos/` before the home scene can load.

### Download the asset pack

Clone or download:

**https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX**

### Expected folder layout

The import script looks for this path (folder name must match the GitHub archive):

```text
PokeBlog/
  recursos/
    Pokemon-Essentials-21-With-Unofficial-EBDX-main/
      Graphics/
        Tilesets/
        Characters/
        UI/
      Audio/          # optional — scene SFX
```

Example:

```bash
cd PokeBlog
mkdir -p recursos
git clone --depth 1 \
  https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX.git \
  recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main
```

### Optional: home room backdrop

For the pre-built Poké Center backdrop (`essentials/rooms/poke-center.png`), add:

```text
recursos/tileset-juego/pokemoncenter.png
```

Without it, tilesets, player sprites, props, and UI still import; only the assembled room image is skipped.

### Run the import

```bash
pnpm import:essentials
```

Output (gitignored): `public/scene-assets/essentials/` plus `catalog.json` for the admin scene editor.

Details and path mapping: [docs/ASSETS.md](./ASSETS.md).

## 4. Environment variables

Copy the example file and generate EmDash secrets:

```bash
cp .env.example .env
pnpm exec emdash secrets generate --write .env
```

`.env` is gitignored. Never commit it.

For production, set the public site URL in `astro.config.mjs` (`site` / `siteUrl`) to your domain.

## 5. Development

```bash
pnpm dev
```

| URL | Purpose |
| --- | --- |
| http://localhost:4321 | Public site (Phaser home) |
| http://localhost:4321/_emdash/admin | EmDash admin |
| http://localhost:4321/_emdash/admin/plugins/scene-builder/scenes | Scene editor |

First admin user: follow the EmDash setup prompt in the admin UI.

## 6. Production build

```bash
pnpm build
pnpm start
```

Runs the Node standalone server from `dist/server/entry.mjs` (default port from `PORT`, often 4321).

### Data and uploads

| Path | Purpose |
| --- | --- |
| `data.db` | SQLite CMS database (gitignored) |
| `uploads/` | Media storage (gitignored) |

Back up both before major upgrades.

## 7. Verify the home scene

1. Confirm `public/scene-assets/essentials/catalog.json` exists after import.
2. Open `/` — you should see the Poké Center room with WASD / touch controls.
3. Open `/asset-credits` for license attribution.

If images 404, re-check `recursos/` layout and run `pnpm import:essentials` again.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `[import-essentials] Skip: recursos/... not found` | Clone Essentials into `recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main/` |
| Home loads but tiles/sprites missing | Run `pnpm import:essentials`; check browser network tab for `/scene-assets/essentials/` |
| `EMDASH_ENCRYPTION_KEY` errors | Run `pnpm exec emdash secrets generate --write .env` |
| Type errors after pull | `pnpm install && pnpm typecheck` |

## Legal note

Pokémon Essentials and Nintendo-derived art must stay on your machine. Do not commit `recursos/` or `public/scene-assets/essentials/` to git. See [docs/ASSET_LICENSES.md](./ASSET_LICENSES.md) and `/asset-credits`.
