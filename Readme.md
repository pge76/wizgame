# WizGame

Old-school party RPG combining *Wizardry 7*-style mechanical depth with a *RimWorld*-style 2D top-down presentation. Sci-fi/fantasy setting. TypeScript + Vite + [pixi.js](https://pixijs.com) for the grid world, native DOM/CSS for fixed UI overlays.

See [CLAUDE.md](CLAUDE.md) for the full architecture reference.

## Running

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build
npm test         # vitest
```

## Implemented

- Overworld exploration on a tile grid, right-click and WASD movement, camera follow
- Procedural pawn appearance (enum-based traits), rendered as vector sprites or imported raster sprites
- Turn-based grid battles (player/enemy phases), orthogonal melee combat
- Encounter zones and world monsters trigger battles when the player moves onto them
- Enemy AI (`Basic`/`Skirmish`) with pathfinding-based approach/retreat
- Autobattle: per-party-member AI behavior + auto-toggle, sequenced micro-actions
- Move/attack action economy per battle turn, victory/defeat handling, game-over overlay
- UI: party bar with HP bars & debug tooltips, character sheet with equipment paperdoll and stats, battle HUD, action bar, scrollable battle log, shared party inventory grid
- Data-driven monster definitions (JSON) loaded via `import.meta.glob`
- Sprite import pipeline (background removal, crop/center) for painted monster art

## Open / ideas

- Armor and Items with Stats
- Ranged Combat with Ammo Usage and Display of Arrows Flying etc.
- Spell Combat with Mana Usage and Display of Spells and Effects.
- Equip items from inventory onto paperdoll slots (currently display-only)
- Loot drops, exp reward wiring, leveling up
- Spell combat (intelligence/piety attributes currently unused)
- Monster-initiated encounters (monster walks onto player tile)
- Diagonal movement
- Save/load game state
- Multiple maps / world transitions (currently a single test city map)
- Minimap / full map view
- Sound and music
- Quest system
- Faction reputation and dialogue system
