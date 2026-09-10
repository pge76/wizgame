import { describe, expect, it } from "vitest";
import { randomAppearance } from "@data/generation/AppearanceGenerator";
import {
  BODY_SHAPES,
  EYE_STYLES,
  FACIAL_FEATURES,
  FacialFeature,
  HAIR_COLORS,
  HAIR_STYLES,
  HEAD_SHAPES,
  SKIN_COLORS
} from "@data/resources/AppearanceDefinition";

describe("randomAppearance", () => {
  it("always produces values from the defined trait sets", () => {
    for (let i = 0; i < 50; i++) {
      const appearance = randomAppearance();

      expect(HEAD_SHAPES).toContain(appearance.headShape);
      expect(BODY_SHAPES).toContain(appearance.bodyShape);
      expect(HAIR_STYLES).toContain(appearance.hairStyle);
      expect(EYE_STYLES).toContain(appearance.eyeStyle);
      expect(SKIN_COLORS).toContain(appearance.skinColor);
      expect(HAIR_COLORS).toContain(appearance.hairColor);
      expect([FacialFeature.None, ...FACIAL_FEATURES]).toContain(appearance.facialFeature);
    }
  });
});
