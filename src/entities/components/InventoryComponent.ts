import type { Component } from "./Component";

export class InventoryComponent implements Component {
  constructor(public itemIds: string[] = []) {}
}
