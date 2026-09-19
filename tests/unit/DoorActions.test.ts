import { describe, expect, it } from "vitest";
import { DoorComponent } from "@entities/components/DoorComponent";
import { tryOpenDoor } from "@entities/DoorActions";

describe("tryOpenDoor", () => {
  it("always opens an unlocked door (requiredItemId null)", () => {
    const door = new DoorComponent(null);
    expect(tryOpenDoor(door, [])).toBe(true);
    expect(door.isOpen).toBe(true);
  });

  it("opens a locked door when the required key is in the inventory", () => {
    const door = new DoorComponent("item.key.rusty-key");
    expect(tryOpenDoor(door, [null, "item.key.rusty-key", "item.weapon.dagger"])).toBe(true);
    expect(door.isOpen).toBe(true);
  });

  it("does not open a locked door without the required key", () => {
    const door = new DoorComponent("item.key.rusty-key");
    expect(tryOpenDoor(door, [null, "item.weapon.dagger"])).toBe(false);
    expect(door.isOpen).toBe(false);
  });

  it("does not remove the key from the inventory", () => {
    const door = new DoorComponent("item.key.rusty-key");
    const inventory = [null, "item.key.rusty-key"];
    tryOpenDoor(door, inventory);
    expect(inventory).toContain("item.key.rusty-key");
  });

  it("is idempotent once already open", () => {
    const door = new DoorComponent("item.key.rusty-key");
    door.isOpen = true;
    expect(tryOpenDoor(door, [])).toBe(true);
  });
});
