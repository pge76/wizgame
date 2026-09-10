import type { Component } from "./Component";
import { PlayerAiBehavior } from "@data/resources/PlayerAiBehavior";

export class PlayerAiBehaviorComponent implements Component {
  constructor(
    public behavior: PlayerAiBehavior = PlayerAiBehavior.Melee,
    /** Whether this unit currently acts automatically each player turn, using `behavior`. */
    public autoEngaged = false,
    /** Tiles still to retreat before Melee AI resumes attacking, once HP drops below the flee threshold. */
    public fleeTilesRemaining = 0
  ) {}
}
