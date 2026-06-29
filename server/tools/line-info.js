import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!token) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  process.exit(1);
}

const endpoints = [
  ["Bot info", "https://api.line.me/v2/bot/info"],
  ["Webhook endpoint", "https://api.line.me/v2/bot/channel/webhook/endpoint"],
  ["Message quota", "https://api.line.me/v2/bot/message/quota"],
  ["Quota consumption", "https://api.line.me/v2/bot/message/quota/consumption"]
];

for (const [label, url] of endpoints) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json().catch(() => ({}));
  console.log(`${label}:`);
  console.log(JSON.stringify(body, null, 2));
}
