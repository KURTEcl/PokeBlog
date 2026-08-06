# Scene assets

Runtime art is imported from **[Pokémon Essentials 21 with Unofficial EBDX](https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX)** into `public/scene-assets/essentials/` (gitignored).

```bash
# After cloning Essentials into recursos/ (see docs/INSTALLATION.md)
pnpm import:essentials
```

This runs automatically after `pnpm install` when `recursos/` is present.

## Essentials layout (generated)

```text
public/scene-assets/essentials/
  tiles/
    poke-center-interior.png
    interior-general.png
    mart-interior.png
    gyms-interior.png
    outside.png
  player/
    boy-charset.png
    girl-charset.png
  objects/
    pc.png, counter-wide.png, mart-counter.png, gym-mat.png, …
  ui/
    help-arrows.png, help-action.png, help-back.png
  rooms/
    poke-center.png   # optional FR/LG home backdrop
```

## Policy

| Allowed in public git | Not allowed |
| --- | --- |
| This doc, import script | `recursos/`, `essentials/*.png`, Nintendo rips |

Never push Essentials PNGs to git. Each machine with the dump runs `pnpm import:essentials` locally.

Full path map: [docs/ASSETS.md](../../docs/ASSETS.md).
