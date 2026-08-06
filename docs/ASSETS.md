# Scene assets (Pokémon Essentials)

The interactive home uses graphics from **[Pokémon Essentials 21 with Unofficial EBDX](https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX)**. Clone that repository into `recursos/` (see [INSTALLATION.md](./INSTALLATION.md)), then copy files locally with:

```bash
pnpm import:essentials
```

(`postinstall` runs this when `recursos/` exists.)

Output: `public/scene-assets/essentials/` (gitignored — do not commit).  
After import, `public/scene-assets/essentials/catalog.json` lists tilesets, players, props, UI controls, and floor/wall presets for the admin editor.

## Manifest

Import rules live in [`scripts/essentials-manifest.json`](../scripts/essentials-manifest.json). Add tilesets, players, props, or UI assets there, then re-run `pnpm import:essentials`.

## Source → destination

| Use | Essentials path (under `recursos/.../Graphics/`) | Project path |
| --- | --- | --- |
| Poké Center room (RSE palette) | `Tilesets/Poke Centre interior.png` | `essentials/tiles/poke-center-interior.png` |
| Interior general | `Tilesets/Interior general.png` | `essentials/tiles/interior-general.png` |
| Mart interior | `Tilesets/Mart interior.png` | `essentials/tiles/mart-interior.png` |
| Gyms interior | `Tilesets/Gyms interior.png` | `essentials/tiles/gyms-interior.png` |
| Outside | `Tilesets/Outside.png` | `essentials/tiles/outside.png` |
| Boy player | `Characters/trainer_POKEMONTRAINER_Red.png` | `essentials/player/boy-charset.png` |
| Girl player | `Characters/trainer_POKEMONTRAINER_Leaf.png` | `essentials/player/girl-charset.png` |
| Touch D-pad | `UI/Controls help/help_arrows.png` | `essentials/ui/help-arrows.png` |
| Touch Action | `UI/Controls help/help_actionkey.png` | `essentials/ui/help-action.png` |
| Touch Back | `UI/Controls help/help_backkey.png` | `essentials/ui/help-back.png` |

Props (PC, counter, healing machine, mart shelves, gym mat, …) are cropped from tilesets per the manifest for the **admin editor**.

The **home Pokémon Center** does **not** composite those crops. Visual source of truth:

- `recursos/tileset-juego/pokemoncenter.png` → imported as `essentials/rooms/poke-center.png`
- Layout / collisions / entrance mat: [`docs/POKE_CENTER.md`](./POKE_CENTER.md)

Bottom exits use the red **entrance mat** only — not a door sprite.

## Tile format

- Tilesets: 256px wide, **32×32** tiles, **8 columns** (RPG Maker / Essentials).
- Tile index: `row * 8 + col` (0-based, top-left = 0).
- Crop: `{ x: col*32, y: row*32, width: 32, height: 32 }`.

## Character charset

- Sheet: **128×192** px.
- Frame: **32×48** px, **4 columns × 4 rows**.
- Row order (RPG Maker): **down, left, right, up**.
- Columns: stand (0), walk1 (1), walk2 (2), walk3 (3).

Runtime animates walk frames during tile steps; idle uses column 0.

## Display

- Viewport scales to **fill the screen** with integer CSS scale (pixel-perfect).
- Small maps (`fit-room`): whole room visible. Large maps (`follow-player`): camera follows centered player until map edge.
- Player depth sorts by feet row (`tileY`) so the character walks behind counters.
- Tiles and charset use **spritesheet frames** (not `setCrop` on the full sheet).

## Admin

Scene editor:
- **Suelo / Muro** — pick any tile from the full tileset palette (8 columns, 32×32).
- **Adorno** — named furniture shortcuts **or** any tileset cell as ornament.
- **Spawn** — player start tile + facing.
- **Grid resize** — 8–64 tiles per axis.
- **Personaje** — boy / girl.

Tilesets available in palette: Poké Center, Interior general, Mart, Gyms, Outside.

## Legal

Source pack: https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX

Pokémon Essentials / Nintendo-derived art is **local use only**. Do not commit or redistribute PNGs. This repository ships the import script and documentation only.

See also `public/scene-assets/README.md` and [`docs/SCENE_ROOMS.md`](./SCENE_ROOMS.md).
