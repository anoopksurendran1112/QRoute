import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import sharp from "sharp";
import { ApiError } from "./apiError.ts";

// Resolve from this file, never from process.cwd(): the API can be started from
// the repo root or from apps/api, and a cwd-relative path silently writes
// uploads to two different directories.
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(MODULE_DIR, "../../../../server/storage/uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".img";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "VALIDATION_ERROR", "Only PNG and JPG images are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export interface ProcessedImage {
  path: string;
  sha256: string;
  widthPx: number;
  heightPx: number;
}

export async function processFloorPlan(inputPath: string): Promise<ProcessedImage> {
  const buffer = fs.readFileSync(inputPath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // sharp normalisation must happen BEFORE calibration: metersPerPixel is only
  // meaningful against the stored pixel grid.
  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();

  let pipeline = image;
  if (metadata.width && metadata.width > 4096) {
    pipeline = pipeline.resize(4096, null, { withoutEnlargement: true });
  }

  const processedBuffer = await pipeline.png().toBuffer();
  const processedMetadata = await sharp(processedBuffer).metadata();

  // Content-hashed name: a changed plan gets a new URL, so immutable caching is
  // safe without any purge step.
  const outputPath = path.join(UPLOAD_DIR, `${hash.slice(0, 32)}.png`);
  fs.writeFileSync(outputPath, processedBuffer);

  if (path.resolve(inputPath) !== path.resolve(outputPath) && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  return {
    path: `/uploads/${path.basename(outputPath)}`,
    sha256: hash,
    widthPx: processedMetadata.width || 0,
    heightPx: processedMetadata.height || 0,
  };
}
