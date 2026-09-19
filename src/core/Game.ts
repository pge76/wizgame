import { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { Party } from "@entities/Party";
import { TransformComponent } from "@entities/components/TransformComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { MovementComponent } from "@entities/components/MovementComponent";
import { AttackAnimationComponent } from "@entities/components/AttackAnimationComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { ExperienceComponent } from "@entities/components/ExperienceComponent";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { PlayerAiBehaviorComponent } from "@entities/components/PlayerAiBehaviorComponent";
import { PlayerAiBehavior } from "@data/resources/PlayerAiBehavior";
import { DoorComponent } from "@entities/components/DoorComponent";
import { GroundItemComponent } from "@entities/components/GroundItemComponent";
import { tryOpenDoor } from "@entities/DoorActions";
import { Grid } from "@world/Grid";
import { TILE_SIZE, gridToWorld, lerpGridPos, worldToGrid, type GridPos } from "@world/Coordinates";
import { findPath } from "@world/Pathfinding";
import { buildBattleGrid, ENCOUNTER_RADIUS } from "@battle/BattleGridBuilder";
import { findFreeWalkablePositionsNear, spawnCombatant } from "@battle/CombatantSpawner";
import { BATTLE_MOVE_RANGE, computeReachableTiles } from "@battle/MovementRange";
import { BattlePhase, BattleState, BattleOutcome } from "@battle/BattleState";
import { BattleSystem } from "@battle/BattleSystem";
import { EnemyAISystem } from "@battle/EnemyAISystem";
import { getEncounterTable } from "@data/resources/EncounterTable";
import { rollEncounter } from "@data/generation/EncounterGenerator";
import { generateDoorPlacements } from "@data/generation/DoorGenerator";
import { rollLoot } from "@data/generation/LootGenerator";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import { TILE_FLOOR, TILE_GRASS, TILE_SAND, TILE_WALL, TILE_WATER, type TileDefinition } from "@data/resources/TileDefinition";
import { applyTestCityMap, TEST_CITY_MAP } from "@data/maps/TestCityMap";
import { TEST_ENCOUNTER_ZONES, type EncounterZone } from "@data/maps/EncounterZones";
import { Faction, PAWN_HUMANOID, type PawnDefinition } from "@data/resources/PawnDefinition";
import { PAWN_BANDIT, PAWN_RAT } from "@data/resources/EnemyPawnDefinitions";
import { MONSTER_DEFINITIONS } from "@data/loaders/MonsterDefinitionLoader";
import type { ItemDefinition } from "@data/resources/ItemDefinition";
import { ITEM_DEFINITIONS } from "@data/loaders/ItemDefinitionLoader";
import { equipItemFromInventory, unequipToInventory } from "@entities/EquipmentActions";
import { FLEE_HP_RATIO } from "@battle/CombatFormulas";
import { preloadMonsterTextures } from "@rendering/pawn/MonsterTextureLoader";
import { randomAppearance } from "@data/generation/AppearanceGenerator";
import { MovementSystem } from "@systems/MovementSystem";
import { AttackAnimationSystem } from "@systems/AttackAnimationSystem";
import type { System } from "@systems/System";
import { Renderer } from "@rendering/Renderer";
import { GridView } from "@rendering/GridView";
import { PawnView } from "@rendering/PawnView";
import { DoorView } from "@rendering/DoorView";
import { GroundItemView } from "@rendering/GroundItemView";
import { CameraController } from "@rendering/CameraController";
import { PlayerInputController } from "@rendering/PlayerInputController";
import { BattleInputController } from "@rendering/BattleInputController";
import { PartyBarView } from "@rendering/ui/PartyBarView";
import { CharacterSheetView } from "@rendering/ui/CharacterSheetView";
import { BattleHudView } from "@rendering/ui/BattleHudView";
import { BattleActionBarView } from "@rendering/ui/BattleActionBarView";
import { BattleLogView, BattleLogEntryKind } from "@rendering/ui/BattleLogView";
import { GameLoop } from "./GameLoop";

const GRID_WIDTH = 100;
const GRID_HEIGHT = 80;
const BANTARI_ID = "pawn.bantari";
const RUSTY_KEY_ID = "item.key.rusty-key";

const WASD_DIRECTIONS: Record<string, GridPos> = {
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

enum GameMode {
  Overworld,
  Battle
}

export class Game {
  private readonly tileRegistry = new ResourceRegistry<TileDefinition>();
  private readonly pawnRegistry = new ResourceRegistry<PawnDefinition>();
  private readonly itemRegistry = new ResourceRegistry<ItemDefinition>();
  private readonly entityManager = new EntityManager();
  private readonly grid = new Grid(GRID_WIDTH, GRID_HEIGHT, TILE_GRASS.id);
  private readonly overworldSystems: System[] = [];
  private readonly battleSystems: System[] = [];
  private readonly renderer = new Renderer();
  private readonly party = new Party();
  private gridView!: GridView;
  private pawnView!: PawnView;
  private doorView!: DoorView;
  private groundItemView!: GroundItemView;
  private partyBarView!: PartyBarView;
  private characterSheetView!: CharacterSheetView;
  private battleHudView!: BattleHudView;
  private battleActionBarView!: BattleActionBarView;
  private battleLogView!: BattleLogView;
  private camera!: CameraController;
  private playerInput!: PlayerInputController;
  private battleInput?: BattleInputController;
  private playerEntityId!: EntityId;
  private loop!: GameLoop;
  private activeEncounterZoneId: string | null = null;

  private readonly battleState = new BattleState();
  private battleSystem!: BattleSystem;
  private enemyAI!: EnemyAISystem;
  private pendingEnemyIds: EntityId[] = [];

  private mode: GameMode = GameMode.Overworld;
  private battleGrid?: Grid;
  private battleGridView?: GridView;
  private battleAnchorWorldPos?: GridPos;
  private battleReturnPositions = new Map<EntityId, GridPos>();
  private worldMonsterEntityId?: EntityId;
  private gameOver = false;
  private readonly heldMovementKeys = new Set<string>();

  async start(mountEl: HTMLElement): Promise<void> {
    this.tileRegistry.register(TILE_FLOOR);
    this.tileRegistry.register(TILE_WALL);
    this.tileRegistry.register(TILE_GRASS);
    this.tileRegistry.register(TILE_SAND);
    this.tileRegistry.register(TILE_WATER);

    this.pawnRegistry.register(PAWN_HUMANOID);
    this.pawnRegistry.register(PAWN_RAT);
    this.pawnRegistry.register(PAWN_BANDIT);
    for (const monsterDefinition of MONSTER_DEFINITIONS) {
      this.pawnRegistry.register(monsterDefinition);
    }
    for (const itemDefinition of ITEM_DEFINITIONS) {
      this.itemRegistry.register(itemDefinition);
    }
    await preloadMonsterTextures();

    const cityOrigin = {
      x: Math.floor((GRID_WIDTH - TEST_CITY_MAP.width) / 2),
      y: Math.floor((GRID_HEIGHT - TEST_CITY_MAP.height) / 2)
    };
    applyTestCityMap(this.grid, cityOrigin);
    this.placeDoors(cityOrigin);

    const movementSystem = new MovementSystem();
    this.overworldSystems.push(movementSystem);
    this.battleSystems.push(movementSystem);
    this.battleSystem = new BattleSystem(
      this.battleState,
      this.itemRegistry,
      (outcome) => this.endBattle(outcome),
      (attackerId, targetId, attackStat, defenseStat, damage) => this.logAttack(attackerId, targetId, attackStat, defenseStat, damage)
    );
    this.battleSystems.push(this.battleSystem);
    this.battleSystems.push(new AttackAnimationSystem());
    this.enemyAI = new EnemyAISystem(
      this.battleSystem,
      this.tileRegistry,
      this.pawnRegistry,
      (entityId, tilesMoved, destination) => this.logMove(entityId, tilesMoved, destination)
    );

    this.spawnSamplePawns({ x: cityOrigin.x + 28, y: cityOrigin.y + 28 });
    this.seedStarterInventory();
    this.spawnWorldMonster({ x: cityOrigin.x + 24, y: cityOrigin.y + 22 });

    await this.renderer.init(mountEl);
    this.gridView = new GridView(this.grid, this.tileRegistry);
    this.gridView.build();
    this.doorView = new DoorView(this.entityManager);
    this.groundItemView = new GroundItemView(this.entityManager);
    this.pawnView = new PawnView(this.entityManager, this.pawnRegistry);

    this.renderer.sceneRoot.addChild(this.gridView.container, this.doorView.container, this.groundItemView.container, this.pawnView.container);

    this.partyBarView = new PartyBarView(this.entityManager, this.party, (slot) => this.openCharacterSheet(slot));
    mountEl.appendChild(this.partyBarView.element);
    this.partyBarView.sync();

    this.characterSheetView = new CharacterSheetView(
      this.entityManager,
      this.pawnRegistry,
      this.itemRegistry,
      this.party,
      (entityId, inventorySlot) => equipItemFromInventory(this.entityManager, this.itemRegistry, this.party, entityId, inventorySlot),
      (entityId, slot) => unequipToInventory(this.entityManager, this.party, entityId, slot)
    );
    mountEl.appendChild(this.characterSheetView.element);

    this.battleHudView = new BattleHudView(this.entityManager, this.pawnRegistry);
    mountEl.appendChild(this.battleHudView.element);

    this.battleActionBarView = new BattleActionBarView(
      this.entityManager,
      () => this.endPlayerPhase(),
      (behavior) => this.setSelectedUnitAiBehavior(behavior),
      () => this.toggleSelectedUnitAuto(),
      () => this.cycleSelection()
    );
    mountEl.appendChild(this.battleActionBarView.element);

    this.battleLogView = new BattleLogView();
    mountEl.appendChild(this.battleLogView.element);

    this.camera = new CameraController(
      this.renderer.app,
      this.renderer.sceneRoot,
      GRID_WIDTH * TILE_SIZE,
      GRID_HEIGHT * TILE_SIZE
    );

    this.playerInput = new PlayerInputController(this.renderer.app, this.camera, (target) =>
      this.commandPlayerMove(target)
    );
    this.camera.setTapHandler((screenX, screenY) => this.handleCanvasTap(screenX, screenY));

    window.addEventListener("keydown", (event) => {
      if (event.code !== "Tab" || this.mode !== GameMode.Battle || this.battleState.phase !== BattlePhase.Player) return;
      event.preventDefault();
      this.cycleSelection();
    });

    window.addEventListener("keydown", (event) => {
      const match = /^Digit([1-6])$/.exec(event.code);
      if (!match || this.mode !== GameMode.Overworld) return;
      this.openCharacterSheet(Number(match[1]) - 1);
    });

    window.addEventListener("keydown", (event) => {
      if (!(event.code in WASD_DIRECTIONS)) return;
      this.heldMovementKeys.add(event.code);
    });
    window.addEventListener("keyup", (event) => {
      this.heldMovementKeys.delete(event.code);
    });

    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
    this.loop.start();
  }

  private spawnSamplePawns(center: GridPos): void {
    // Laid out along a single row south of the plaza fountain to stay clear of the water tile.
    const positions: GridPos[] = [-5, -3, -1, 1, 3, 5].map((dx) => ({ x: center.x + dx, y: center.y }));

    positions.forEach((position, index) => {
      const id = this.entityManager.createEntity();
      this.entityManager.addComponent(id, TransformComponent, new TransformComponent(position));
      this.entityManager.addComponent(id, PawnComponent, new PawnComponent(PAWN_HUMANOID.id));
      this.entityManager.addComponent(id, AppearanceComponent, new AppearanceComponent(randomAppearance()));
      const stats = PAWN_HUMANOID.stats;
      this.entityManager.addComponent(
        id,
        StatsComponent,
        new StatsComponent(stats.maxHP, stats.maxHP, stats.attack, stats.defense, stats.initiative)
      );
      this.entityManager.addComponent(id, FactionComponent, new FactionComponent(PAWN_HUMANOID.faction));
      this.entityManager.addComponent(id, ExperienceComponent, new ExperienceComponent(0, 100));
      const equipment = new EquipmentComponent();
      equipment.slots[EquipmentSlot.RightHand] = "item.weapon.dagger";
      this.entityManager.addComponent(id, EquipmentComponent, equipment);
      this.party.setMember(index, id);

      if (index === 0) {
        this.playerEntityId = id;
        this.grid.getCell(position).occupantEntityId = id;
      }
    });
  }

  /** Drops a spread of the sample weapons/armor into the shared party inventory for testing. */
  private seedStarterInventory(): void {
    const starterItemIds = [
      "item.weapon.main-gauche",
      "item.weapon.rapier",
      "item.weapon.long-sword",
      "item.weapon.broad-sword",
      "item.weapon.mace",
      "item.weapon.war-hammer",
      "item.weapon.claymore",
      "item.armor.leather-cap",
      "item.armor.leather-armor",
      "item.armor.leather-leggings",
      "item.armor.chainmail",
      "item.armor.plate-mail"
    ];
    starterItemIds.forEach((itemId, slot) => this.party.setInventorySlot(slot, itemId));
  }

  private spawnWorldMonster(position: GridPos): void {
    const definition = this.pawnRegistry.get(BANTARI_ID);
    const id = this.entityManager.createEntity();
    this.entityManager.addComponent(id, TransformComponent, new TransformComponent(position));
    this.entityManager.addComponent(id, PawnComponent, new PawnComponent(definition.id));
    this.entityManager.addComponent(id, AppearanceComponent, new AppearanceComponent(randomAppearance()));
    const stats = definition.stats;
    this.entityManager.addComponent(
      id,
      StatsComponent,
      new StatsComponent(stats.maxHP, stats.maxHP, stats.attack, stats.defense, stats.initiative)
    );
    this.entityManager.addComponent(id, FactionComponent, new FactionComponent(definition.faction));
    this.grid.getCell(position).occupantEntityId = id;
    this.worldMonsterEntityId = id;
  }

  /** Places doors at ~50% of the city map's internal room doorway gaps (generateDoorPlacements),
   *  ~10% of those locked behind the rusty key. Doors block their tile like pawns until opened. */
  private placeDoors(cityOrigin: GridPos): void {
    const worldGapPositions = TEST_CITY_MAP.doorPositions.map((pos) => ({ x: cityOrigin.x + pos.x, y: cityOrigin.y + pos.y }));

    for (const { pos, locked } of generateDoorPlacements(worldGapPositions)) {
      const id = this.entityManager.createEntity();
      this.entityManager.addComponent(id, TransformComponent, new TransformComponent(pos));
      this.entityManager.addComponent(id, DoorComponent, new DoorComponent(locked ? RUSTY_KEY_ID : null));
      this.grid.getCell(pos).occupantEntityId = id;
    }
  }

  /** Opens the character sheet for the given party slot (0-based). No-op if that slot is empty. */
  private openCharacterSheet(slot: number): void {
    const id = this.party.getMember(slot);
    if (id === null) return;
    this.characterSheetView.show(id);
  }

  /**
   * A door/monster tile is an interaction target: bumping it (attacking, or trying its lock) only
   * fires once the player is actually standing next to it — not merely because it was clicked from
   * anywhere reachable. Clicking one from a distance instead walks the player up to the nearest free
   * neighboring tile; the interaction itself needs a follow-up click/step once adjacent.
   */
  private commandPlayerMove(target: GridPos): void {
    const transform = this.entityManager.getComponent(this.playerEntityId, TransformComponent);
    if (!transform) return;

    const isMonsterTarget = this.isWorldMonsterAt(target);
    const closedDoor = this.getClosedDoorAt(target);

    if (isMonsterTarget || closedDoor) {
      if (this.isAdjacent(transform.position, target)) {
        if (isMonsterTarget) {
          this.triggerWorldMonsterBattle();
        } else if (closedDoor && tryOpenDoor(closedDoor.door, this.party.getInventory())) {
          // Bumping a closed door only ever opens it (if possible) — it never also walks you through,
          // matching every other door regardless of locked/unlocked. Walk into it again afterward.
          this.grid.getCell(target).occupantEntityId = null;
        }
        return;
      }

      const approachPath = this.findPathAdjacentTo(target, transform.position);
      if (!approachPath || approachPath.length === 0) return;

      this.entityManager.addComponent(this.playerEntityId, MovementComponent, new MovementComponent(approachPath));
      this.camera.manualOverride = false;
      return;
    }

    const path = findPath(this.grid, this.tileRegistry, transform.position, target);
    if (!path || path.length === 0) return;

    this.entityManager.addComponent(this.playerEntityId, MovementComponent, new MovementComponent(path));
    this.camera.manualOverride = false; // a fresh move command resumes the camera following the leader
  }

  /** True if `b` is one orthogonal step away from `a`. */
  private isAdjacent(a: GridPos, b: GridPos): boolean {
    return this.grid.neighbors(a, false).some((n) => n.x === b.x && n.y === b.y);
  }

  /** Shortest path from `from` to whichever free, walkable tile neighboring `target` is closest —
   *  `target` itself is excluded since it's occupied by the door/monster we're approaching. */
  private findPathAdjacentTo(target: GridPos, from: GridPos): GridPos[] | null {
    const candidates = this.grid
      .neighbors(target, false)
      .filter((n) => this.tileRegistry.get(this.grid.getCell(n).terrainId).walkable && this.grid.getCell(n).occupantEntityId === null);

    let best: GridPos[] | null = null;
    for (const candidate of candidates) {
      const path = findPath(this.grid, this.tileRegistry, from, candidate);
      if (path && (best === null || path.length < best.length)) best = path;
    }
    return best;
  }

  /**
   * Touch-tap equivalent of the desktop mouse controls, routed by what's under the tap since touch
   * has no left/right button distinction: in the overworld a tap always moves/attacks (≙ right-click);
   * in battle, tapping one's own unit selects it (≙ left-click), tapping anything else moves/attacks
   * (≙ right-click).
   */
  private handleCanvasTap(screenX: number, screenY: number): void {
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    const gridPos = worldToGrid(worldPos.x, worldPos.y);

    if (this.mode === GameMode.Overworld) {
      this.commandPlayerMove(gridPos);
      return;
    }

    if (this.mode === GameMode.Battle && this.battleGrid) {
      if (!this.battleGrid.isInBounds(gridPos)) return;

      const occupantId = this.battleGrid.getCell(gridPos).occupantEntityId;
      const isOwnUnit = occupantId !== null && this.entityManager.getComponent(occupantId, FactionComponent)?.faction === Faction.PC;

      if (isOwnUnit) {
        this.selectUnit(gridPos);
      } else {
        this.handleBattleRightClick(gridPos);
      }
    }
  }

  /** True if `pos` is the world monster's current tile. */
  private isWorldMonsterAt(pos: GridPos): boolean {
    if (this.worldMonsterEntityId === undefined) return false;

    const monsterPos = this.entityManager.getComponent(this.worldMonsterEntityId, TransformComponent)?.position;
    return !!monsterPos && monsterPos.x === pos.x && monsterPos.y === pos.y;
  }

  /** The closed door occupying `pos`, if any — open doors don't block, so they're not "at" here. */
  private getClosedDoorAt(pos: GridPos): { id: EntityId; door: DoorComponent } | null {
    if (!this.grid.isInBounds(pos)) return null;

    const occupantId = this.grid.getCell(pos).occupantEntityId;
    if (occupantId === null) return null;

    const door = this.entityManager.getComponent(occupantId, DoorComponent);
    return door && !door.isOpen ? { id: occupantId, door } : null;
  }

  private triggerWorldMonsterBattle(): void {
    if (this.worldMonsterEntityId === undefined) return;

    const monsterPos = this.entityManager.getComponent(this.worldMonsterEntityId, TransformComponent)?.position;
    if (monsterPos) this.grid.getCell(monsterPos).occupantEntityId = null;
    this.entityManager.destroyEntity(this.worldMonsterEntityId);
    this.worldMonsterEntityId = undefined;
    this.startBattle([BANTARI_ID]);
  }

  /** Steps the player one tile per held WASD key, once its current move has finished. */
  private updateWasdMovement(): void {
    if (this.heldMovementKeys.size === 0 || this.entityManager.hasComponent(this.playerEntityId, MovementComponent)) return;

    const code = [...this.heldMovementKeys].pop()!;
    const direction = WASD_DIRECTIONS[code]!;
    const transform = this.entityManager.getComponent(this.playerEntityId, TransformComponent);
    if (!transform) return;

    this.commandPlayerMove({ x: transform.position.x + direction.x, y: transform.position.y + direction.y });
  }

  private followPlayerCamera(): void {
    if (this.camera.manualOverride) return; // player is free-looking (touch pan/pinch); don't fight it

    const transform = this.entityManager.getComponent(this.playerEntityId, TransformComponent);
    if (!transform) return;

    const movement = this.entityManager.getComponent(this.playerEntityId, MovementComponent);
    const renderPos =
      movement && movement.path.length > 0
        ? lerpGridPos(transform.position, movement.path[0]!, movement.progress)
        : transform.position;

    const worldPos = gridToWorld(renderPos);
    this.camera.centerOn(worldPos.x + TILE_SIZE / 2, worldPos.y + TILE_SIZE / 2);
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    if (this.mode === GameMode.Overworld) {
      for (const system of this.overworldSystems) {
        system.update(dt, this.entityManager, this.grid);
      }
      this.updateWasdMovement();
      this.followPlayerCamera();
      this.checkEncounterZones();
      this.checkGroundItemPickups();
    } else if (this.battleGrid) {
      for (const system of this.battleSystems) {
        system.update(dt, this.entityManager, this.battleGrid);
      }
      if (this.battleState.phase === BattlePhase.Enemy) {
        this.updateEnemyPhase();
      } else if (this.battleState.phase === BattlePhase.Player) {
        this.updateAutoPlayerTurn();
      }
    }
  }

  private updateEnemyPhase(): void {
    if (!this.battleGrid || this.battleState.outcome !== BattleOutcome.Ongoing) return;

    const enemyId = this.pendingEnemyIds.shift();
    if (enemyId === undefined) {
      this.startPlayerPhase();
      return;
    }
    if ((this.entityManager.getComponent(enemyId, StatsComponent)?.currentHP ?? 0) <= 0) return;

    this.enemyAI.takeTurn(this.entityManager, this.battleGrid, enemyId);
  }

  private startPlayerPhase(): void {
    this.battleState.phase = BattlePhase.Player;
    this.battleState.selectedEntityId = null;
    this.battleGridView?.setHighlightedTiles([]);

    for (const id of this.entityManager.query(FactionComponent, BattleParticipantComponent)) {
      if (this.entityManager.getComponent(id, FactionComponent)!.faction === Faction.PC) {
        const participant = this.entityManager.getComponent(id, BattleParticipantComponent)!;
        participant.hasMoved = false;
        participant.hasAttacked = false;
      }
    }

    this.advanceAutoSelection();
  }

  /**
   * Selects the next party member with an available action, in party order. Resolution of that
   * member's action (if it's auto-engaged) happens later, paced by `updateAutoPlayerTurn`.
   */
  private advanceAutoSelection(): void {
    const memberIds = this.party.getMembers().filter((id): id is EntityId => id !== null);
    const eligible = memberIds.filter(
      (id) => this.entityManager.hasComponent(id, BattleParticipantComponent) && this.isAlive(id) && this.hasAvailableAction(id)
    );

    if (eligible.length === 0) {
      this.battleState.selectedEntityId = null;
      this.updateMovementHighlight();
      if (this.allAlivePartyMembersAutoEngaged()) {
        this.endPlayerPhase();
      }
      return;
    }

    this.battleState.selectedEntityId = eligible[0]!;
    this.updateMovementHighlight();
  }

  /**
   * Resolves at most one auto-engaged unit's micro-action (move OR attack) at a time, strictly
   * sequential: the currently selected unit's move/attack animation must fully finish before
   * anything else happens, so auto units never appear to act in parallel.
   */
  private updateAutoPlayerTurn(): void {
    if (!this.battleGrid) return;

    const id = this.battleState.selectedEntityId;
    if (id === null) {
      this.advanceAutoSelection();
      return;
    }

    if (this.entityManager.hasComponent(id, MovementComponent) || this.entityManager.hasComponent(id, AttackAnimationComponent)) {
      return; // still animating — wait before doing anything else
    }

    if (!this.hasAvailableAction(id)) {
      this.advanceAutoSelection();
      return;
    }

    const behaviorComponent = this.entityManager.getComponent(id, PlayerAiBehaviorComponent);
    if (!behaviorComponent?.autoEngaged) return;

    const participant = this.entityManager.getComponent(id, BattleParticipantComponent)!;
    const hadMoved = participant.hasMoved;
    const hadAttacked = participant.hasAttacked;

    this.resolveAiTurn(id, behaviorComponent);

    const madeProgress = participant.hasMoved !== hadMoved || participant.hasAttacked !== hadAttacked;
    if (!madeProgress && this.hasAvailableAction(id)) {
      // Truly stuck (e.g. boxed in while fleeing, or no reachable path to the enemy): force-exhaust
      // so it isn't retried every tick forever.
      participant.hasMoved = true;
      participant.hasAttacked = true;
      this.battleLogView.log(`${this.displayName(id)} has no valid move or attack and skips its turn`);
    }

    this.updateMovementHighlight();
  }

  /** True once no living party member is left for the human to control, so the phase can end itself. */
  private allAlivePartyMembersAutoEngaged(): boolean {
    const aliveMembers = this.party.getMembers().filter((id): id is EntityId => id !== null && this.isAlive(id));
    if (aliveMembers.length === 0) return false;

    return aliveMembers.every((id) => this.entityManager.getComponent(id, PlayerAiBehaviorComponent)?.autoEngaged === true);
  }

  private resolveAiTurn(unitId: EntityId, behaviorComponent: PlayerAiBehaviorComponent): void {
    switch (behaviorComponent.behavior) {
      case PlayerAiBehavior.Melee:
        this.resolveMeleeAiTurn(unitId, behaviorComponent);
        break;
    }
  }

  /** Approaches and repeatedly attacks the nearest enemy; retreats for a few turns once HP drops below FLEE_HP_RATIO. */
  private resolveMeleeAiTurn(unitId: EntityId, behaviorComponent: PlayerAiBehaviorComponent): void {
    if (!this.battleGrid) return;

    const participant = this.entityManager.getComponent(unitId, BattleParticipantComponent);
    const transform = this.entityManager.getComponent(unitId, TransformComponent);
    const stats = this.entityManager.getComponent(unitId, StatsComponent);
    if (!participant || !transform || !stats) return;

    const nearest = this.findNearestEnemy(transform.position);
    if (!nearest) return;

    const isLowHp = stats.currentHP / stats.maxHP < FLEE_HP_RATIO;
    if (isLowHp && behaviorComponent.fleeTilesRemaining <= 0) {
      behaviorComponent.fleeTilesRemaining = BATTLE_MOVE_RANGE * 2;
    }

    if (behaviorComponent.fleeTilesRemaining > 0) {
      this.fleeFromEnemy(transform.position, nearest.pos, behaviorComponent, participant);
      return;
    }

    const isAdjacent = this.battleGrid.neighbors(transform.position, false).some(
      (n) => n.x === nearest.pos.x && n.y === nearest.pos.y
    );
    if (isAdjacent && !participant.hasAttacked) {
      this.handleBattleRightClick(nearest.pos);
      return;
    }

    if (!participant.hasMoved) {
      // Pathfind to an actual free, walkable tile next to the enemy rather than picking by
      // straight-line distance — this battle grid has interior walls, and the closest-by-manhattan
      // reachable tile can be unreachable (or even a wall) despite looking closest on paper. Try
      // each candidate approach tile, nearest first, until one actually has a path.
      const approachCells = this.battleGrid.neighbors(nearest.pos, false)
        .filter(
          (n) =>
            this.battleGrid!.getCell(n).occupantEntityId === null &&
            this.tileRegistry.get(this.battleGrid!.getCell(n).terrainId).walkable
        )
        .sort((a, b) => manhattan(a, transform.position) - manhattan(b, transform.position));

      let path: GridPos[] | null = null;
      for (const cell of approachCells) {
        const candidatePath = findPath(this.battleGrid, this.tileRegistry, transform.position, cell);
        if (candidatePath && candidatePath.length > 0) {
          path = candidatePath;
          break;
        }
      }
      if (!path) return;

      const dest = path[Math.min(path.length, BATTLE_MOVE_RANGE) - 1]!;
      this.handleBattleRightClick(dest);
    }
  }

  /** Moves one action away from the enemy, in a random direction among the farthest reachable tiles. */
  private fleeFromEnemy(
    from: GridPos,
    enemyPos: GridPos,
    behaviorComponent: PlayerAiBehaviorComponent,
    participant: BattleParticipantComponent
  ): void {
    if (!this.battleGrid || participant.hasMoved) return;

    const reachable = computeReachableTiles(this.battleGrid, this.tileRegistry, from, BATTLE_MOVE_RANGE);
    if (reachable.length === 0) return;

    const currentDistance = manhattan(from, enemyPos);
    const fleeCandidates = reachable.filter((t) => manhattan(t, enemyPos) > currentDistance);
    const pool = fleeCandidates.length > 0 ? fleeCandidates : reachable;
    const dest = pool[Math.floor(Math.random() * pool.length)]!;

    this.handleBattleRightClick(dest);
    behaviorComponent.fleeTilesRemaining = Math.max(0, behaviorComponent.fleeTilesRemaining - manhattan(from, dest));
  }

  private findNearestEnemy(pos: GridPos): { id: EntityId; pos: GridPos } | null {
    const candidates = this.entityManager
      .query(StatsComponent, FactionComponent, TransformComponent, BattleParticipantComponent)
      .filter((id) => this.entityManager.getComponent(id, FactionComponent)!.faction === Faction.Monster && this.isAlive(id));
    if (candidates.length === 0) return null;

    let best: { id: EntityId; pos: GridPos; dist: number } | null = null;
    for (const id of candidates) {
      const p = this.entityManager.getComponent(id, TransformComponent)!.position;
      const dist = manhattan(pos, p);
      if (!best || dist < best.dist) best = { id, pos: p, dist };
    }
    return best;
  }

  private setSelectedUnitAiBehavior(behavior: PlayerAiBehavior): void {
    const id = this.battleState.selectedEntityId;
    if (id === null) return;
    const behaviorComponent = this.entityManager.getComponent(id, PlayerAiBehaviorComponent);
    if (!behaviorComponent) return;

    behaviorComponent.behavior = behavior;
  }

  private toggleSelectedUnitAuto(): void {
    const id = this.battleState.selectedEntityId;
    if (id === null) return;
    const behaviorComponent = this.entityManager.getComponent(id, PlayerAiBehaviorComponent);
    if (!behaviorComponent) return;

    behaviorComponent.autoEngaged = !behaviorComponent.autoEngaged;
    if (behaviorComponent.autoEngaged) {
      this.battleLogView.log(`${this.displayName(id)} was set to Auto mode`);
    }
  }

  private endPlayerPhase(): void {
    if (!this.battleGrid || this.battleState.phase !== BattlePhase.Player) return;

    this.battleState.selectedEntityId = null;
    this.battleGridView?.setHighlightedTiles([]);
    this.battleState.phase = BattlePhase.Enemy;
    this.pendingEnemyIds = this.entityManager
      .query(FactionComponent, BattleParticipantComponent, StatsComponent)
      .filter(
        (id) =>
          this.entityManager.getComponent(id, FactionComponent)!.faction === Faction.Monster &&
          this.entityManager.getComponent(id, StatsComponent)!.currentHP > 0
      );
  }

  /** Left-click: selects a player-controlled unit under the cursor, or clears selection. */
  private selectUnit(pos: GridPos): void {
    if (!this.battleGrid || this.battleState.phase !== BattlePhase.Player) return;

    const occupantId = this.battleGrid.getCell(pos).occupantEntityId;
    const isOwnUnit = occupantId !== null && this.entityManager.getComponent(occupantId, FactionComponent)?.faction === Faction.PC;

    this.battleState.selectedEntityId = isOwnUnit ? occupantId : null;
    this.updateMovementHighlight();
  }

  private updateMovementHighlight(): void {
    if (!this.battleGrid || !this.battleGridView) return;

    const id = this.battleState.selectedEntityId;
    const participant = id !== null ? this.entityManager.getComponent(id, BattleParticipantComponent) : undefined;
    const transform = id !== null ? this.entityManager.getComponent(id, TransformComponent) : undefined;

    if (!participant || !transform || participant.hasMoved) {
      this.battleGridView.setHighlightedTiles([]);
      return;
    }

    this.battleGridView.setHighlightedTiles(
      computeReachableTiles(this.battleGrid, this.tileRegistry, transform.position, BATTLE_MOVE_RANGE)
    );
  }

  /** Right-click: attacks an adjacent enemy, or moves the selected unit onto a highlighted reachable tile. */
  private handleBattleRightClick(targetPos: GridPos): void {
    if (!this.battleGrid || this.battleState.phase !== BattlePhase.Player) return;

    const actorId = this.battleState.selectedEntityId;
    if (actorId === null) return;

    const participant = this.entityManager.getComponent(actorId, BattleParticipantComponent);
    if (!participant) return;

    const occupantId = this.battleGrid.getCell(targetPos).occupantEntityId;

    if (occupantId !== null) {
      if (participant.hasAttacked) return;
      if (this.entityManager.getComponent(occupantId, FactionComponent)?.faction !== Faction.Monster) return;

      if (this.battleSystem.resolveMeleeAttack(this.entityManager, actorId, occupantId, this.battleGrid)) {
        participant.hasAttacked = true;
      }
      return;
    }

    if (participant.hasMoved) return;

    const transform = this.entityManager.getComponent(actorId, TransformComponent);
    if (!transform) return;

    const reachable = computeReachableTiles(this.battleGrid, this.tileRegistry, transform.position, BATTLE_MOVE_RANGE);
    if (!reachable.some((p) => p.x === targetPos.x && p.y === targetPos.y)) return;

    const path = findPath(this.battleGrid, this.tileRegistry, transform.position, targetPos);
    if (!path || path.length === 0) return;

    // Claim the destination instantly, rather than letting `MovementSystem` claim it progressively
    // as the slide animation plays out — otherwise a fast-paced AI turn (or the enemy phase right
    // after) can evaluate reachability before the animation lands and pick the same, still-"free"
    // tile another unit is already committed to, corrupting occupancy for everyone.
    // ponytail: origin tile is freed immediately too, so a unit can be briefly targeted mid-slide
    // (cosmetic sprite overlap only) — upgrade to a proper reserved/occupied distinction if that's
    // ever visible in practice.
    this.battleGrid.getCell(transform.position).occupantEntityId = null;
    this.battleGrid.getCell(targetPos).occupantEntityId = actorId;

    this.entityManager.addComponent(actorId, MovementComponent, new MovementComponent(path));
    participant.hasMoved = true;
    this.logMove(actorId, path.length, targetPos);
    this.updateMovementHighlight();
  }

  private isAlive(id: EntityId): boolean {
    return (this.entityManager.getComponent(id, StatsComponent)?.currentHP ?? 0) > 0;
  }

  /** "Player N" (1-based party slot) for party members, else the monster's display name. */
  private displayName(id: EntityId): string {
    const slot = this.party.getMembers().indexOf(id);
    if (slot !== -1) return `Player ${slot + 1}`;

    const pawnDefinitionId = this.entityManager.getComponent(id, PawnComponent)?.pawnDefinitionId;
    return pawnDefinitionId ? this.pawnRegistry.get(pawnDefinitionId).displayName : "Unknown";
  }

  private logMove(id: EntityId, tilesMoved: number, destination: GridPos): void {
    const tileWord = tilesMoved === 1 ? "space" : "spaces";
    this.battleLogView.log(`${this.displayName(id)} moves ${tilesMoved} ${tileWord}`, `(x: ${destination.x}, y: ${destination.y})`);
  }

  private logAttack(attackerId: EntityId, targetId: EntityId, attackStat: number, defenseStat: number, damage: number): void {
    const attackerIsPlayer = this.entityManager.getComponent(attackerId, FactionComponent)?.faction === Faction.PC;
    this.battleLogView.log(
      `${this.displayName(attackerId)} attacks ${this.displayName(targetId)}`,
      `(Att ${attackStat} vs Def ${defenseStat} = ${damage} dmg)`,
      attackerIsPlayer ? BattleLogEntryKind.PlayerAttack : BattleLogEntryKind.EnemyAttack
    );
  }

  /** Whether the unit can still move (unused move) or attack (unused attack + a living enemy adjacent). */
  private hasAvailableAction(id: EntityId): boolean {
    if (!this.battleGrid) return false;

    const participant = this.entityManager.getComponent(id, BattleParticipantComponent);
    if (!participant) return false;
    if (!participant.hasMoved) return true;
    if (participant.hasAttacked) return false;

    const pos = this.entityManager.getComponent(id, TransformComponent)?.position;
    if (!pos) return false;

    return this.battleGrid.neighbors(pos, false).some((n) => {
      const occupantId = this.battleGrid!.getCell(n).occupantEntityId;
      return occupantId !== null && this.entityManager.getComponent(occupantId, FactionComponent)?.faction === Faction.Monster && this.isAlive(occupantId);
    });
  }

  private computeExhaustedPlayerIds(): Set<EntityId> {
    const exhausted = new Set<EntityId>();
    if (this.battleState.phase !== BattlePhase.Player) return exhausted;

    for (const id of this.entityManager.query(FactionComponent, BattleParticipantComponent)) {
      if (this.entityManager.getComponent(id, FactionComponent)!.faction === Faction.PC && !this.hasAvailableAction(id)) {
        exhausted.add(id);
      }
    }
    return exhausted;
  }

  /** Tab: selects the next player unit that still has a move or attack available, skipping exhausted ones. */
  private cycleSelection(): void {
    const memberIds = this.party.getMembers().filter((id): id is EntityId => id !== null);
    const eligible = memberIds.filter(
      (id) => this.entityManager.hasComponent(id, BattleParticipantComponent) && this.isAlive(id) && this.hasAvailableAction(id)
    );

    if (eligible.length === 0) {
      this.battleState.selectedEntityId = null;
      this.updateMovementHighlight();
      return;
    }

    const currentIndex = this.battleState.selectedEntityId !== null ? eligible.indexOf(this.battleState.selectedEntityId) : -1;
    this.battleState.selectedEntityId = eligible[(currentIndex + 1) % eligible.length]!;
    this.updateMovementHighlight();
  }

  private checkEncounterZones(): void {
    if (this.mode !== GameMode.Overworld) return;

    const position = this.entityManager.getComponent(this.playerEntityId, TransformComponent)?.position;
    if (!position) return;

    const zone = TEST_ENCOUNTER_ZONES.find((z: EncounterZone) =>
      position.x >= z.bounds.x0 && position.x <= z.bounds.x1 && position.y >= z.bounds.y0 && position.y <= z.bounds.y1
    );

    if (!zone) {
      this.activeEncounterZoneId = null;
      return;
    }

    if (this.activeEncounterZoneId !== zone.id) {
      this.activeEncounterZoneId = zone.id;
      const encounterTable = getEncounterTable(zone.encounterTableId);
      this.startBattle(rollEncounter(encounterTable));
    }
  }

  /** Picks up any ground item sitting on the player's own tile straight into the shared inventory
   *  (first free slot; silently dropped if the inventory is full). */
  private checkGroundItemPickups(): void {
    const playerPos = this.entityManager.getComponent(this.playerEntityId, TransformComponent)?.position;
    if (!playerPos) return;

    for (const id of this.entityManager.query(GroundItemComponent, TransformComponent)) {
      const pos = this.entityManager.getComponent(id, TransformComponent)!.position;
      if (pos.x !== playerPos.x || pos.y !== playerPos.y) continue;

      const itemId = this.entityManager.getComponent(id, GroundItemComponent)!.itemId;
      const freeSlot = this.party.getInventory().indexOf(null);
      if (freeSlot !== -1) this.party.setInventorySlot(freeSlot, itemId);
      this.entityManager.destroyEntity(id);
    }
  }

  private startBattle(enemyPawnIds: string[]): void {
    const anchorPos = this.entityManager.getComponent(this.playerEntityId, TransformComponent)?.position;
    if (!anchorPos) return;

    this.battleAnchorWorldPos = anchorPos;
    this.battleReturnPositions = new Map();

    const result = buildBattleGrid(this.grid, anchorPos);
    this.battleGrid = result.grid;

    const anchorBattlePos = result.worldToBattle(anchorPos);
    const memberIds = this.party.getMembers().filter((id): id is EntityId => id !== null);
    const partyPositions = findFreeWalkablePositionsNear(this.battleGrid, this.tileRegistry, anchorBattlePos, memberIds.length);

    memberIds.forEach((id, index) => {
      const transform = this.entityManager.getComponent(id, TransformComponent);
      if (!transform) return;

      this.battleReturnPositions.set(id, transform.position);
      this.grid.getCell(transform.position).occupantEntityId = null;

      const battlePos = partyPositions[index] ?? anchorBattlePos;
      transform.position = battlePos;
      this.battleGrid!.getCell(battlePos).occupantEntityId = id;
      this.entityManager.addComponent(id, BattleParticipantComponent, new BattleParticipantComponent());
      if (!this.entityManager.hasComponent(id, PlayerAiBehaviorComponent)) {
        this.entityManager.addComponent(id, PlayerAiBehaviorComponent, new PlayerAiBehaviorComponent());
      }
    });

    const enemyOrigin = { x: anchorBattlePos.x, y: anchorBattlePos.y - ENCOUNTER_RADIUS };
    const spawnPositions = findFreeWalkablePositionsNear(this.battleGrid, this.tileRegistry, enemyOrigin, enemyPawnIds.length);
    enemyPawnIds.forEach((pawnDefinitionId, index) => {
      const position = spawnPositions[index];
      if (!position) return;
      spawnCombatant(this.entityManager, this.pawnRegistry, this.battleGrid!, pawnDefinitionId, position);
    });

    this.battleGridView = new GridView(this.battleGrid, this.tileRegistry);
    this.battleGridView.build();
    this.renderer.sceneRoot.addChildAt(this.battleGridView.container, 0);
    this.gridView.container.visible = false;
    this.doorView.container.visible = false;
    this.groundItemView.container.visible = false;

    this.camera.setWorldBounds(this.battleGrid.width * TILE_SIZE, this.battleGrid.height * TILE_SIZE);
    const battleCenter = gridToWorld({
      x: Math.floor(this.battleGrid.width / 2),
      y: Math.floor(this.battleGrid.height / 2)
    });
    this.camera.centerOn(battleCenter.x, battleCenter.y);

    this.battleState.reset();
    this.advanceAutoSelection();
    this.pendingEnemyIds = [];
    this.battleInput = new BattleInputController(
      this.renderer.app,
      this.camera,
      this.battleGrid,
      (pos) => this.selectUnit(pos),
      (pos) => this.handleBattleRightClick(pos)
    );
    this.battleHudView.element.hidden = false;
    this.battleActionBarView.element.hidden = false;

    this.playerInput.enabled = false;
    this.mode = GameMode.Battle;
  }

  private showGameOver(): void {
    this.gameOver = true;
    const overlay = document.createElement("div");
    overlay.textContent = "Game Over";
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.75)",
      color: "#cba135",
      fontSize: "48px",
      fontFamily: "sans-serif",
      letterSpacing: "4px",
      zIndex: "100"
    });
    this.renderer.app.canvas.parentElement?.appendChild(overlay);
  }

  /** Rolls `monsterId`'s lootTable (a plain PawnDefinition property — any monster/NPC can have one,
   *  this isn't special-cased per pawn) and drops whatever comes up on the overworld tile the party
   *  returns to (battleAnchorWorldPos), as GroundItemComponent entities the player walks onto to
   *  collect. */
  private dropLootFor(monsterId: EntityId): void {
    const dropPos = this.battleAnchorWorldPos;
    if (!dropPos) return;

    const pawnDefinitionId = this.entityManager.getComponent(monsterId, PawnComponent)?.pawnDefinitionId;
    if (!pawnDefinitionId) return;

    const droppedItemIds = rollLoot(this.pawnRegistry.get(pawnDefinitionId));
    for (const itemId of droppedItemIds) {
      const groundId = this.entityManager.createEntity();
      this.entityManager.addComponent(groundId, TransformComponent, new TransformComponent(dropPos));
      this.entityManager.addComponent(groundId, GroundItemComponent, new GroundItemComponent(itemId));
    }
  }

  private endBattle(outcome: BattleOutcome): void {
    if (!this.battleGrid || !this.battleGridView) return;

    this.battleInput?.destroy();
    this.battleInput = undefined;

    if (outcome === BattleOutcome.Defeat) {
      this.battleHudView.element.hidden = true;
      this.battleActionBarView.element.hidden = true;
      this.showGameOver();
      return;
    }

    this.battleHudView.element.hidden = true;
    this.battleActionBarView.element.hidden = true;
    this.pendingEnemyIds = [];

    for (const id of this.entityManager.query(FactionComponent, BattleParticipantComponent)) {
      if (this.entityManager.getComponent(id, FactionComponent)?.faction === Faction.Monster) {
        this.dropLootFor(id);
        this.entityManager.destroyEntity(id);
      }
    }

    for (const [id, worldPos] of this.battleReturnPositions) {
      const transform = this.entityManager.getComponent(id, TransformComponent);
      if (!transform) continue;
      transform.position = worldPos;
      if (id === this.playerEntityId) {
        this.grid.getCell(worldPos).occupantEntityId = id;
      }
      this.entityManager.removeComponent(id, BattleParticipantComponent);
    }

    this.renderer.sceneRoot.removeChild(this.battleGridView.container);
    this.battleGridView.container.destroy({ children: true });
    this.battleGridView = undefined;
    this.battleGrid = undefined;
    this.battleReturnPositions = new Map();

    this.gridView.container.visible = true;
    this.doorView.container.visible = true;
    this.groundItemView.container.visible = true;

    this.camera.setWorldBounds(GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    this.camera.manualOverride = false; // resume following the leader back in the overworld
    if (this.battleAnchorWorldPos) {
      const worldCenter = gridToWorld(this.battleAnchorWorldPos);
      this.camera.centerOn(worldCenter.x, worldCenter.y);
    }

    this.playerInput.enabled = true;
    this.activeEncounterZoneId = null;
    this.mode = GameMode.Overworld;
  }

  private render(): void {
    if (this.mode === GameMode.Battle) {
      const selectedId = this.battleState.selectedEntityId;
      this.pawnView.setActiveEntity(selectedId);
      this.partyBarView.setActiveMember(selectedId);
      this.battleHudView.sync(selectedId);
      this.battleActionBarView.sync(selectedId);
      this.battleActionBarView.element.hidden = this.battleState.phase !== BattlePhase.Player;
      this.pawnView.setDimmedEntities(this.computeExhaustedPlayerIds());
      this.pawnView.setShowHpBars(true);
      this.pawnView.setHiddenEntities(new Set());
    } else {
      this.pawnView.setActiveEntity(null);
      this.partyBarView.setActiveMember(this.playerEntityId);
      this.pawnView.setDimmedEntities(new Set());
      this.pawnView.setShowHpBars(false);
      this.battleActionBarView.element.hidden = true;
      const nonLeaderMembers = this.party.getMembers().filter((id): id is EntityId => id !== null && id !== this.playerEntityId);
      this.pawnView.setHiddenEntities(new Set(nonLeaderMembers));
      this.doorView.sync();
      this.groundItemView.sync();
    }
    this.partyBarView.sync();
    if (this.characterSheetView.isVisible()) this.characterSheetView.sync();
    this.pawnView.sync();
    this.renderer.render();
  }
}
