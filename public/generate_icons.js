import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1x1 transparent PNG hex
const pngHex =
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63606060000000050001a5f91df30000000049454e44ae426082";
const pngBuffer = Buffer.from(pngHex, "hex");

const publicDir = __dirname;

fs.writeFileSync(path.join(publicDir, "icon-192.png"), pngBuffer);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), pngBuffer);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), pngBuffer);

console.log("Successfully wrote default icon files.");
