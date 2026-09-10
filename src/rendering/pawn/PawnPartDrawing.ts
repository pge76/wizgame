import { Graphics } from "pixi.js";
import {
  BodyShape,
  EyeStyle,
  FacialFeature,
  HairStyle,
  HeadShape
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
const METAL_COLOR = 0xc9c9c9;

export function drawBody(shapeId: BodyShape, color: number): Graphics {
  const width = BODY_WIDTH[shapeId];
  const radius = BODY_CORNER_RADIUS[shapeId];
  const height = BODY_BOTTOM_Y - BODY_TOP_Y;

  return new Graphics()
    .roundRect(PAWN_CENTER_X - width / 2, BODY_TOP_Y, width, height, radius)
    .fill(color)
    .stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
}

export function drawHead(shapeId: HeadShape, color: number): Graphics {
  const rx = HEAD_RADIUS_X[shapeId];
  const ry = HEAD_RADIUS_Y[shapeId];

  return new Graphics()
    .ellipse(PAWN_CENTER_X, HEAD_CENTER_Y, rx, ry)
    .fill(color)
    .stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
}

export function drawHair(styleId: HairStyle, headShapeId: HeadShape, color: number): Graphics | null {
  if (styleId === HairStyle.Bald) {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const graphics = new Graphics();
  const capRx = headRx * 1.08;

  const drawCap = (): void => {
    graphics
      .moveTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
      .arc(PAWN_CENTER_X, HEAD_CENTER_Y, capRx, Math.PI, 0, false)
      .lineTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
      .fill(color);
  };

  switch (styleId) {
    case HairStyle.SidePart: {
      graphics
        .moveTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
        .arc(PAWN_CENTER_X + headRx * 0.25, HEAD_CENTER_Y - headRy * 0.15, capRx, Math.PI, 0, false)
        .lineTo(PAWN_CENTER_X - capRx, HEAD_CENTER_Y)
        .fill(color);
      break;
    }
    case HairStyle.Messy: {
      drawCap();
      const spikeCount = 5;
      for (let i = 0; i < spikeCount; i++) {
        const t = i / (spikeCount - 1);
        const x = PAWN_CENTER_X - capRx * 0.8 + t * capRx * 1.6;
        const baseY = HEAD_CENTER_Y - headRy * 0.55;
        graphics
          .moveTo(x - 1.5, baseY)
          .lineTo(x, baseY - 3 - (i % 2))
          .lineTo(x + 1.5, baseY)
          .fill(color);
      }
      break;
    }
    case HairStyle.Curly: {
      drawCap();
      const bumpCount = 4;
      for (let i = 0; i < bumpCount; i++) {
        const t = i / (bumpCount - 1);
        const x = PAWN_CENTER_X - capRx * 0.75 + t * capRx * 1.5;
        graphics.circle(x, HEAD_CENTER_Y - headRy * 0.6, headRx * 0.28).fill(color);
      }
      break;
    }
    case HairStyle.Mohawk: {
      const stripWidth = headRx * 0.35;
      graphics
        .moveTo(PAWN_CENTER_X - stripWidth, HEAD_CENTER_Y - headRy * 0.3)
        .lineTo(PAWN_CENTER_X - stripWidth * 0.6, HEAD_CENTER_Y - headRy * 1.5)
        .lineTo(PAWN_CENTER_X + stripWidth * 0.6, HEAD_CENTER_Y - headRy * 1.5)
        .lineTo(PAWN_CENTER_X + stripWidth, HEAD_CENTER_Y - headRy * 0.3)
        .fill(color);
      break;
    }
    case HairStyle.Bun: {
      drawCap();
      graphics.circle(PAWN_CENTER_X, HEAD_CENTER_Y - headRy * 1.25, headRx * 0.32).fill(color);
      break;
    }
    case HairStyle.LongStraight: {
      drawCap();
      const sideWidth = headRx * 0.35;
      graphics
        .rect(PAWN_CENTER_X - capRx, HEAD_CENTER_Y - headRy * 0.2, sideWidth, headRy * 1.8)
        .fill(color)
        .rect(PAWN_CENTER_X + capRx - sideWidth, HEAD_CENTER_Y - headRy * 0.2, sideWidth, headRy * 1.8)
        .fill(color);
      break;
    }
  }

  return graphics;
}

function drawEyeShapes(
  styleId: EyeStyle,
  offsetX: number,
  eyeY: number,
  target: Graphics
): void {
  const cx1 = PAWN_CENTER_X - offsetX;
  const cx2 = PAWN_CENTER_X + offsetX;

  switch (styleId) {
    case EyeStyle.Round:
      target.circle(cx1, eyeY, 1.6).fill(OUTLINE_COLOR).circle(cx2, eyeY, 1.6).fill(OUTLINE_COLOR);
      break;
    case EyeStyle.WideSet:
      target
        .circle(cx1 - 1, eyeY, 1.3)
        .fill(OUTLINE_COLOR)
        .circle(cx2 + 1, eyeY, 1.3)
        .fill(OUTLINE_COLOR);
      break;
    case EyeStyle.Narrow:
      target
        .moveTo(cx1 - 2, eyeY)
        .lineTo(cx1 + 2, eyeY)
        .moveTo(cx2 - 2, eyeY)
        .lineTo(cx2 + 2, eyeY)
        .stroke({ color: OUTLINE_COLOR, width: 1.2 });
      break;
    case EyeStyle.Almond:
      target
        .ellipse(cx1, eyeY, 2, 1)
        .fill(OUTLINE_COLOR)
        .ellipse(cx2, eyeY, 2, 1)
        .fill(OUTLINE_COLOR);
      break;
    case EyeStyle.Asymmetric:
      target.circle(cx1, eyeY, 1.8).fill(OUTLINE_COLOR).circle(cx2, eyeY, 1.1).fill(OUTLINE_COLOR);
      break;
    case EyeStyle.DeepSet:
      target
        .moveTo(cx1 - 2, eyeY - 2)
        .lineTo(cx1 + 2, eyeY - 2)
        .moveTo(cx2 - 2, eyeY - 2)
        .lineTo(cx2 + 2, eyeY - 2)
        .stroke({ color: OUTLINE_COLOR, width: 1 })
        .circle(cx1, eyeY, 1.3)
        .fill(OUTLINE_COLOR)
        .circle(cx2, eyeY, 1.3)
        .fill(OUTLINE_COLOR);
      break;
    case EyeStyle.Slit:
      target
        .moveTo(cx1, eyeY - 2)
        .lineTo(cx1, eyeY + 2)
        .moveTo(cx2, eyeY - 2)
        .lineTo(cx2, eyeY + 2)
        .stroke({ color: OUTLINE_COLOR, width: 1.4 });
      break;
    case EyeStyle.Magic:
      target
        .circle(cx1, eyeY, 1.6)
        .fill(0xf5f0e6)
        .stroke({ color: OUTLINE_COLOR, width: 0.6 })
        .circle(cx2, eyeY, 1.6)
        .fill(0xf5f0e6)
        .stroke({ color: OUTLINE_COLOR, width: 0.6 });
      break;
    case EyeStyle.Squint:
      target
        .circle(cx1, eyeY, 1.5)
        .fill(OUTLINE_COLOR)
        .moveTo(cx2 - 2, eyeY)
        .lineTo(cx2 + 2, eyeY)
        .stroke({ color: OUTLINE_COLOR, width: 1.2 });
      break;
  }
}

export function drawEyes(styleId: EyeStyle, headShapeId: HeadShape): Graphics {
  const headRx = HEAD_RADIUS_X[headShapeId];
  const offsetX = styleId === EyeStyle.WideSet ? headRx * 0.55 : headRx * 0.4;
  const eyeY = HEAD_CENTER_Y + HEAD_RADIUS_Y[headShapeId] * 0.1;
  const graphics = new Graphics();

  drawEyeShapes(styleId, offsetX, eyeY, graphics);

  return graphics;
}

export function drawFacialFeature(featureId: FacialFeature, headShapeId: HeadShape): Graphics | null {
  if (featureId === FacialFeature.None) {
    return null;
  }

  const headRx = HEAD_RADIUS_X[headShapeId];
  const headRy = HEAD_RADIUS_Y[headShapeId];
  const graphics = new Graphics();
  const mouthY = HEAD_CENTER_Y + headRy * 0.55;

  switch (featureId) {
    case FacialFeature.EyePatch:
      graphics
        .circle(PAWN_CENTER_X + headRx * 0.4, HEAD_CENTER_Y + headRy * 0.1, 2.4)
        .fill(0x1a1512)
        .moveTo(PAWN_CENTER_X + headRx * 0.4, HEAD_CENTER_Y - headRy * 0.9)
        .lineTo(PAWN_CENTER_X + headRx * 0.4, HEAD_CENTER_Y + headRy * 0.9)
        .stroke({ color: 0x1a1512, width: 0.8 });
      break;
    case FacialFeature.Freckles: {
      const spots = [
        [-0.55, 0.35],
        [-0.3, 0.5],
        [0.3, 0.5],
        [0.55, 0.35]
      ];
      for (const [dx, dy] of spots) {
        graphics.circle(PAWN_CENTER_X + headRx * (dx ?? 0), HEAD_CENTER_Y + headRy * (dy ?? 0), 0.5).fill(0x8a5a3a);
      }
      break;
    }
    case FacialFeature.Tattoo:
      graphics
        .moveTo(PAWN_CENTER_X - headRx * 0.45, HEAD_CENTER_Y + headRy * 0.3)
        .lineTo(PAWN_CENTER_X - headRx * 0.3, HEAD_CENTER_Y + headRy * 0.55)
        .stroke({ color: 0x3a4f8a, width: 0.8 });
      break;
    case FacialFeature.Mole:
      graphics.circle(PAWN_CENTER_X + headRx * 0.35, mouthY, 0.6).fill(0x3a2a20);
      break;
    case FacialFeature.MissingTooth:
      graphics
        .moveTo(PAWN_CENTER_X - headRx * 0.35, mouthY)
        .lineTo(PAWN_CENTER_X - headRx * 0.05, mouthY + 0.5)
        .lineTo(PAWN_CENTER_X + headRx * 0.05, mouthY)
        .lineTo(PAWN_CENTER_X + headRx * 0.35, mouthY + 0.5)
        .stroke({ color: OUTLINE_COLOR, width: 0.9 })
        .rect(PAWN_CENTER_X - headRx * 0.05, mouthY - 0.6, headRx * 0.1, 1.2)
        .fill(0xf5f0e6);
      break;
    case FacialFeature.Piercing:
      graphics.circle(PAWN_CENTER_X - headRx * 0.75, HEAD_CENTER_Y + headRy * 0.3, 0.5).fill(METAL_COLOR);
      break;
    case FacialFeature.Monocle:
      graphics
        .circle(PAWN_CENTER_X + headRx * 0.4, HEAD_CENTER_Y + headRy * 0.1, 2.6)
        .stroke({ color: METAL_COLOR, width: 0.7 })
        .moveTo(PAWN_CENTER_X + headRx * 0.4 + 2.6, HEAD_CENTER_Y + headRy * 0.1)
        .lineTo(PAWN_CENTER_X + headRx * 0.7, HEAD_CENTER_Y + headRy * 1.3)
        .stroke({ color: METAL_COLOR, width: 0.5 });
      break;
  }

  return graphics;
}
