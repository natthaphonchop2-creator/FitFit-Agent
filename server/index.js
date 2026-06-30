import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { recordLineEvent } from "./repositories/customer-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = Number(process.env.PORT || 3000);
const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

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
    lineConfigured: Boolean(channelSecret && channelAccessToken),
    supabaseConfigured: isSupabaseConfigured()
  });
});

app.get("/api/demo/reply", async (_req, res) => {
  res.json({
    autoRepliesEnabled: false,
    reply: null
  });
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
  await recordLineEvent(event);
}

function verifyLineSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

app.listen(port, () => {
  console.log(`FitFit เฮียโต running at http://localhost:${port}`);
});
