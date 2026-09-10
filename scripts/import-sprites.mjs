// Primitive sprite import pipeline: drop raw images into assets-incoming/, run this script,
// and it crops each to its content, makes the background transparent, centers it on a square
// canvas, writes the result into src/assets/monsters/, and archives the original.
//
// Usage: node scripts/import-sprites.mjs [inputDir] [outputDir] [archiveDir]

import { readdir, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const BACKGROUND_THRESHOLD = 40; // color distance under which a pixel counts as background
const PADDING_FACTOR = 1.1; // extra breathing room around the trimmed content
const MAX_OUTPUT_SIZE = 512; // downscale (never upscale) if the padded square exceeds this

const [inputDir = "assets-incoming", outputDir = "src/assets/monsters", archiveDir = "assets-archive"] =
  process.argv.slice(2);

async function main() {
  await mkdir(inputDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });

  const entries = await readdir(inputDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()));

  if (files.length === 0) {
    console.log(`No images found in "${inputDir}".`);
    return;
  }

  for (const file of files) {
    const inputPath = path.join(inputDir, file.name);
    try {
      await processSprite(inputPath, file.name, outputDir);
      await archiveOriginal(inputPath, file.name, archiveDir);
      console.log(`OK   ${file.name}`);
    } catch (error) {
      console.error(`FAIL ${file.name}:`, error.message);
    }
  }
}

async function processSprite(inputPath, fileName, outputDir) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const bg = detectBackgroundColor(data, width, height, channels);
  if (bg) {
    keyOutBackground(data, width, height, channels, bg);
  }

  const bbox = findOpaqueBoundingBox(data, width, height, channels);
  if (!bbox) {
    throw new Error("image is fully transparent after background removal");
  }

  const trimmedBuffer = await sharp(data, { raw: { width, height, channels } })
    .extract({ left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height })
    .png()
    .toBuffer();

  const squareSize = Math.round(Math.max(bbox.width, bbox.height) * PADDING_FACTOR);
  const left = Math.round((squareSize - bbox.width) / 2);
  const top = Math.round((squareSize - bbox.height) / 2);

  let canvas = sharp({
    create: { width: squareSize, height: squareSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: trimmedBuffer, left, top }]);

  if (squareSize > MAX_OUTPUT_SIZE) {
    canvas = canvas.resize(MAX_OUTPUT_SIZE, MAX_OUTPUT_SIZE, { fit: "inside" });
  }

  const outputName = `${path.parse(fileName).name}.png`;
  await canvas.png().toFile(path.join(outputDir, outputName));
}

/** Averages the corners that are (still) opaque; returns null if every corner is already transparent. */
function detectBackgroundColor(data, width, height, channels) {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];

  const opaque = corners
    .map(([x, y]) => readPixel(data, width, channels, x, y))
    .filter((p) => p.a > 200);

  if (opaque.length === 0) return null;

  return {
    r: opaque.reduce((sum, p) => sum + p.r, 0) / opaque.length,
    g: opaque.reduce((sum, p) => sum + p.g, 0) / opaque.length,
    b: opaque.reduce((sum, p) => sum + p.b, 0) / opaque.length
  };
}

/** Zeroes the alpha of every pixel close in color to `bg` (leaves already-transparent pixels alone). */
function keyOutBackground(data, width, height, channels, bg) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      if (data[offset + 3] === 0) continue;

      const dr = data[offset] - bg.r;
      const dg = data[offset + 1] - bg.g;
      const db = data[offset + 2] - bg.b;
      if (Math.sqrt(dr * dr + dg * dg + db * db) < BACKGROUND_THRESHOLD) {
        data[offset + 3] = 0;
      }
    }
  }
}

function findOpaqueBoundingBox(data, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function readPixel(data, width, channels, x, y) {
  const offset = (y * width + x) * channels;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2], a: data[offset + 3] };
}

async function archiveOriginal(inputPath, fileName, archiveDir) {
  let targetPath = path.join(archiveDir, fileName);
  try {
    await rename(inputPath, targetPath);
  } catch {
    const { name, ext } = path.parse(fileName);
    targetPath = path.join(archiveDir, `${name}.${Date.now()}${ext}`);
    await rename(inputPath, targetPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
