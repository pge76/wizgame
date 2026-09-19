import { EquipmentSlot } from "@entities/components/EquipmentComponent";
import { ItemKind, WeaponClass, type ItemDefinition } from "@data/resources/ItemDefinition";

/**
 * Small procedurally-drawn vector icons for items (weapons by WeaponClass silhouette, armor by
 * EquipmentSlot silhouette) — same "flat vector primitives" style as the pawn portraits
 * (PortraitSvg.ts), not imported artwork. Wizardry 7's own icons are copyrighted game assets, so
 * this deliberately doesn't reuse or reference them.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const OUTLINE_COLOR = "#1a1512";
const METAL_COLOR = "#c9c9c9";
const GRIP_COLOR = "#6b4a2a";
const ARMOR_COLOR = "#a07a3f";
const GEM_COLOR = "#7fb0d0";

const VIEW_BOX = "0 0 24 24";

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function group(...children: SVGElement[]): SVGGElement {
  const g = el("g", {});
  for (const child of children) g.appendChild(child);
  return g;
}

function outlined(attrs: Record<string, string | number>, strokeWidth = 0.8): Record<string, string | number> {
  return { stroke: OUTLINE_COLOR, "stroke-width": strokeWidth, ...attrs };
}

/** Builds this item's icon. Falls back to a small generic gem shape for Misc items and any armor
 *  slot without a dedicated silhouette (Cloak/Gloves/Boots/Ring/Neck — none of the sample content
 *  uses these yet). */
export function buildItemIconSvg(item: ItemDefinition): SVGSVGElement {
  const svg = el("svg", { viewBox: VIEW_BOX, class: "item-icon" });

  const content =
    item.kind === ItemKind.Weapon
      ? drawWeaponIcon(item.weaponClass, item.twoHanded)
      : item.kind === ItemKind.Armor
        ? drawArmorIcon(item.equipSlot)
        : drawGemIcon();

  svg.appendChild(content);
  return svg;
}

function drawWeaponIcon(weaponClass: WeaponClass, twoHanded: boolean): SVGElement {
  switch (weaponClass) {
    case WeaponClass.Dagger:
      return drawBladeIcon(9, 3);
    case WeaponClass.Sword:
      return drawBladeIcon(twoHanded ? 5 : 7, twoHanded ? 4.5 : 4);
    case WeaponClass.Blunt:
      return drawBluntIcon();
    case WeaponClass.Ranged:
      return drawBowIcon();
  }
}

/** A blade tapering to a point, a crossguard, and a short grip — shared shape for daggers/swords,
 *  parameterized by how far up the blade tip reaches and how wide the crossguard is. */
function drawBladeIcon(tipY: number, guardHalfWidth: number): SVGElement {
  const bladeHalfWidth = guardHalfWidth * 0.28;
  return group(
    el("path", outlined({ d: `M 12 ${tipY} L ${12 + bladeHalfWidth} 16 L ${12 - bladeHalfWidth} 16 Z`, fill: METAL_COLOR })),
    el("line", outlined({ x1: 12 - guardHalfWidth, y1: 16, x2: 12 + guardHalfWidth, y2: 16 }, 1.4)),
    el("rect", outlined({ x: 10.7, y: 16, width: 2.6, height: 4.5, rx: 0.8, fill: GRIP_COLOR }))
  );
}

/** A club-like handle topped with a round, studded head — reads as both mace and hammer. */
function drawBluntIcon(): SVGElement {
  return group(
    el("rect", outlined({ x: 10.8, y: 11, width: 2.4, height: 9, rx: 0.8, fill: GRIP_COLOR })),
    el("circle", outlined({ cx: 12, cy: 8, r: 4, fill: METAL_COLOR })),
    el("circle", { cx: 12, cy: 8, r: 1, fill: OUTLINE_COLOR }),
    el("circle", { cx: 9.3, cy: 6.3, r: 0.9, fill: OUTLINE_COLOR }),
    el("circle", { cx: 14.7, cy: 6.3, r: 0.9, fill: OUTLINE_COLOR }),
    el("circle", { cx: 9.3, cy: 9.7, r: 0.9, fill: OUTLINE_COLOR }),
    el("circle", { cx: 14.7, cy: 9.7, r: 0.9, fill: OUTLINE_COLOR })
  );
}

function drawBowIcon(): SVGElement {
  return group(
    el("path", outlined({ d: "M 8 4 Q 4 12 8 20", fill: "none" }, 1.2)),
    el("line", outlined({ x1: 8, y1: 4, x2: 8, y2: 20 }, 0.6))
  );
}

function drawArmorIcon(slot: EquipmentSlot): SVGElement {
  switch (slot) {
    case EquipmentSlot.Head:
      return drawHelmetIcon();
    case EquipmentSlot.Torso:
      return drawTorsoIcon();
    case EquipmentSlot.Legs:
      return drawLegsIcon();
    default:
      return drawGemIcon();
  }
}

function drawHelmetIcon(): SVGElement {
  return group(
    el("path", outlined({ d: "M 6 15 A 6 6 0 0 1 18 15 Z", fill: ARMOR_COLOR })),
    el("rect", outlined({ x: 5.5, y: 14.5, width: 13, height: 2, rx: 0.6, fill: ARMOR_COLOR }))
  );
}

function drawTorsoIcon(): SVGElement {
  return el(
    "path",
    outlined({
      d: "M 9 4 L 15 4 L 17 7 L 15 8.5 L 15 20 L 9 20 L 9 8.5 L 7 7 Z",
      fill: ARMOR_COLOR
    })
  );
}

function drawLegsIcon(): SVGElement {
  return group(
    el("rect", outlined({ x: 8, y: 4, width: 8, height: 6, rx: 1, fill: ARMOR_COLOR })),
    el("rect", outlined({ x: 8, y: 10, width: 3.2, height: 10, rx: 1, fill: ARMOR_COLOR })),
    el("rect", outlined({ x: 12.8, y: 10, width: 3.2, height: 10, rx: 1, fill: ARMOR_COLOR }))
  );
}

function drawGemIcon(): SVGElement {
  return el("path", outlined({ d: "M 12 5 L 18 11 L 12 19 L 6 11 Z", fill: GEM_COLOR }));
}
