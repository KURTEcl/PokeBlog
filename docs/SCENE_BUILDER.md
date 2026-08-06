# Scene Builder

Interactive RPG home on top of EmDash content.

## Packages

| Package | Role |
| --- | --- |
| `@poke-emdash/scene-core` | Types, validation, pathfinding, demo room, templates, Essentials catalog |
| `@poke-emdash/plugin-scene-builder` | EmDash plugin: storage, API, visual admin |
| `src/components/scene/*` | Phaser 4 runtime + DOM side panel |

Pokémon TCG plugins (`pokemon-tcg`, `theme-settings`) are unchanged by scene interactions. Interactions only reference routes (`/posts`, `/decklists`, `/results`, `/videos`, …).

## Admin

Admin → **Editor de escenarios**  
`/_emdash/admin/plugins/scene-builder/scenes`

1. Choose a **template** (blank, gym, mart, bedroom, …) and create
2. Set **grid width/height** (8–64 tiles per axis)
3. **Suelo / Muro** — pick any tile from the full tileset palette, paint on the canvas
4. **Adorno** — named furniture **or** any tileset cell; click map to place
5. **Spawn** — place player start position and facing
6. **Seleccionar** — link a blog route or delete
7. **Personaje** — boy / girl
8. Save → Publish → **Usar en home**

**Collisions** are separate from painted walls unless **Muros → colisión** is enabled. Use **Auto-colisión** to rebuild from object footprints only (wipes hand-painted cells).

Switch tileset dropdown (Poké Center / Interior / Mart / Gyms / Outside) to browse all Essentials tiles.

See also [`docs/SCENE_ROOMS.md`](./SCENE_ROOMS.md) for room-type registry and authoring modes.

## Public controls

- **Desktop:** keyboard WASD / arrows, Space or Enter = action; click map = pathfinding
- **Mobile:** on-screen D-pad + A/B (Essentials UI sprites); no keyboard overlay on desktop
- Escape closes the side panel

## Assets

See `docs/ASSETS.md`, `docs/POKE_CENTER.md`, `docs/SCENE_ROOMS.md`, and `docs/ASSET_LICENSES.md`. Public credits: `/asset-credits`.

Home room layout (mat / walls / no door sprite): **`docs/POKE_CENTER.md`**.

Import manifest: `scripts/essentials-manifest.json` → `pnpm import:essentials`.
