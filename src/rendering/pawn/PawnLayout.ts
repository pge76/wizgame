import { TILE_SIZE } from "@world/Coordinates";

export const PAWN_CENTER_X = TILE_SIZE / 2;

export const BODY_TOP_Y = 16;
export const BODY_BOTTOM_Y = 31;
export const BODY_WIDTH: Record<"pill" | "wide", number> = {
  pill: 16,
  wide: 22
};
export const BODY_CORNER_RADIUS: Record<"pill" | "wide", number> = {
  pill: 8,
  wide: 6
};

export const HEAD_CENTER_Y = 11;
export const HEAD_RADIUS_X: Record<"round" | "oval", number> = {
  round: 8,
  oval: 7
};
export const HEAD_RADIUS_Y: Record<"round" | "oval", number> = {
  round: 8,
  oval: 9.5
};
