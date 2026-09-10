import { Graphics } from "pixi.js";
import type {
  BodyShapeId,
  EyeStyleId,
  HairStyleId,
  HeadShapeId
} from "@data/resources/AppearanceDefinition";
import {
  BODY_BOTTOM_Y,
  BODY_CORNER_RADIUS,
  BODY_TOP_Y,
  BODY_WIDTH,
  HEAD_CENTER_Y,
  HEAD_RADIUS_X,
  HEAD_RADIUS_Y,
  PAWN_CENTER_X
} from "./PawnLayout";

const OUTLINE_COLOR = 0x1a1512;
const OUTLINE_WIDTH = 1.25;

export function drawBody(shapeId: BodyShapeId, color: number): Graphics {
  const width = BODY_WIDTH[shapeId];
  const radius = BODY_CORNER_RADIUS[shapeId];
  const height = BODY_BOTTOM_Y - BODY_TOP_Y;

  return new Graphics()
    .roundRect(PAWN_CENTER_X - width / 2, BODY_TOP_Y, width, height, radius)
    .fill(color)
    .stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
}

export function drawHead(shapeId: HeadShapeId, color: number): Graphics {
  const rx = HEAD_RADIUS_X[shapeId];
  const ry = HEAD_RADIUS_Y[shapeId];

  return new Graphics()
    .ellipse(PAWN_CENTER_X, HEAD_CENTER_Y, rx, ry)
    .fill(color)
    .stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
}

export function drawHair(styleId: HairStyleId, headShapeId: HeadShapeId, color: number): Graphics | null {
  if (styleId === "none") {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const graphics = new Graphics();

  switch (styleId) {
    case "shortCap": {
      const capRx = headRx * 1.08;
      graphics
        .moveTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
        .arc(PAWN_CENTER_X, HEAD_CENTER_Y, capRx, Math.PI, 0, false)
        .lineTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
        .fill(color);
      break;
    }
    case "sideLocks": {
      const lockRadius = headRx * 0.4;
      const lockY = HEAD_CENTER_Y + headRy * 0.15;
      graphics
        .circle(PAWN_CENTER_X - headRx * 0.9, lockY, lockRadius)
        .fill(color)
        .circle(PAWN_CENTER_X + headRx * 0.9, lockY, lockRadius)
        .fill(color);
      break;
    }
    case "topKnot": {
      const knotRadius = headRx * 0.4;
      graphics.circle(PAWN_CENTER_X, HEAD_CENTER_Y - headRy * 1.15, knotRadius).fill(color);
      break;
    }
  }

  return graphics;
}

export function drawEyes(styleId: EyeStyleId, headShapeId: HeadShapeId): Graphics {
  const headRx = HEAD_RADIUS_X[headShapeId];
  const eyeOffsetX = headRx * 0.4;
  const eyeY = HEAD_CENTER_Y + HEAD_RADIUS_Y[headShapeId] * 0.1;
  const graphics = new Graphics();

  if (styleId === "dots") {
    graphics
      .circle(PAWN_CENTER_X - eyeOffsetX, eyeY, 1.3)
      .fill(OUTLINE_COLOR)
      .circle(PAWN_CENTER_X + eyeOffsetX, eyeY, 1.3)
      .fill(OUTLINE_COLOR);
  } else {
    const halfWidth = 2;
    graphics
      .moveTo(PAWN_CENTER_X - eyeOffsetX - halfWidth, eyeY)
      .lineTo(PAWN_CENTER_X - eyeOffsetX + halfWidth, eyeY)
      .moveTo(PAWN_CENTER_X + eyeOffsetX - halfWidth, eyeY)
      .lineTo(PAWN_CENTER_X + eyeOffsetX + halfWidth, eyeY)
      .stroke({ color: OUTLINE_COLOR, width: 1.2 });
  }

  return graphics;
}
