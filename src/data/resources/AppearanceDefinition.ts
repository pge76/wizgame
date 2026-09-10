export enum HeadShape {
  Round,
  Oval
}

export enum BodyShape {
  Pill,
  Wide
}

export enum HairStyle {
  Bald,
  Messy,
  Mohawk,
  Bun,
  LongStraight,
  Curly,
  SidePart
}

export enum EyeStyle {
  Round,
  Narrow,
  Almond,
  Asymmetric,
  DeepSet,
  Slit,
  Magic,
  WideSet,
  Squint
}

export enum FacialFeature {
  None,
  EyePatch,
  Freckles,
  Tattoo,
  Mole,
  MissingTooth,
  Piercing,
  Monocle
}

export interface AppearanceDefinition {
  readonly headShape: HeadShape;
  readonly bodyShape: BodyShape;
  readonly hairStyle: HairStyle;
  readonly eyeStyle: EyeStyle;
  readonly facialFeature: FacialFeature;
  readonly skinColor: number;
  readonly hairColor: number;
}

export const HEAD_SHAPES: readonly HeadShape[] = [HeadShape.Round, HeadShape.Oval];
export const BODY_SHAPES: readonly BodyShape[] = [BodyShape.Pill, BodyShape.Wide];
export const HAIR_STYLES: readonly HairStyle[] = [
  HairStyle.Bald,
  HairStyle.Messy,
  HairStyle.Mohawk,
  HairStyle.Bun,
  HairStyle.LongStraight,
  HairStyle.Curly,
  HairStyle.SidePart
];
export const EYE_STYLES: readonly EyeStyle[] = [
  EyeStyle.Round,
  EyeStyle.Narrow,
  EyeStyle.Almond,
  EyeStyle.Asymmetric,
  EyeStyle.DeepSet,
  EyeStyle.Slit,
  EyeStyle.Magic,
  EyeStyle.WideSet,
  EyeStyle.Squint
];

/** Excludes None — callers roll None separately so most pawns stay feature-free. */
export const FACIAL_FEATURES: readonly FacialFeature[] = [
  FacialFeature.EyePatch,
  FacialFeature.Freckles,
  FacialFeature.Tattoo,
  FacialFeature.Mole,
  FacialFeature.MissingTooth,
  FacialFeature.Piercing,
  FacialFeature.Monocle
];

export const SKIN_COLORS: readonly number[] = [0xd8a878, 0xb87f56, 0x8a5a3a, 0x4a3527, 0xe8c9a0];
export const HAIR_COLORS: readonly number[] = [
  0x0d0b09, // tiefschwarz
  0xe8dfc8, // platinblond
  0x8a6d4b, // aschbraun
  0xb5511f, // kupferrot
  0xb0b0b0, // silber/grau
  0x3fae4a, // giftgrün
  0xe84fb0, // knalliges pink
  0x6fc7e8, // eisblau
  0x5a3a7a, // dunkelviolett
  0x2b2118 // dunkelbraun
];
