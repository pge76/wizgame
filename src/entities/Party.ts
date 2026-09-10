import type { EntityId } from "./Entity";

export const PARTY_SIZE = 6;

export class Party {
  private readonly memberIds: (EntityId | null)[] = new Array(PARTY_SIZE).fill(null);

  setMember(slot: number, id: EntityId): void {
    this.assertSlot(slot);
    this.memberIds[slot] = id;
  }

  getMember(slot: number): EntityId | null {
    this.assertSlot(slot);
    return this.memberIds[slot] ?? null;
  }

  getMembers(): readonly (EntityId | null)[] {
    return this.memberIds;
  }

  private assertSlot(slot: number): void {
    if (slot < 0 || slot >= PARTY_SIZE) {
      throw new Error(`Invalid party slot: ${slot}`);
    }
  }
}
