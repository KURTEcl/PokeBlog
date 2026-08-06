# Pokémon Center room (home)

Source of truth for the interactive home lobby.

## Canonical reference

| Item | Path |
| --- | --- |
| Assembled room (game pixels) | `recursos/tileset-juego/pokemoncenter.png` |
| Imported runtime art (2×) | `public/scene-assets/essentials/rooms/poke-center.png` (gitignored) |

- Native size: **240×160** → **15×10** tiles at **16×16** (GBA / FR·LG).
- Runtime: scaled **nearest-neighbor 2×** → **480×320** → same **15×10** grid at **32×32** (matches Essentials tile size).
- The PNG is the **complete** interior (walls, floor emblem, counter, heal machine, PC, plant, shelf, escalator, table, stools, entrance mat). Do **not** overlay Essentials prop crops on this room — they are a different art style (RSE tileset) and caused the “cut ornaments” bugs.

Import: `pnpm import:essentials` copies/scales the reference when present.

## Collision map (runtime)

Authored in `demo-scene.ts` `COLLISION_MAP` (must stay length 15 per row):

```
###############  0 wall
###############  1 wall décor
#...#######...#  2 counter
#...#######...#  3 counter front
#.............#  4 open floor
##.........##.#  5 escalator + stools
###........##.#  6 escalator + table
###........##.#  7 escalator + table
#......mm.....#  8 mat
###############  9 void
```

- Blocked: walls, counter, escalator, table, stools, void.
- Walkable: lobby floor (incl. Poké Ball emblem), side approaches beside the counter, entrance mat.
- Interactions: none for now (explore-only). Re-add later.

## Essentials tileset note

`Graphics/Tilesets/Poke Centre interior.png` is **RSE-style** (pink walls, different props). Map `009` (Cedolan Poké Center) uses that tileset in Essentials, but it does **not** match `tileset-juego/pokemoncenter.png` pixel-for-pixel.

| Use | Source |
| --- | --- |
| Home room look | `tileset-juego/pokemoncenter.png` |
| Admin palette / future RSE rooms | Essentials `Poke Centre interior` props in `essentials-manifest.json` |

Do not mix FR/LG reference sprites with RSE prop crops in the same room.

## Runtime scene

- Factory: `createPokemonRoomScene()` in `packages/scene-core/src/demo-scene.ts`
- Pack bump: `DEMO_ASSET_PACK` — bump whenever the room art or collision map changes so `ensureSeedScene` refreshes published data.
- Visual: `presentation.backgroundImageUrl` → full-room PNG (also shown in admin canvas).
- Collision: authored on the 15×10 grid (see factory); décor is baked into the PNG.
- Interactions: empty for now (explore-only).
- Player charset: Essentials boy/girl (unchanged).

## Checklist before changing this room

1. Open `recursos/tileset-juego/pokemoncenter.png` with a 16×16 grid.
2. Update this doc’s ASCII map if furniture moves.
3. Update collisions / interactions in `demo-scene.ts` to match.
4. Re-run `pnpm import:essentials`.
5. Bump `DEMO_ASSET_PACK`.
6. Restart dev with a fresh DB if the home still shows the old room (`rm data.db` then `pnpm dev`).
