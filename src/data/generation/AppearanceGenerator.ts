import {
  BODY_SHAPES,
  EYE_STYLES,
  FACIAL_FEATURES,
  FacialFeature,
  HAIR_COLORS,
  HAIR_STYLES,
  HEAD_SHAPES,
  SKIN_COLORS,
  type AppearanceDefinition
} from "@data/resources/AppearanceDefinition";

const FACIAL_FEATURE_CHANCE = 0.35;

function pickRandom<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list.");
  }
  return item;
}

export function randomAppearance(): AppearanceDefinition {
  return {
    headShape: pickRandom(HEAD_SHAPES),
    bodyShape: pickRandom(BODY_SHAPES),
    hairStyle: pickRandom(HAIR_STYLES),
    eyeStyle: pickRandom(EYE_STYLES),
    facialFeature: Math.random() < FACIAL_FEATURE_CHANCE ? pickRandom(FACIAL_FEATURES) : FacialFeature.None,
    skinColor: pickRandom(SKIN_COLORS),
    hairColor: pickRandom(HAIR_COLORS)
  };
}
