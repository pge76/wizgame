import { EyeStyle, FacialFeature, HairStyle, type AppearanceDefinition } from "@data/resources/AppearanceDefinition";
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
const METAL_COLOR = "#c9c9c9";
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

function group(...children: SVGElement[]): SVGGElement {
  const g = el("g", {});
  for (const child of children) {
    g.appendChild(child);
  }
  return g;
}

function appendParts(svg: SVGSVGElement, appearance: AppearanceDefinition, includeBody: boolean): void {
  if (includeBody) {
    svg.appendChild(drawBody(appearance.bodyShape, appearance.skinColor));
  }
  svg.appendChild(drawHead(appearance.headShape, appearance.skinColor));

  const hair = drawHair(appearance.hairStyle, appearance.headShape, appearance.hairColor);
  if (hair) {
    svg.appendChild(hair);
  }

  svg.appendChild(drawEyes(appearance.eyeStyle, appearance.headShape));

  const feature = drawFacialFeature(appearance.facialFeature, appearance.headShape);
  if (feature) {
    svg.appendChild(feature);
  }
}

/** Builds a crisp, resolution-independent SVG portrait (head, hair, eyes — no body). */
export function buildPortraitSvg(appearance: AppearanceDefinition): SVGSVGElement {
  const svg = el("svg", { viewBox: VIEW_BOX, class: "party-bar__portrait" });
  appendParts(svg, appearance, false);
  return svg;
}

/** Builds a full head-to-toe SVG portrait (body + head + hair + eyes), for battle turn-order chips. */
export function buildFullPortraitSvg(appearance: AppearanceDefinition): SVGSVGElement {
  const svg = el("svg", { viewBox: FULL_VIEW_BOX, class: "party-bar__portrait" });
  appendParts(svg, appearance, true);
  return svg;
}

function drawBody(shapeId: AppearanceDefinition["bodyShape"], color: number): SVGElement {
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

function drawHead(shapeId: AppearanceDefinition["headShape"], color: number): SVGElement {
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

function capPath(capRx: number, apexDx = 0, apexDy = 0): string {
  const left = PAWN_CENTER_X - capRx;
  const right = PAWN_CENTER_X + capRx;
  const apexX = PAWN_CENTER_X + apexDx;
  const apexY = HEAD_CENTER_Y + apexDy;
  return `M ${left} ${HEAD_CENTER_Y} A ${capRx} ${capRx} 0 0 1 ${apexX + capRx} ${apexY} A ${capRx} ${capRx} 0 0 1 ${right} ${HEAD_CENTER_Y} Z`;
}

function drawHair(
  styleId: AppearanceDefinition["hairStyle"],
  headShapeId: AppearanceDefinition["headShape"],
  color: number
): SVGElement | null {
  if (styleId === HairStyle.Bald) {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const fill = colorToCss(color);
  const capRx = headRx * 1.08;
  const cap = (): SVGElement =>
    el("path", { d: `M ${PAWN_CENTER_X - capRx} ${HEAD_CENTER_Y} A ${capRx} ${capRx} 0 0 1 ${PAWN_CENTER_X + capRx} ${HEAD_CENTER_Y} Z`, fill });

  switch (styleId) {
    case HairStyle.SidePart: {
      const apexX = PAWN_CENTER_X + headRx * 0.25;
      const apexY = HEAD_CENTER_Y - headRy * 0.15;
      return el("path", { d: capPath(capRx, apexX - PAWN_CENTER_X, apexY - HEAD_CENTER_Y), fill });
    }
    case HairStyle.Messy: {
      const g = group(cap());
      const spikeCount = 5;
      for (let i = 0; i < spikeCount; i++) {
        const t = i / (spikeCount - 1);
        const x = PAWN_CENTER_X - capRx * 0.8 + t * capRx * 1.6;
        const baseY = HEAD_CENTER_Y - headRy * 0.55;
        g.appendChild(
          el("path", { d: `M ${x - 1.5} ${baseY} L ${x} ${baseY - 3 - (i % 2)} L ${x + 1.5} ${baseY} Z`, fill })
        );
      }
      return g;
    }
    case HairStyle.Curly: {
      const g = group(cap());
      const bumpCount = 4;
      for (let i = 0; i < bumpCount; i++) {
        const t = i / (bumpCount - 1);
        const x = PAWN_CENTER_X - capRx * 0.75 + t * capRx * 1.5;
        g.appendChild(el("circle", { cx: x, cy: HEAD_CENTER_Y - headRy * 0.6, r: headRx * 0.28, fill }));
      }
      return g;
    }
    case HairStyle.Mohawk: {
      const stripWidth = headRx * 0.35;
      const topY = HEAD_CENTER_Y - headRy * 1.5;
      const baseY = HEAD_CENTER_Y - headRy * 0.3;
      return el("path", {
        d: `M ${PAWN_CENTER_X - stripWidth} ${baseY} L ${PAWN_CENTER_X - stripWidth * 0.6} ${topY} L ${PAWN_CENTER_X + stripWidth * 0.6} ${topY} L ${PAWN_CENTER_X + stripWidth} ${baseY} Z`,
        fill
      });
    }
    case HairStyle.Bun:
      return group(
        cap(),
        el("circle", { cx: PAWN_CENTER_X, cy: HEAD_CENTER_Y - headRy * 1.25, r: headRx * 0.32, fill })
      );
    case HairStyle.LongStraight: {
      const sideWidth = headRx * 0.35;
      return group(
        cap(),
        el("rect", { x: PAWN_CENTER_X - capRx, y: HEAD_CENTER_Y - headRy * 0.2, width: sideWidth, height: headRy * 1.8, fill }),
        el("rect", {
          x: PAWN_CENTER_X + capRx - sideWidth,
          y: HEAD_CENTER_Y - headRy * 0.2,
          width: sideWidth,
          height: headRy * 1.8,
          fill
        })
      );
    }
  }
}

function drawEyes(
  styleId: AppearanceDefinition["eyeStyle"],
  headShapeId: AppearanceDefinition["headShape"]
): SVGElement {
  const headRx = HEAD_RADIUS_X[headShapeId];
  const offsetX = styleId === EyeStyle.WideSet ? headRx * 0.55 : headRx * 0.4;
  const eyeY = HEAD_CENTER_Y + HEAD_RADIUS_Y[headShapeId] * 0.1;
  const cx1 = PAWN_CENTER_X - offsetX;
  const cx2 = PAWN_CENTER_X + offsetX;
  const lineAttrs = { stroke: OUTLINE_COLOR, "stroke-width": 1.2 };

  switch (styleId) {
    case EyeStyle.Round:
      return group(
        el("circle", { cx: cx1, cy: eyeY, r: 1.6, fill: OUTLINE_COLOR }),
        el("circle", { cx: cx2, cy: eyeY, r: 1.6, fill: OUTLINE_COLOR })
      );
    case EyeStyle.WideSet:
      return group(
        el("circle", { cx: cx1 - 1, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR }),
        el("circle", { cx: cx2 + 1, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR })
      );
    case EyeStyle.Narrow:
      return group(
        el("line", { x1: cx1 - 2, y1: eyeY, x2: cx1 + 2, y2: eyeY, ...lineAttrs }),
        el("line", { x1: cx2 - 2, y1: eyeY, x2: cx2 + 2, y2: eyeY, ...lineAttrs })
      );
    case EyeStyle.Almond:
      return group(
        el("ellipse", { cx: cx1, cy: eyeY, rx: 2, ry: 1, fill: OUTLINE_COLOR }),
        el("ellipse", { cx: cx2, cy: eyeY, rx: 2, ry: 1, fill: OUTLINE_COLOR })
      );
    case EyeStyle.Asymmetric:
      return group(
        el("circle", { cx: cx1, cy: eyeY, r: 1.8, fill: OUTLINE_COLOR }),
        el("circle", { cx: cx2, cy: eyeY, r: 1.1, fill: OUTLINE_COLOR })
      );
    case EyeStyle.DeepSet:
      return group(
        el("line", { x1: cx1 - 2, y1: eyeY - 2, x2: cx1 + 2, y2: eyeY - 2, stroke: OUTLINE_COLOR, "stroke-width": 1 }),
        el("line", { x1: cx2 - 2, y1: eyeY - 2, x2: cx2 + 2, y2: eyeY - 2, stroke: OUTLINE_COLOR, "stroke-width": 1 }),
        el("circle", { cx: cx1, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR }),
        el("circle", { cx: cx2, cy: eyeY, r: 1.3, fill: OUTLINE_COLOR })
      );
    case EyeStyle.Slit:
      return group(
        el("line", { x1: cx1, y1: eyeY - 2, x2: cx1, y2: eyeY + 2, stroke: OUTLINE_COLOR, "stroke-width": 1.4 }),
        el("line", { x1: cx2, y1: eyeY - 2, x2: cx2, y2: eyeY + 2, stroke: OUTLINE_COLOR, "stroke-width": 1.4 })
      );
    case EyeStyle.Magic:
      return group(
        el("circle", { cx: cx1, cy: eyeY, r: 1.6, fill: "#f5f0e6", stroke: OUTLINE_COLOR, "stroke-width": 0.6 }),
        el("circle", { cx: cx2, cy: eyeY, r: 1.6, fill: "#f5f0e6", stroke: OUTLINE_COLOR, "stroke-width": 0.6 })
      );
    case EyeStyle.Squint:
      return group(
        el("circle", { cx: cx1, cy: eyeY, r: 1.5, fill: OUTLINE_COLOR }),
        el("line", { x1: cx2 - 2, y1: eyeY, x2: cx2 + 2, y2: eyeY, ...lineAttrs })
      );
  }
}

function drawFacialFeature(
  featureId: AppearanceDefinition["facialFeature"],
  headShapeId: AppearanceDefinition["headShape"]
): SVGElement | null {
  if (featureId === FacialFeature.None) {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const mouthY = HEAD_CENTER_Y + headRy * 0.55;

  switch (featureId) {
    case FacialFeature.EyePatch:
      return group(
        el("circle", { cx: PAWN_CENTER_X + headRx * 0.4, cy: HEAD_CENTER_Y + headRy * 0.1, r: 2.4, fill: OUTLINE_COLOR }),
        el("line", {
          x1: PAWN_CENTER_X + headRx * 0.4,
          y1: HEAD_CENTER_Y - headRy * 0.9,
          x2: PAWN_CENTER_X + headRx * 0.4,
          y2: HEAD_CENTER_Y + headRy * 0.9,
          stroke: OUTLINE_COLOR,
          "stroke-width": 0.8
        })
      );
    case FacialFeature.Freckles: {
      const spots: Array<[number, number]> = [
        [-0.55, 0.35],
        [-0.3, 0.5],
        [0.3, 0.5],
        [0.55, 0.35]
      ];
      const g = group();
      for (const [dx, dy] of spots) {
        g.appendChild(
          el("circle", { cx: PAWN_CENTER_X + headRx * dx, cy: HEAD_CENTER_Y + headRy * dy, r: 0.5, fill: "#8a5a3a" })
        );
      }
      return g;
    }
    case FacialFeature.Tattoo:
      return el("line", {
        x1: PAWN_CENTER_X - headRx * 0.45,
        y1: HEAD_CENTER_Y + headRy * 0.3,
        x2: PAWN_CENTER_X - headRx * 0.3,
        y2: HEAD_CENTER_Y + headRy * 0.55,
        stroke: "#3a4f8a",
        "stroke-width": 0.8
      });
    case FacialFeature.Mole:
      return el("circle", { cx: PAWN_CENTER_X + headRx * 0.35, cy: mouthY, r: 0.6, fill: "#3a2a20" });
    case FacialFeature.MissingTooth:
      return group(
        el("path", {
          d: `M ${PAWN_CENTER_X - headRx * 0.35} ${mouthY} L ${PAWN_CENTER_X - headRx * 0.05} ${mouthY + 0.5} L ${PAWN_CENTER_X + headRx * 0.05} ${mouthY} L ${PAWN_CENTER_X + headRx * 0.35} ${mouthY + 0.5}`,
          fill: "none",
          stroke: OUTLINE_COLOR,
          "stroke-width": 0.9
        }),
        el("rect", { x: PAWN_CENTER_X - headRx * 0.05, y: mouthY - 0.6, width: headRx * 0.1, height: 1.2, fill: "#f5f0e6" })
      );
    case FacialFeature.Piercing:
      return el("circle", { cx: PAWN_CENTER_X - headRx * 0.75, cy: HEAD_CENTER_Y + headRy * 0.3, r: 0.5, fill: METAL_COLOR });
    case FacialFeature.Monocle:
      return group(
        el("circle", { cx: PAWN_CENTER_X + headRx * 0.4, cy: HEAD_CENTER_Y + headRy * 0.1, r: 2.6, fill: "none", stroke: METAL_COLOR, "stroke-width": 0.7 }),
        el("line", {
          x1: PAWN_CENTER_X + headRx * 0.4 + 2.6,
          y1: HEAD_CENTER_Y + headRy * 0.1,
          x2: PAWN_CENTER_X + headRx * 0.7,
          y2: HEAD_CENTER_Y + headRy * 1.3,
          stroke: METAL_COLOR,
          "stroke-width": 0.5
        })
      );
  }
}
