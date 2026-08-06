# PokeBlog

Pokémon TCG blog on [EmDash](https://emdashcms.com) with an interactive **Phaser 4** home: walk a Poké Center room, interact with objects, and open blog sections in a side panel.

## Requirements

- Node.js 22+
- pnpm 11+
- [Pokémon Essentials 21 with Unofficial EBDX](https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX) — **BYO** scene graphics (not shipped in this repo)

## Quick start

```bash
git clone <repo-url> PokeBlog
cd PokeBlog
pnpm install

# Bring your own Essentials dump (see below)
mkdir -p recursos
git clone --depth 1 \
  https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX.git \
  recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main

pnpm import:essentials
cp .env.example .env
pnpm exec emdash secrets generate --write .env
pnpm dev
```

| URL | Purpose |
| --- | --- |
| http://localhost:4321 | Public site |
| http://localhost:4321/_emdash/admin | CMS admin |

**Full install guide:** [docs/INSTALLATION.md](docs/INSTALLATION.md)

## Asset integration

Scene art comes from the Essentials pack above. The import script copies tilesets, player charsets, props, and UI controls into `public/scene-assets/essentials/` (gitignored).

```text
recursos/Pokemon-Essentials-21-With-Unofficial-EBDX-main/Graphics/  →  public/scene-assets/essentials/
```

Run `pnpm import:essentials` after cloning or updating the asset pack. Path map and tile format: [docs/ASSETS.md](docs/ASSETS.md). Licenses: [docs/ASSET_LICENSES.md](docs/ASSET_LICENSES.md) · public page `/asset-credits`.

**Do not commit** `recursos/`, `public/scene-assets/essentials/`, `.env`, or `data.db`.

## Features

| Area | What |
| --- | --- |
| Home | Fullscreen Poké Center room (Essentials art) |
| Side panel | Posts, decklists, results without leaving the room |
| Admin | Scene editor, player presets, decklists / archetypes / tournaments |
| Blog | Posts, decklists, tournament results, analysis & videos |

## Workspace packages

| Package | Role |
| --- | --- |
| `@poke-emdash/plugin-pokemon-tcg` | Decklists, archetypes, matches, tournaments |
| `@poke-emdash/plugin-theme-settings` | Appearance |
| `@poke-emdash/plugin-scene-builder` | Room editor + public home scene API |
| `@poke-emdash/scene-core` | Scene types, pathfinding, room factory |

## Scripts

```bash
pnpm dev              # dev server
pnpm build && pnpm start   # production
pnpm typecheck
pnpm test             # scene-core unit tests
pnpm import:essentials     # copy Essentials → public/scene-assets/essentials/
```

## Agents

See [AGENTS.md](./AGENTS.md) for conventions when using Cursor / Claude Code.

## Credits

- **Code:** MIT — see [LICENSE](LICENSE)
- **Scene graphics:** [Pokémon Essentials 21 with Unofficial EBDX](https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX) — local use only; not redistributed in this repository. Pokémon / Nintendo assets remain property of their respective owners.

## License

MIT for project code. Art is BYO per [docs/ASSET_LICENSES.md](docs/ASSET_LICENSES.md).
