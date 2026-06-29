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
