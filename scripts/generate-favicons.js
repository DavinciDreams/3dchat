import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SVG content for the brain icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
  <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
  <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
  <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
  <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
  <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
  <path d="M6 18a4 4 0 0 1-1.967-.516" />
  <path d="M19.967 17.484A4 4 0 1 1 18 18" />
</svg>`;

async function createPNG(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Load the SVG
  const img = await loadImage(Buffer.from(svgContent));

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);

  // Draw the SVG scaled to the canvas size
  ctx.drawImage(img, 0, 0, size, size);

  // Save as PNG
  const outputPath = join(__dirname, '..', 'public', filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

async function createOGImage(filename) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Create teal gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0d9488'); // teal-600
  gradient.addColorStop(1, '#14b8a6'); // teal-500
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Load and draw the brain icon
  const img = await loadImage(Buffer.from(svgContent));

  // Calculate icon size and position (centered)
  const iconSize = 200;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - 40;

  ctx.drawImage(img, iconX, iconY, iconSize, iconSize);

  // Draw title text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3D AI Chat', width / 2, iconY + iconSize + 80);

  // Draw subtitle
  ctx.fillStyle = '#f0fdfa'; // teal-50
  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.fillText('Real-time 3D AI chat with voice capabilities', width / 2, iconY + iconSize + 130);

  // Save as PNG
  const outputPath = join(__dirname, '..', 'public', filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${filename} (${width}x${height})`);
}

async function main() {
  console.log('Generating favicon files...');

  await createPNG(192, 'brain-icon-192.png');
  await createPNG(512, 'brain-icon-512.png');
  await createOGImage('og-image.png');

  console.log('All files generated successfully!');
}

main().catch(console.error);
