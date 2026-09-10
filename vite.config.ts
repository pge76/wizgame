import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    // Always emit sprite assets as separate files so pixi's Texture cache and the raster
    // sprite pipeline behave the same regardless of a given image's file size.
    assetsInlineLimit: 0
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@battle": path.resolve(__dirname, "src/battle"),
      "@data": path.resolve(__dirname, "src/data"),
      "@world": path.resolve(__dirname, "src/world"),
      "@entities": path.resolve(__dirname, "src/entities"),
      "@systems": path.resolve(__dirname, "src/systems"),
      "@rendering": path.resolve(__dirname, "src/rendering"),
      "@utils": path.resolve(__dirname, "src/utils")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
