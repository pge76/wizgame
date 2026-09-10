import type { AppearanceDefinition } from "@data/resources/AppearanceDefinition";
import {
  BODY_BOTTOM_Y,
  BODY_CORNER_RADIUS,
  BODY_TOP_Y,
  BODY_WIDTH,
  HEAD_CENTER_Y,
  HEAD_RADIUS_X,
  HEAD_RADIUS_Y,
  PAWN_CENTER_X
} from "@rendering/pawn/PawnLayout";

const OUTLINE_COLOR = "#1a1512";
const OUTLINE_WIDTH = 1.25;
const SVG_NS = "http://www.w3.org/2000/svg";

// Tight crop around the head, independent of the full tile-sized body layout.
const VIEW_BOX = "4 -2 24 25";

// Head + body, tall enough to include the full pawn layout.
const FULL_VIEW_BOX = "2 -2 28 36";

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/** Builds a crisp, resolution-independent SVG portrait (head, hair, eyes — no body). */
export function buildPortraitSvg(appearance: AppearanceDefinition): SVGSVGElement {
  const svg = el("svg", { viewBox: VIEW_BOX, class: "party-bar__portrait" });

  svg.appendChild(drawHead(appearance.headShapeId, appearance.skinColor));

  const hair = drawHair(appearance.hairStyleId, appearance.headShapeId, appearance.hairColor);
  if (hair) {
    svg.appendChild(hair);
  }

  svg.appendChild(drawEyes(appearance.eyeStyleId, appearance.headShapeId));

  return svg;
}

/** Builds a full head-to-toe SVG portrait (body + head + hair + eyes), for battle turn-order chips. */
export function buildFullPortraitSvg(appearance: AppearanceDefinition): SVGSVGElement {
  const svg = el("svg", { viewBox: FULL_VIEW_BOX, class: "party-bar__portrait" });

  svg.appendChild(drawBody(appearance.bodyShapeId, appearance.skinColor));
  svg.appendChild(drawHead(appearance.headShapeId, appearance.skinColor));

  const hair = drawHair(appearance.hairStyleId, appearance.headShapeId, appearance.hairColor);
  if (hair) {
    svg.appendChild(hair);
  }

  svg.appendChild(drawEyes(appearance.eyeStyleId, appearance.headShapeId));

  return svg;
}

function drawBody(shapeId: AppearanceDefinition["bodyShapeId"], color: number): SVGElement {
  const width = BODY_WIDTH[shapeId];
  return el("rect", {
    x: PAWN_CENTER_X - width / 2,
    y: BODY_TOP_Y,
    width,
    height: BODY_BOTTOM_Y - BODY_TOP_Y,
    rx: BODY_CORNER_RADIUS[shapeId],
    fill: colorToCss(color),
    stroke: OUTLINE_COLOR,
    "stroke-width": OUTLINE_WIDTH
  });
}

function drawHead(shapeId: AppearanceDefinition["headShapeId"], color: number): SVGElement {
  return el("ellipse", {
    cx: PAWN_CENTER_X,
    cy: HEAD_CENTER_Y,
    rx: HEAD_RADIUS_X[shapeId],
    ry: HEAD_RADIUS_Y[shapeId],
    fill: colorToCss(color),
    stroke: OUTLINE_COLOR,
    "stroke-width": OUTLINE_WIDTH
  });
}

function drawHair(
  styleId: AppearanceDefinition["hairStyleId"],
  headShapeId: AppearanceDefinition["headShapeId"],
  color: number
): SVGElement | null {
  if (styleId === "none") {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const fill = colorToCss(color);

  switch (styleId) {
    case "shortCap": {
      const capRx = headRx * 1.08;
      const left = PAWN_CENTER_X - capRx;
      const right = PAWN_CENTER_X + capRx;
      return el("path", {
        d: `M ${left} ${HEAD_CENTER_Y} A ${capRx} ${capRx} 0 0 1 ${right} ${HEAD_CENTER_Y} Z`,
        fill
      });
    }
    case "sideLocks": {
      const lockRadius = headRx * 0.4;
      const lockY = HEAD_CENTER_Y + headRy * 0.15;
      const group = el("g", {});
      group.appendChild(el("circle", { cx: PAWN_CENTER_X - headRx * 0.9, cy: lockY, r: lockRadius, fill }));
      group.appendChild(el("circle", { cx: PAWN_CENTER_X + headRx * 0.9, cy: lockY, r: lockRadius, fill }));
      return group;
    }
    case "topKnot": {
      const knotRadius = headRx * 0.4;
      return el("circle", {
        cx: PAWN_CENTER_X,
        cy: HEAD_CENTER_Y - headRy * 1.15,
        r: knotRadius,
        fill
      });
    }
  }
}

function drawEyes(
  styleId: AppearanceDefinition["eyeStyleId"],
  headShapeId: AppearanceDefinition["headShapeId"]
): SVGElement {
  const headRx = HEAD_RADIUS_X[headShapeId];
  const eyeOffsetX = headRx * 0.4;
  const eyeY = HEAD_CENTER_Y + HEAD_RADIUS_Y[headShapeId] * 0.1;
  const group = el("g", {});

  if (styleId === "dots") {
    group.appendChild(el("circle", { cx: PAWN_CENTER_X - eyeOffsetX, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR }));
    group.appendChild(el("circle", { cx: PAWN_CENTER_X + eyeOffsetX, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR }));
  } else {
    const halfWidth = 2;
    const lineAttrs = { stroke: OUTLINE_COLOR, "stroke-width": 1.2 };
    group.appendChild(
      el("line", {
        x1: PAWN_CENTER_X - eyeOffsetX - halfWidth,
        y1: eyeY,
        x2: PAWN_CENTER_X - eyeOffsetX + halfWidth,
        y2: eyeY,
        ...lineAttrs
      })
    );
    group.appendChild(
      el("line", {
        x1: PAWN_CENTER_X + eyeOffsetX - halfWidth,
        y1: eyeY,
        x2: PAWN_CENTER_X + eyeOffsetX + halfWidth,
        y2: eyeY,
        ...lineAttrs
      })
    );
  }

  return group;
}
