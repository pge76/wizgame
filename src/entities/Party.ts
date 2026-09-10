import type { EntityId } from "./Entity";

export const PARTY_SIZE = 6;
export const PARTY_INVENTORY_SIZE = 16;

export class Party {
  private readonly memberIds: (EntityId | null)[] = new Array(PARTY_SIZE).fill(null);
  private readonly itemIds: (string | null)[] = new Array(PARTY_INVENTORY_SIZE).fill(null);

  setMember(slot: number, id: EntityId): void {
    this.assertSlot(slot, PARTY_SIZE);
    this.memberIds[slot] = id;
  }

  getMember(slot: number): EntityId | null {
    this.assertSlot(slot, PARTY_SIZE);
    return this.memberIds[slot] ?? null;
  }

  getMembers(): readonly (EntityId | null)[] {
    return this.memberIds;
  }

  /** Shared party inventory — every party member sees the same items. */
  getInventory(): readonly (string | null)[] {
    return this.itemIds;
  }

  setInventorySlot(slot: number, itemId: string | null): void {
    this.assertSlot(slot, PARTY_INVENTORY_SIZE);
    this.itemIds[slot] = itemId;
  }

  private assertSlot(slot: number, size: number): void {
    if (slot < 0 || slot >= size) {
      throw new Error(`Invalid slot: ${slot}`);
    }
  }
}
