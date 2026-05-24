# 🎨 Board Importer for Miro

Upload any workshop or collaboration board image → instantly recreates it as a live Miro board.

---

## How it works

1. You drop an image of a workshop board (like a POP workshop, design sprint, etc.)
2. Claude Vision AI analyzes the image and extracts all elements (sections, sticky notes, text, shapes)
3. The app recreates everything on your Miro board using the Miro Web SDK

---

## Setup (step by step)

### Step 1 — Deploy to Vercel

1. Create a new GitHub repository (go to https://github.com/new)
   - Name it `miro-board-importer`
   - Set it to **Public**
   - Click **Create repository**

2. Upload all these files to your repository (drag & drop in the GitHub UI or use Git)

3. Go to https://vercel.com
   - Click **Add New Project**
   - Import your GitHub repository
   - Click **Deploy** (no config needed yet)
   - Copy your deployment URL (e.g. `https://miro-board-importer.vercel.app`)

### Step 2 — Add environment variables in Vercel

In your Vercel project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | Your key from https://console.anthropic.com |
| `NEXT_PUBLIC_MIRO_CLIENT_ID` | Your Miro Client ID (see Step 3) |

Then go to **Deployments** → **Redeploy** to apply the variables.

### Step 3 — Configure your Miro App

1. Go to https://miro.com/app/dashboard
2. Click your profile picture → **Settings** → **Your apps** → **Create new app**
3. Fill in:
   - **App name**: Board Importer
   - **Redirect URI**: `https://YOUR-VERCEL-URL.vercel.app`
4. Copy your **Client ID** and add it to Vercel env vars (see Step 2)
5. In the app settings, go to **App URL** and set it to: `https://YOUR-VERCEL-URL.vercel.app`
6. In **Permissions**, enable: `boards:read` and `boards:write`
7. Copy the contents of `miro-app-manifest.json` into the **App Manifest** field

### Step 4 — Install the app in Miro

1. In your Miro app settings, click **Install app and get OAuth token**
2. Select a team → Authorize
3. Open any Miro board
4. Click the **...** (more apps) in the left toolbar
5. Find **Board Importer** and click it
6. The panel opens on the right → drop your image → click Import!

---

## File structure

```
miro-board-importer/
├── pages/
│   ├── _app.js          # Injects Miro SDK
│   ├── index.js         # Main UI panel
│   └── api/
│       └── analyze.js   # Claude Vision API route
├── lib/
│   └── miroRenderer.js  # Miro SDK board renderer
├── miro-app-manifest.json
├── next.config.js
├── package.json
└── .env.local.example   # Copy to .env.local for local dev
```

---

## Local development (optional)

```bash
cp .env.local.example .env.local
# Fill in your API keys in .env.local

npm install
npm run dev
# App runs at http://localhost:3000
```

For Miro to load your local app, use ngrok:
```bash
npx ngrok http 3000
# Use the https URL as your Miro App URL
```

---

## Tech stack

- **Next.js** (React + API routes)
- **Anthropic Claude** (Vision AI for image analysis)
- **Miro Web SDK v2** (Board manipulation)
- **Vercel** (Hosting)
