# PokeBlog — agent guide

## What this is

Installable [EmDash](https://emdashcms.com) + Astro monorepo for a **Pokémon TCG** blog with an interactive Phaser 4 home room. Not a multi-TCG platform.

## Workspace

- Open repository root `PokeBlog/` (not `~/Documents/Develop`).
- App lives at repo root (`astro.config.mjs`, `src/`, `seed/`).
- Workspace packages: `packages/*`.
- Local Essentials dump: `recursos/` (gitignored).

## Required packages

Register all of these in `astro.config.mjs` → `emdash({ plugins: [...] })`:

| Package | Plugin id |
| --- | --- |
| `@poke-emdash/plugin-theme-settings` | `theme-settings` |
| `@poke-emdash/plugin-pokemon-tcg` | `pokemon-tcg` |
| `@poke-emdash/plugin-scene-builder` | `scene-builder` |
| `@poke-emdash/scene-core` | (library) |

Do not remove the scene home or required plugins to “simplify” without an explicit user request.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm test         # scene-core
pnpm typecheck
```

Admin: `/_emdash/admin`  
Scene editor: `/_emdash/admin/plugins/scene-builder/scenes`

## Key paths

| Path | Purpose |
| --- | --- |
| `seed/seed.json` | CMS schema + sample content |
| `src/pages/index.astro` | Phaser home |
| `src/components/scene/` | Runtime (Phaser adapter, side panel) |
| `packages/scene-core/` | Types, pathfinding, `createPokemonRoomScene` |
| `packages/plugin-scene-builder/` | Admin + public-home API |
| `packages/plugin-pokemon-tcg/` | Decklists / results / PT blocks |
| `public/scene-assets/` | Demo CC art + essentials/ (local) |
| `docs/ASSETS.md` | BYO Essentials copy map |
| `docs/POKE_CENTER.md` | Home Pokémon Center grid (reference room) |
| `scripts/essentials-manifest.json` | Import manifest (tilesets, props, presets) |
| `packages/scene-core/src/essentials-catalog.ts` | Typed floor/wall/prop catalog |
| `packages/scene-core/src/charset.ts` | Charset frame layout (4 dirs × 4 frames) |

## Naming (English)

Plugins, variables, files, seed **slugs**, and routes: **English**.

- `createPokemonRoomScene`, `/asset-credits`, `tournaments`, `analysis`
- Spanish only in **UI copy** (labels, menu text, hints) when the site is ES

## Assets policy

- Never commit `recursos/` or Essentials PNGs (`public/scene-assets/essentials/`).
- After install, run `pnpm import:essentials` (auto on postinstall when `recursos/` exists).
- Follow `docs/ASSETS.md`.

## Home / Phaser

- Fullscreen, no page scroll; **full room** visible with **integer letterbox scale** (crisp pixels).
- Blog sections open in a **side panel** from room interactions.
- Controls: WASD / arrows, on-screen D-pad, Space/Enter action, click/touch pathfinding.
- Movement: discrete tile steps; charset walk animation (Essentials 32×48, 4 directions).
- Depth: Y-sort by feet row — player walks behind tall props.
- Phaser **4.x** (`phaser` dependency). Keep adapter API in `phaserAdapter.ts`.

## EmDash rules

- CMS pages are server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are `{ src, alt }` objects; use `<Image image={...} />` from `emdash/ui`.
- Prefer **emdash-docs** MCP / Context7 over training data for EmDash APIs.
- `entry.id` = slug; `entry.data.id` = DB ULID.

## Agent hygiene

- Prefer Serena symbol tools before opening whole files.
- Do not scan `node_modules/` or lockfiles.
- Minimal diffs; match existing style.
- Read `.cursor/rules/` before large changes.
