import { describe, expect, it } from "vitest";
import { randomAppearance } from "@data/generation/AppearanceGenerator";
import {
  BODY_SHAPE_IDS,
  EYE_STYLE_IDS,
  HAIR_COLORS,
  HAIR_STYLE_IDS,
  HEAD_SHAPE_IDS,
  SKIN_COLORS
} from "@data/resources/AppearanceDefinition";

describe("randomAppearance", () => {
  it("always produces values from the defined trait sets", () => {
    for (let i = 0; i < 50; i++) {
      const appearance = randomAppearance();

      expect(HEAD_SHAPE_IDS).toContain(appearance.headShapeId);
      expect(BODY_SHAPE_IDS).toContain(appearance.bodyShapeId);
      expect(HAIR_STYLE_IDS).toContain(appearance.hairStyleId);
      expect(EYE_STYLE_IDS).toContain(appearance.eyeStyleId);
      expect(SKIN_COLORS).toContain(appearance.skinColor);
      expect(HAIR_COLORS).toContain(appearance.hairColor);
    }
  });
});
