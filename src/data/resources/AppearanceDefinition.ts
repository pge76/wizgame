export type HeadShapeId = "round" | "oval";
export type BodyShapeId = "pill" | "wide";
export type HairStyleId = "none" | "shortCap" | "sideLocks" | "topKnot";
export type EyeStyleId = "dots" | "closed";

export interface AppearanceDefinition {
  readonly headShapeId: HeadShapeId;
  readonly bodyShapeId: BodyShapeId;
  readonly hairStyleId: HairStyleId;
  readonly eyeStyleId: EyeStyleId;
  readonly skinColor: number;
  readonly hairColor: number;
}

export const HEAD_SHAPE_IDS: readonly HeadShapeId[] = ["round", "oval"];
export const BODY_SHAPE_IDS: readonly BodyShapeId[] = ["pill", "wide"];
export const HAIR_STYLE_IDS: readonly HairStyleId[] = ["none", "shortCap", "sideLocks", "topKnot"];
export const EYE_STYLE_IDS: readonly EyeStyleId[] = ["dots", "closed"];

export const SKIN_COLORS: readonly number[] = [0xd8a878, 0xb87f56, 0x8a5a3a, 0x4a3527, 0xe8c9a0];
export const HAIR_COLORS: readonly number[] = [0x2b2118, 0x6b4423, 0xc9a227, 0xd94f4f, 0xd8d8d8, 0x5a4a6b];
