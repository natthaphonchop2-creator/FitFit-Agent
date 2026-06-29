import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const imagePath = path.join(rootDir, "public", "assets", "line-rich-menu.jpg");
const richMenuName = "fitfit-hia-to-main-v1";

const richMenu = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: true,
  name: richMenuName,
  chatBarText: "เมนูเฮียโต",
  areas: [
    area(0, 0, 833, 843, "เริ่มโปรไฟล์"),
    area(833, 0, 834, 843, "วันนี้เล่นอะไรดี"),
    area(1667, 0, 833, 843, "จดการซ้อม"),
    area(0, 843, 833, 843, "งบ 120 กินอะไรดี"),
    area(833, 843, 834, 843, "โฟกัสกล้าม"),
    area(1667, 843, 833, 843, "เจ็บหรือปวด ปรับท่าให้หน่อย")
  ]
};

if (!channelAccessToken) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN in .env.local or environment.");
  process.exit(1);
}

function area(x, y, width, height, text) {
  return {
    bounds: { x, y, width, height },
    action: {
      type: "message",
      text
    }
  };
}

async function lineJson(pathname, options = {}) {
  const headers = {
    Authorization: `Bearer ${channelAccessToken}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[key];
  }

  const response = await fetch(`https://api.line.me${pathname}`, {
    ...options,
    headers
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

async function uploadImage(richMenuId, imageBuffer) {
  const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "image/jpeg"
    },
    body: imageBuffer
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Upload rich menu image failed: ${response.status} ${body}`);
  }
}

async function main() {
  const imageBuffer = await fs.readFile(imagePath);

  if (imageBuffer.byteLength > 1_000_000) {
    throw new Error(`Rich menu image is too large: ${imageBuffer.byteLength} bytes`);
  }

  await lineJson("/v2/bot/richmenu/validate", {
    method: "POST",
    body: JSON.stringify(richMenu)
  });

  const created = await lineJson("/v2/bot/richmenu", {
    method: "POST",
    body: JSON.stringify(richMenu)
  });
  const richMenuId = created.richMenuId;

  await uploadImage(richMenuId, imageBuffer);

  await lineJson(`/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST"
  });

  const defaultMenu = await lineJson("/v2/bot/user/all/richmenu");
  const list = await lineJson("/v2/bot/richmenu/list");
  const staleMenus = (list.richmenus || []).filter(
    (menu) => menu.name?.startsWith("fitfit-hia-to-main") && menu.richMenuId !== richMenuId
  );

  for (const menu of staleMenus) {
    try {
      await lineJson(`/v2/bot/richmenu/${menu.richMenuId}`, { method: "DELETE" });
    } catch (error) {
      console.warn(`Could not delete stale rich menu ${menu.richMenuId}: ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        richMenuId,
        defaultRichMenuId: defaultMenu.richMenuId,
        imagePath,
        imageBytes: imageBuffer.byteLength,
        staleMenusDeleted: staleMenus.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
