# LINE Setup

This project stores LINE secrets in `.env.local`.

## Local Development

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Demo reply without LINE:

```bash
curl "http://localhost:3000/api/demo/reply?text=วันนี้เล่นอะไรดี"
```

## Webhook

The webhook endpoint is:

```text
https://<your-public-domain>/webhook/line
```

For local testing, expose port `3000` with a tunnel such as ngrok or Cloudflare Tunnel, then set the public URL in LINE Developers.

## LINE Channel

- Channel name: เฮียโต
- Webhook path: `/webhook/line`
- Required env vars:
  - `LINE_CHANNEL_ID`
  - `LINE_CHANNEL_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_DEV_USER_ID`

## Current MVP Behavior

- Text message webhook only
- Signature verification enabled
- Replies in Thai as "เฮียโต" using the "ฟิตกับเฮีย" tone
- Local JSON storage in `storage/fitfit.local.json`
- No medical diagnosis; injury-related messages receive safety guidance

## Rich Menu

The default LINE rich menu uses:

- Source artwork: `public/assets/line-rich-menu-source.png`
- Uploaded image: `public/assets/line-rich-menu.jpg`
- Generator: `server/tools/generate-rich-menu-image.js`
- LINE setup script: `server/tools/setup-rich-menu.js`

Generate the image only:

```bash
npm run line:generate-rich-menu
```

Generate, create the LINE rich menu, upload the image, and set it as default:

```bash
npm run line:setup-rich-menu
```

The six tap areas send these message actions to the bot:

- `เริ่มโปรไฟล์`
- `วันนี้เล่นอะไรดี`
- `จดการซ้อม`
- `งบ 120 กินอะไรดี`
- `โฟกัสกล้าม`
- `เจ็บหรือปวด ปรับท่าให้หน่อย`
