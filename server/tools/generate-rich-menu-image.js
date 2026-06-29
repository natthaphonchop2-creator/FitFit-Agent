import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const sourcePath = path.join(rootDir, "public", "assets", "line-rich-menu-source.png");
const outputPath = path.join(rootDir, "public", "assets", "line-rich-menu.jpg");

const width = 2500;
const height = 1686;
const black = "#14140F";
const green = "#06C755";
const orange = "#F24E15";
const yellow = "#FFD23F";

const labels = [
  {
    x: 416,
    titleY: 665,
    subtitleY: 745,
    title: "เริ่มโปรไฟล์",
    subtitle: "ตั้งเป้า เวลา อุปกรณ์",
    chip: "START",
    chipColor: green
  },
  {
    x: 1250,
    titleY: 660,
    subtitleY: 740,
    title: "วันนี้เล่นอะไร",
    subtitle: "จัดตารางพร้อมท่า",
    chip: "WORKOUT",
    chipColor: orange
  },
  {
    x: 2084,
    titleY: 665,
    subtitleY: 745,
    title: "จดการซ้อม",
    subtitle: "เซ็ต ครั้ง น้ำหนัก",
    chip: "LOG",
    chipColor: yellow
  },
  {
    x: 416,
    titleY: 1490,
    subtitleY: 1570,
    title: "เมนูอาหาร",
    subtitle: "แนะนำตามงบวันนี้",
    chip: "FOOD",
    chipColor: green
  },
  {
    x: 1250,
    titleY: 1490,
    subtitleY: 1570,
    title: "โฟกัสกล้าม",
    subtitle: "ดูว่าท่าโดนส่วนไหน",
    chip: "MUSCLE",
    chipColor: yellow
  },
  {
    x: 2084,
    titleY: 1490,
    subtitleY: 1570,
    title: "เจ็บ/ปรับท่า",
    subtitle: "ซ้อมให้ถูก ปลอดภัย",
    chip: "SAFE",
    chipColor: orange
  }
];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textOverlaySvg() {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .chip { font-family: "Sukhumvit Set", "Thonburi", sans-serif; font-size: 38px; font-weight: 900; letter-spacing: .5px; }
        .title { font-family: "Sukhumvit Set", "Thonburi", sans-serif; font-size: 82px; font-weight: 900; }
        .subtitle { font-family: "Sukhumvit Set", "Thonburi", sans-serif; font-size: 42px; font-weight: 800; }
      </style>
      ${labels.map(label).join("\n")}
    </svg>
  `;
}

function label(item, index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const panelX = [56, 846, 1636][col];
  const panelY = row === 0 ? 48 : 872;
  const chipX = panelX + 92;
  const chipY = panelY + 68;
  const chipTextColor = item.chipColor === yellow ? black : "#fff";
  const titleSize = item.title.length > 10 ? 74 : 82;

  return `
    <g>
      <rect x="${chipX + 8}" y="${chipY + 8}" width="232" height="72" rx="36" fill="${black}" opacity=".2"/>
      <rect x="${chipX}" y="${chipY}" width="232" height="72" rx="36" fill="${item.chipColor}" stroke="${black}" stroke-width="9"/>
      <text class="chip" x="${chipX + 116}" y="${chipY + 49}" text-anchor="middle" fill="${chipTextColor}">${esc(item.chip)}</text>

      <text class="title" x="${item.x}" y="${item.titleY + 7}" text-anchor="middle" font-size="${titleSize}" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round">${esc(item.title)}</text>
      <text class="title" x="${item.x}" y="${item.titleY}" text-anchor="middle" font-size="${titleSize}" fill="${black}">${esc(item.title)}</text>
      <text class="subtitle" x="${item.x}" y="${item.subtitleY + 4}" text-anchor="middle" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round">${esc(item.subtitle)}</text>
      <text class="subtitle" x="${item.x}" y="${item.subtitleY}" text-anchor="middle" fill="#5D5148">${esc(item.subtitle)}</text>
    </g>
  `;
}

await fs.access(sourcePath);

let finalBuffer = null;
let finalQuality = null;

for (const quality of [92, 88, 84, 80, 76, 72]) {
  const buffer = await sharp(sourcePath)
    .resize(width, height, { fit: "cover", position: "center" })
    .composite([{ input: Buffer.from(textOverlaySvg()) }])
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  finalBuffer = buffer;
  finalQuality = quality;
  if (buffer.byteLength <= 950_000) break;
}

await fs.writeFile(outputPath, finalBuffer);

console.log(
  JSON.stringify(
    {
      sourcePath,
      outputPath,
      width,
      height,
      format: "image/jpeg",
      quality: finalQuality,
      bytes: finalBuffer.byteLength
    },
    null,
    2
  )
);
