# Scene rooms — registry and authoring guide

How to build interactive rooms beyond the home Poké Center.

## Naming

Project identifiers use **American English** — `center`, not `centre`. Essentials source filenames in `recursos/` keep their original spelling (`Poke Centre interior.png`).

## Poké Center (home) — backdrop mode

Special case: pre-assembled FR/LG art, not tile-painted.

| Item | Reference |
| --- | --- |
| Layout doc | [`docs/POKE_CENTER.md`](./POKE_CENTER.md) |
| Factory | `createPokemonRoomScene()` in `packages/scene-core/src/demo-scene.ts` |
| Grid | Fixed **15×10** @ 32px |
| Visual | `presentation.backgroundImageUrl` → `essentials/rooms/poke-center.png` |
| Collisions | Authored ASCII map in `demo-scene.ts` — **not** from painted wall tiles |

Do **not** overlay Essentials RSE prop crops on the home room.

## Tileset rooms — tiled mode

Recommended for gyms, marts, bedrooms, and any map with **interior walls** or **open sections**.

| Room type | Default tileset | Template id | Notes |
| --- | --- | --- | --- |
| Blank | `interior-general` | `blank` | Empty grid, paint from scratch |
| Small room | `interior-general` | `small-room` | 12×10, perimeter walls |
| Bedroom | `interior-general` | `bedroom` | 10×8, bed + door spawn |
| Mart | `mart-interior` | `mart` | 14×10, counter row |
| Gym | `gyms-interior` | `gym-arena` | 20×16, outer walls + inner dividers |
| Poké Center (RSE) | `poke-center-interior` | `poke-center-tiled` | Tile-painted variant — **not** the home FR/LG room |

### Interior walls and sections

- Paint **Muro** on `layer-walls` for any blocking boundary — perimeter or interior partitions.
- Enable **Sincronizar muros → colisión** in the editor so wall tiles auto-block (or paint collisions manually).
- Open floors (gym arena center, shop aisle) stay walkable with no wall tiles.
- Grid is **not** limited to enclosed rectangles; resize in admin (8–64 tiles per axis).

## Two authoring modes

| Mode | When to use | Collision source |
| --- | --- | --- |
| `backdrop` | Single PNG room (home Poké Center) | Hand-authored map in code or collision paint |
| `tiled` | Gyms, shops, custom interiors | Wall sync + object footprints + manual overrides |

## Checklist — new scenario

1. Pick template in admin (or blank + resize grid).
2. Confirm tileset props exist in `scripts/essentials-manifest.json` → `pnpm import:essentials`.
3. Paint floor / walls; place ornaments from palette.
4. Set **spawn** tool — position + facing.
5. Paint or sync collisions; verify walkable paths.
6. Add interactions (blog routes) if needed.
7. Save → Publish → **Usar en home** (optional).
8. Bump `DEMO_ASSET_PACK` only when changing the home demo factory.

## Tilesets in repo

| ID | Essentials source | Status |
| --- | --- | --- |
| `poke-center-interior` | `Poke Centre interior.png` | Imported |
| `interior-general` | `Interior general.png` | Imported |
| `mart-interior` | `Mart interior.png` | Imported |
| `outside` | `Outside.png` | Imported |
| `gyms-interior` | `Gyms interior.png` | Imported |

## Camera behavior

| Map size | `presentation.camera.mode` |
| --- | --- |
| Fits in viewport (home 15×10) | `fit-room` — whole map visible |
| Larger than viewport (gyms) | `follow-player` — player centered until map edge |

See [`docs/SCENE_BUILDER.md`](./SCENE_BUILDER.md) for admin workflow and controls.
