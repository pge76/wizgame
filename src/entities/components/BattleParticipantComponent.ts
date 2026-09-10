import type { Component } from "./Component";

export class BattleParticipantComponent implements Component {
  constructor(
    public hasMoved = false,
    public hasAttacked = false
  ) {}
}
