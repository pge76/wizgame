import { Container, Sprite, type Texture } from "pixi.js";
import type { AppearanceDefinition } from "@data/resources/AppearanceDefinition";
import { drawBody, drawEyes, drawHair, drawHead } from "./PawnPartDrawing";
import { TILE_SIZE } from "@world/Coordinates";

const RASTER_TARGET_HEIGHT = TILE_SIZE * 1.75;

/** Wraps an imported raster texture (see MonsterTextureLoader) to align with the vector pawns:
 *  scaled to a consistent height, anchored so its base sits at the tile's bottom-center. */
export function buildRasterSprite(texture: Texture): Container {
  const container = new Container();
  const sprite = new Sprite(texture);

  sprite.anchor.set(0.5, 1);
  sprite.scale.set(RASTER_TARGET_HEIGHT / texture.height);
  sprite.position.set(TILE_SIZE / 2, TILE_SIZE);

  container.addChild(sprite);
  return container;
}

export function buildPawnSprite(appearance: AppearanceDefinition): Container {
  const container = new Container();

  container.addChild(drawBody(appearance.bodyShapeId, appearance.skinColor));
  container.addChild(buildHeadSprite(appearance));

  return container;
}

/** Head, hair and eyes only — no body. Used for portraits (e.g. the party bar). */
export function buildHeadSprite(appearance: AppearanceDefinition): Container {
  const container = new Container();

  container.addChild(drawHead(appearance.headShapeId, appearance.skinColor));

  const hair = drawHair(appearance.hairStyleId, appearance.headShapeId, appearance.hairColor);
  if (hair) {
    container.addChild(hair);
  }

  container.addChild(drawEyes(appearance.eyeStyleId, appearance.headShapeId));

  return container;
}
