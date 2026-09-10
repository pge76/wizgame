const assetModules = import.meta.glob("../../assets/monsters/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

/** Maps a spriteAsset filename (e.g. "tari.png") to its resolved URL. */
export const MONSTER_TEXTURE_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(assetModules).map(([path, url]) => [path.split("/").pop()!, url])
);
