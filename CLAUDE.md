# Projekt: WizGame

## 1. Projektübersicht & Vision
- **Ziel:** Entwicklung eines Old-School-RPGs, das die mechanische Tiefe von *Wizardry 7* mit der klaren 2D-Top-Down-Darstellung von *RimWorld* verbindet.
- **Setting:** Eine organische Mischung aus Sci-Fi und Fantasy (Fokus auf Erkundung, Geheimnisse und Fraktionsvielfalt).
- **Kernmechaniken:** 
  - Party-basiertes Gameplay.
  - Komplexes Charakter-, Attributs- und Skill-System.
  - Interaktionen mit unterschiedlichen, dynamischen Fraktionen.
  - Taktisches Kampfsystem (rundenbasiert oder Real-Time-with-Pause) auf einem Grid.

## 2. Visueller Stil & Design
- **Perspektive:** 2D Top-Down / Vogelperspektive.
- **Darstellung:** Grid-basierte Welt; Charaktere werden als gut lesbare, abstrahierte Sprites ("Pawns") dargestellt.
- **UI/UX:** Minimalistisch und funktional, um komplexe RPG-Daten übersichtlich darzustellen.

## 3. Technische Vorgaben
- **Tech-Stack:** TypeScript, HTML5, CSS3, externe Libs sind ok
- **Architektur:** 
  - Strikte Trennung von Logik (Data/Model) und Darstellung (View).
  - Skalierbare Systeme für Items, Stats und Quests (z.B. Scriptable Objects / Data Resources).
  - Modulare und komponentenbasierte Programmierung.

## 4. Anweisungen für den KI-Assistenten (Claude)
- **Rolle:** Agiere als Senior Game Developer und Software-Architekt.
- **Antwortstil:** Antworte professionell, präzise und ohne ausschweifende Erklärungen. 
- **Code-Qualität:** Liefere sauberen, gut strukturierten und wartbaren Code (SOLID-Prinzipien). 
- **Typklassen als Enums:** Für Typ-/Kategorie-Felder (z.B. `aiBehavior`, Faktionen, Zustände) immer TypeScript-`enum`s verwenden, keine String-Literal-Unions/-Vergleiche (also nicht `aiBehavior: "basic" | "skirmish"` mit `=== "basic"`, sondern `enum AiBehavior { Basic, Skirmish }`).
- **Problemlösung:** Biete bei komplexen Problemen (z.B. Pathfinding, Formeln für Schadensberechnung, Fraktions-KI) zunächst eine kurze konzeptionelle Übersicht an, bevor Code implementiert wird.
- **Fokus:** Behalte immer die Balance zwischen der Komplexität eines klassischen CRPGs und der modernen, übersichtlichen User-Experience im Blick.
- **Doku-Pflege:** Nach Abschluss eines entwickelten Features prüfe, ob Abschnitt 5 (Architektur & Code-Struktur) noch aktuell ist, und aktualisiere ihn bei Bedarf (neue/geänderte zentrale Files, neue Layer/Patterns).
- **Git-Commits:** Nach Abschluss eines größeren Features immer einen Git-Commit erstellen (kein Abwarten auf explizite Aufforderung nötig).

## 5. Architektur & Code-Struktur

**Stack:** TypeScript + Vite, Rendering-Engine [pixi.js](https://pixijs.com) (WebGL) für die Grid-Welt, natives DOM/CSS für feste UI-Overlays (z.B. Party-Leiste). Pfad-Aliase (`@core`, `@data`, `@world`, `@entities`, `@systems`, `@rendering`, `@utils`) sind in [vite.config.ts](vite.config.ts) definiert.

**Einstiegspunkt:** [src/main.ts](src/main.ts) → [src/core/Game.ts](src/core/Game.ts). `Game` ist der zentrale Orchestrator: baut Grid, Entities, Views, Kamera, Input und die Game-Loop zusammen und hält den `update()`/`render()`-Takt ([src/core/GameLoop.ts](src/core/GameLoop.ts)).

**ECS (Entity-Component-System)** — Ort: `src/entities/`, `src/systems/`
- `EntityManager` ([src/entities/EntityManager.ts](src/entities/EntityManager.ts)): erzeugt `EntityId`s, verwaltet Components als `Map<ComponentCtor, Map<EntityId, Component>>`, bietet `query(...ctors)`.
- Components sind reine Daten (`src/entities/components/*.ts`): `TransformComponent` (Grid-Position), `AppearanceComponent` (Aussehen), `PawnComponent` (Referenz auf `PawnDefinition`), `MovementComponent` (aktiver Pfad), `AttackAnimationComponent` (kurzer visueller Lunge-Effekt zum Ziel hin/zurück, rein kosmetisch), `PlayerAiBehaviorComponent` (Autobattle-Status pro Party-Mitglied: `behavior` (`PlayerAiBehavior`-Enum, aktuell nur `Melee`), `autoEngaged`, `fleeTilesRemaining`), `InventoryComponent`, `ExperienceComponent` (`currentExp`/`expToNextLevel`, nur PCs — `level` selbst liegt in `PawnDefinition.attributes`), `EquipmentComponent` (`EquipmentSlot`-Enum: Head/Torso/Legs/Cloak/Gloves/Boots/Ring/LeftHand/RightHand/Ranged/Munition/Neck → Item-`id`|`null`; aktuell reines Paperdoll ohne Ausrüsten-Logik).
- Systems (`src/systems/*.ts`) implementieren `System.update(dt, entityManager, grid)` und kapseln Logik, die über Entities iteriert (z.B. `MovementSystem`, `AttackAnimationSystem` für den Lunge-Effekt).
- `Party` ([src/entities/Party.ts](src/entities/Party.ts)): reines Datenmodell, 6 Slots mit `EntityId`-Referenzen auf die Party-Mitglieder.

**Daten/Resources** — Ort: `src/data/`
- `ResourceDefinition`-Pattern (ähnlich Unity ScriptableObjects): statische Definitionen für Tiles, Pawns, Items als Plain Objects mit `id`/`displayName` (`src/data/resources/*.ts`).
- `ResourceRegistry` ([src/data/loaders/ResourceRegistry.ts](src/data/loaders/ResourceRegistry.ts)): generisches Lookup nach `id`.
- **Vokabular:** PC = Player/Party Character (eines der 6 Party-Slots). NPC = jeder Nicht-Party-Pawn. Monster = ein aggressiver NPC (aktuell die einzige implementierte NPC-Art) — `Faction`-Enum in `PawnDefinition.ts` heißt entsprechend `PC`/`Monster`.
- **Attributes:** `PawnDefinition.attributes?` (`level`, `strength`, `intelligence`, `piety`, `vitality`, `dexterity`, `speed`, `senses`) — geteiltes Attribut-Set für PCs und NPCs/Monster; aktuell nur bei `PAWN_HUMANOID` befüllt (Monster-JSONs/`EnemyPawnDefinitions.ts` lassen es weg). `expReward?` auf `PawnDefinition` ist die Exp, die ein Monster bei Tod vergibt (noch nicht verdrahtet).
- **Aussehen:** `AppearanceDefinition.ts` definiert Aussehen rein über Enums (`HeadShape`, `BodyShape`, `HairStyle`, `EyeStyle`, `FacialFeature` — Skin-/Haarfarbe bleiben `number`-Paletten, keine Enums) + Trait-Arrays für die Zufallsauswahl; `AppearanceGenerator.randomAppearance()` würfelt daraus (Gesichtsmerkmal nur mit 35% Chance, sonst `FacialFeature.None`). Testkarten: `src/data/maps/TestCityMap.ts`.
- **Monster als JSON-Daten:** `src/data/resources/monsters/*.json` (Faction/AiBehavior als String im JSON, an der Ladegrenze in die echten Enums übersetzt) werden zur Build-Zeit per `import.meta.glob` eingelesen ([src/data/loaders/MonsterDefinitionLoader.ts](src/data/loaders/MonsterDefinitionLoader.ts)) und ergeben `PawnDefinition[]`. Neues Monster = neue JSON-Datei, kein Code nötig (Sprite-Import s.u.).

**Welt/Grid** — Ort: `src/world/`
- `Grid`/`GridCell`: 2D-Tile-Grid mit Belegung (`occupantEntityId`).
- `Coordinates.ts`: `TILE_SIZE`, Grid↔World-Konvertierung, Lerp für Bewegungsanimation.
- `Pathfinding.ts`: `findPath` (A*-artig) unter Berücksichtigung der Tile-Begehbarkeit.

**Kampf** — Ort: `src/battle/`, ausgelöst über Encounter-Zonen/Weltmonster in `Game.ts`, eigenes (per `BattleGridBuilder.ts` 3×3-hochskaliertes, mit Innenwänden durchsetztes) Battle-`Grid`, parallel zum Welt-`Grid`. Nur der Party-Anführer (Slot 0) ist in der Overworld sichtbar/blockierend (`PawnView.setHiddenEntities`); die übrige Party erscheint erst im Kampf.
- `BattleState.ts`: `BattlePhase` (Player/Enemy, kein Initiative-Queue-System), `BattleOutcome`, aktuell ausgewählte Einheit. Bei `Victory` räumt `Game.endBattle` das Battle-Grid ab und kehrt zur Overworld zurück; bei `Defeat` zeigt `Game.showGameOver` ein „Game Over"-Overlay und friert die Game-Loop ein (`Game.gameOver`-Flag, früher `return` in `update()`).
- `BattleSystem.ts`: Nahkampf-Auflösung (`resolveMeleeAttack`, nur orthogonal-adjazent; Schaden = `1 + max(0, Angriff - Verteidigung)`, nie unter 1) + Sieg/Niederlage-Check. Tote Einheiten werden nicht zerstört, sondern bleiben (ausgegraut über `currentHP <= 0` in `PawnView`) bis Kampfende sichtbar liegen; ihre Grid-Zelle wird sofort freigegeben. `resolveMeleeAttack` feuert einen `onAttack`-Callback (für Battle-Log, s.u.) und hängt dem Angreifer eine `AttackAnimationComponent` an.
- `EnemyAISystem.ts`: pro Gegner `aiBehavior` (`Basic`/`Skirmish`, aus `PawnDefinition`) steuert Anlauf-/Rückzugsverhalten; Anlauf-Zielzelle wird per echtem `findPath` (nicht nur Manhattan-Distanz) gewählt und muss begehbar sein, sonst nächstbeste Kandidatenzelle. Bewegung ist instant (kein `MovementComponent`), ein Gegner pro `update()`-Tick (`Game.updateEnemyPhase`/`pendingEnemyIds`).
- `MovementRange.ts`: BFS-Reichweitenberechnung fürs Bewegungs-Highlight; `CombatantSpawner.ts` für Gegner-Platzierung.
- Aktionsökonomie: `BattleParticipantComponent` (`hasMoved`/`hasAttacked`) — pro Spieler-Phase eine Bewegung + ein Angriff, unabhängig einsetzbar. Bei Battle-Zügen wird die Ziel-Zelle sofort (nicht erst nach Ende der Slide-Animation) als belegt markiert (`Game.handleBattleRightClick`), um Race Conditions bei schnell getakteten Auto-Zügen zu vermeiden.
- **Autobattle (`PlayerAiBehavior`, `src/data/resources/PlayerAiBehavior.ts`):** Auswahl im `BattleActionBarView` (Dropdown für das Verhalten, aktuell nur „Nahkampf"/`Melee`, plus „Auto"-Toggle-Button). `Game.advanceAutoSelection` wählt reihum das nächste Party-Mitglied mit verfügbarer Aktion aus; `Game.updateAutoPlayerTurn` löst pro Tick höchstens eine Mikro-Aktion (Bewegen ODER Angriff) der aktuell ausgewählten, `autoEngaged`-Einheit aus — und wartet dabei zwingend, bis weder `MovementComponent` noch `AttackAnimationComponent` mehr an der Einheit hängen (Animation vollständig abgeschlossen), damit Auto-Einheiten strikt nacheinander statt parallel agieren. `resolveMeleeAiTurn` läuft auf das nächste erreichbare Feld neben dem nächsten Gegner zu (`findPath`, keine reine Distanz-Heuristik) und flieht unter 30% HP (`FLEE_HP_RATIO`) für mindestens `2×BATTLE_MOVE_RANGE` Felder in eine zufällige, vom Gegner wegführende Richtung. Sind alle lebenden Party-Mitglieder `autoEngaged`, beendet `advanceAutoSelection` die Spieler-Phase automatisch.

**Rendering** — Ort: `src/rendering/`, zwei getrennte Layer:
1. **Welt-Layer (Pixi/WebGL):** `Renderer` ([src/rendering/Renderer.ts](src/rendering/Renderer.ts)) hält `Application` + `sceneRoot`. `GridView` zeichnet Tiles (plus optionales Bewegungsreichweite-Highlight), `PawnView` synct Pawn-Sprites mit ECS-Entities (Position/Bewegung inkl. Lunge-Offset bei `AttackAnimationComponent`, aktive/gedimmte/ausgegraute (`currentHP <= 0`) Hervorhebung, ein-/ausblendbar über `setHiddenEntities`), zeichnet im Kampf zusätzlich pro Einheit einen HP-Balken (`setShowHpBars`, nur während `GameMode.Battle`). `CameraController` steuert Pan/Zoom, `PlayerInputController`/`BattleInputController` übersetzen Klicks in Ziel-/Aktionsereignisse. Zwei Sprite-Pfade in `PawnView`: Standard sind Vektor-Primitiven (`pixi.js Graphics`) aus `pawn/PawnLayout.ts` (Maße), `pawn/PawnPartDrawing.ts` (Zeichenfunktionen), `pawn/PawnSpriteFactory.ts` (`buildPawnSprite`); hat die `PawnDefinition` ein `spriteAsset`, wird stattdessen ein importiertes Rasterbild als `pixi.Sprite` gerendert (`pawn/PawnSpriteFactory.buildRasterSprite`, Texturen vorab geladen über `pawn/MonsterTextureLoader.ts`/`MonsterTextureAssets.ts`, ebenfalls per `import.meta.glob` aus `src/assets/monsters/*.png`).
2. **UI-Layer (DOM/CSS), fix & kameraunabhängig:** Ort `rendering/ui/`. `PartyBarView` rendert die 6 Party-Portraits mit HP-Balken (3 links/3 rechts, `party-bar.css`; `--party-slot-size`/`--party-slot-gap` auf `:root` definiert, damit andere Panels — z.B. das Battle-Log — kollisionsfrei danebenpositionieren können); Hover über einen Slot zeigt ein Debug-Overlay (`.party-bar__debug-tooltip`, eigenes Div statt nativem `title`, da Browser-Tooltips unzuverlässig sind) mit der Trait-Zusammensetzung (Head/Body/Hair+Farbe/Eyes/Feature/Skin) des Charakters — Text kommt aus `slotEl.dataset.debug`, gesetzt in `sync()`; Rechtsklick auf einen Slot (`onSlotRightClick`-Callback im Konstruktor) öffnet den Charakterbogen (s.u.) für diesen Slot. `BattleHudView` eine Kämpfer-Übersicht mit HP-Balken oben mittig, `BattleActionBarView` unten mittig mit Bewegen/Angriff-Status, KI-Verhalten-Dropdown + „Auto"-Toggle (Autobattle, s.o.) und Zug-beenden-Button, `BattleLogView` unten links ein scrollbares, per Copy-Button kopierbares Kampf-Log (`log(main, detail?, kind)`, `BattleLogEntryKind` für farbliche/fette Hervorhebung von Spieler-/Gegner-Angriffen) — alle direkt als DOM-Elemente über dem Canvas. Portraits sind **SVG** (`PortraitSvg.ts`, verlustfrei skalierbar) für Vektor-Pawns bzw. ein `<img>` auf dasselbe Rasterbild für Monster mit `spriteAsset`.
   - **Charakterbogen (`CharacterSheetView`, `character-sheet.css`):** zentriertes Overlay pro Party-Mitglied — Ziffern `1`–`6` (nur Overworld) oder Rechtsklick auf einen `PartyBarView`-Slot öffnen es (`Game.openCharacterSheet`), `×`-Button oder Klick auf den Hintergrund schließt es. Links Vollkörper-Portrait (`buildFullPortraitSvg`) umgeben von den 12 `EquipmentSlot`-Feldern (rein visuelles Paperdoll, noch keine Ausrüsten-Interaktion), rechts Statblock (HP, Armor Class = `StatsComponent.defense`, Experience/Next Level aus `ExperienceComponent`, plus Level + die 7 Attribute aus `PawnDefinition.attributes`). `sync()` baut nur den `body` (Portrait+Stats) neu, nicht den persistenten `×`-Button, damit ein Klick auf den Button nicht durch das Re-Rendering im nächsten Frame ins Leere geht.

**Sprite-Import-Pipeline** (für komplexe/gemalte Monsterbilder, die sich nicht als Vektor-Primitiven zeichnen lassen): `npm run import-sprites` ([scripts/import-sprites.mjs](scripts/import-sprites.mjs)) liest Rohbilder aus `assets-incoming/`, entfernt den Hintergrund (Eckfarben-Chroma-Keying), schneidet auf den Inhalt zu, zentriert quadratisch mit Padding und speichert nach `src/assets/monsters/`; Originale wandern nach `assets-archive/`. Ergebnis referenzierbar über `spriteAsset` (Dateiname) im Monster-JSON.

**Typischer Ablauf beim Hinzufügen eines Features:**
1. Datenmodell/Component in `entities/` oder `data/resources/` definieren.
2. Logik als `System` in `systems/` (falls es sich über Entities/Frames erstreckt).
3. Darstellung: Welt-Objekte → neue/erweiterte `*View`-Klasse im Pixi-Layer; feste UI → neue View in `rendering/ui/` (DOM), analog zu `PartyBarView`.
4. Verdrahtung in `Game.ts` (Erzeugen, in `update()`/`render()` einhängen).