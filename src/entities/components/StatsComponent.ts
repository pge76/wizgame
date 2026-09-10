import type { Component } from "./Component";

export class StatsComponent implements Component {
  constructor(
    public maxHP: number,
    public currentHP: number,
    public attack: number,
    public defense: number,
    public initiative: number
  ) {}
}
