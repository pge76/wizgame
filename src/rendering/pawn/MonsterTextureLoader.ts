import { Assets, Texture } from "pixi.js";
import { MONSTER_TEXTURE_URLS } from "./MonsterTextureAssets";

const textures = new Map<string, Texture>();

/** Loads every raster monster sprite up front so PawnView/BattleHudView can grab them synchronously. */
export async function preloadMonsterTextures(): Promise<void> {
  await Promise.all(
    Object.entries(MONSTER_TEXTURE_URLS).map(async ([filename, url]) => {
      textures.set(filename, await Assets.load(url));
    })
  );
}

export function getMonsterTexture(filename: string): Texture | undefined {
  return textures.get(filename);
}
