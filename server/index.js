import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { createTrainerReply, parseWorkoutLog } from "./trainer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = Number(process.env.PORT || 3000);
const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const storagePath = path.join(rootDir, "storage", "fitfit.local.json");

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.static(path.join(rootDir, "public")));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FitFit เฮียโต",
    lineConfigured: Boolean(channelSecret && channelAccessToken)
  });
});

app.get("/api/demo/reply", async (req, res) => {
  const text = String(req.query.text || "วันนี้เล่นอะไรดี");
  const reply = createTrainerReply(text);
  res.json({ text, reply });
});

app.post("/webhook/line", async (req, res) => {
  if (!channelSecret || !channelAccessToken) {
    res.status(500).json({ message: "LINE credentials are not configured" });
    return;
  }

  if (!verifyLineSignature(req.rawBody, req.get("x-line-signature"), channelSecret)) {
    res.status(401).json({ message: "Invalid LINE signature" });
    return;
  }

  res.status(200).json({ ok: true });

  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  await Promise.all(events.map(handleLineEvent));
});

async function handleLineEvent(event) {
  if (event.type !== "message" || event.message?.type !== "text") {
    return;
  }

  const userId = event.source?.userId || "unknown";
  const text = event.message.text;
  const userState = await getUserState(userId);
  const replyText = createTrainerReply(text, userState);

  await appendUserLog(userId, {
    input: text,
    reply: replyText,
    workoutLog: shouldSaveWorkout(text) ? parseWorkoutLog(text) : null
  });

  if (event.replyToken) {
    await replyToLine(event.replyToken, replyText);
  }
}

function verifyLineSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

async function replyToLine(replyToken, text) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: text.slice(0, 4900)
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("LINE reply failed", response.status, body);
  }
}

async function getUserState(userId) {
  const store = await readStore();
  return store.users[userId] || {};
}

async function appendUserLog(userId, entry) {
  const store = await readStore();
  store.users[userId] ||= { logs: [] };
  store.users[userId].logs.push({
    ...entry,
    createdAt: new Date().toISOString()
  });
  store.users[userId].logs = store.users[userId].logs.slice(-100);
  await writeStore(store);
}

async function readStore() {
  try {
    const raw = await fs.readFile(storagePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not read local store, starting empty", error.message);
    }
    return { users: {} };
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(storagePath, `${JSON.stringify(store, null, 2)}\n`);
}

function shouldSaveWorkout(text) {
  const normalized = String(text || "").toLowerCase();
  return ["จด", "บันทึก", "เซ็ต", "ครั้ง", "kg", "กิโล", "reps"].some((keyword) => normalized.includes(keyword));
}

app.listen(port, () => {
  console.log(`FitFit เฮียโต running at http://localhost:${port}`);
});
