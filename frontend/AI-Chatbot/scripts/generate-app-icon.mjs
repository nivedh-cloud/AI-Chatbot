/**
 * Builds a 1:1 (1024×1024) launcher source from the wide robot PNG:
 * scale + center crop (same idea as CSS object-cover object-center — masks left/right).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(
  root,
  'src/assets/images/Gemini_Generated_Image_pt4cv3pt4cv3pt4c.png',
);
const outDir = path.join(root, 'resources');
const outFile = path.join(outDir, 'icon.png');

const SIZE = 1024;

if (!fs.existsSync(src)) {
  console.error('Missing source image:', src);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

await sharp(src)
  .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
  .png()
  .toFile(outFile);

console.log(`Wrote ${SIZE}×${SIZE} app icon source: ${outFile}`);
