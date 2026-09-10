import { BodyShape, HeadShape } from "@data/resources/AppearanceDefinition";
import { TILE_SIZE } from "@world/Coordinates";

export const PAWN_CENTER_X = TILE_SIZE / 2;

export const BODY_TOP_Y = 16;
export const BODY_BOTTOM_Y = 31;
export const BODY_WIDTH: Record<BodyShape, number> = {
  [BodyShape.Pill]: 16,
  [BodyShape.Wide]: 22
};
export const BODY_CORNER_RADIUS: Record<BodyShape, number> = {
  [BodyShape.Pill]: 8,
  [BodyShape.Wide]: 6
};

export const HEAD_CENTER_Y = 11;
export const HEAD_RADIUS_X: Record<HeadShape, number> = {
  [HeadShape.Round]: 8,
  [HeadShape.Oval]: 7
};
export const HEAD_RADIUS_Y: Record<HeadShape, number> = {
  [HeadShape.Round]: 8,
  [HeadShape.Oval]: 9.5
};
