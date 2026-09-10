import {
  BODY_SHAPE_IDS,
  EYE_STYLE_IDS,
  HAIR_COLORS,
  HAIR_STYLE_IDS,
  HEAD_SHAPE_IDS,
  SKIN_COLORS,
  type AppearanceDefinition
} from "@data/resources/AppearanceDefinition";

function pickRandom<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list.");
  }
  return item;
}

export function randomAppearance(): AppearanceDefinition {
  return {
    headShapeId: pickRandom(HEAD_SHAPE_IDS),
    bodyShapeId: pickRandom(BODY_SHAPE_IDS),
    hairStyleId: pickRandom(HAIR_STYLE_IDS),
    eyeStyleId: pickRandom(EYE_STYLE_IDS),
    skinColor: pickRandom(SKIN_COLORS),
    hairColor: pickRandom(HAIR_COLORS)
  };
}
