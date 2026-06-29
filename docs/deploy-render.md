# Deploy to Render

FitFit is a Node/Express web service. Deploy it as a Render Web Service, not as a Static Site.

## Preflight

```bash
npm install
npm run check
npm start
```

Local health check:

```bash
curl http://localhost:3000/health
```

## Render Settings

The repo includes `render.yaml` for Blueprint deploys.

- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`
- Webhook path after deploy: `https://<render-service-url>/webhook/line`

Required environment variables in Render:

```env
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_DEV_USER_ID=
```

Use the values from local `.env.local`. Do not commit secrets.

## After Deploy

1. Open the public URL and verify the landing page.
2. Check health:

   ```bash
   curl https://<render-service-url>/health
   ```

3. Set the LINE webhook URL:

   ```text
   https://<render-service-url>/webhook/line
   ```

4. In LINE Developers, enable webhook usage and verify the webhook URL.

## MVP Data Note

The current bot stores logs in `storage/fitfit.local.json`. On hosted services this is temporary app storage unless a persistent disk or database is added. For production, move user profile/log data to Postgres, Supabase, or another persistent database.
