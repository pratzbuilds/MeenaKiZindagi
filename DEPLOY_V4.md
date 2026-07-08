# Deploying V4 — step by step

## 1. Upload to GitHub (replaces V3)

1. Open your repo → github.com/pratzbuilds/MeenaKiZindagi
2. Delete these OLD leftover files from the repo root if they exist
   (they were misnamed duplicates and are gone in V4):
   - `app.js`  (root — NOT js/app.js)
   - `story.json`  (root — NOT data/story.json)
   - `en.json`  (root — NOT data/lang/en.json)
   - `icon-192.png` and `icon-512.png`  (root — NOT the icons/ folder)
3. Upload everything from this V4 zip, keeping the folder structure
   (index.html at root, js/, css/, data/, icons/).
4. Commit. GitHub Pages redeploys automatically in ~1 minute.
5. Because the service worker cache is bumped to "meena-v4",
   returning players get the new version automatically on next visit.

## 2. Turn on tracking (5 minutes, optional but recommended)

Open `js/track.js`. At the top there are two empty settings — fill ONE:

**Option A — GoatCounter (recommended: free, simple dashboard)**
1. Sign up at https://www.goatcounter.com (free for personal use)
2. Choose a code, e.g. `meenagame` → your dashboard is meenagame.goatcounter.com
3. In track.js set:  `var GOATCOUNTER_CODE = "meenagame";`
4. Commit. Done.

**Option B — Google Analytics 4**
1. Create a property at https://analytics.google.com
2. Copy the Measurement ID (G-XXXXXXXXXX)
3. In track.js set:  `var GA4_ID = "G-XXXXXXXXXX";`

**What you'll see either way (as event names):**
- `game_start` — how many games began
- `chapter_1` … `chapter_8` — the funnel. Where numbers fall = where players stop.
- `ending_tier_1..4` — how many finished, and how well
- `share_clicked` — shares out
- `arrived_via_share` — players who came IN through a shared link
- `milestone_*` — how far savings progressed

No names, phone numbers, or personal data are collected.

## 3. Custom subdomain (game.yourdomain.com) — when you're ready

1. In your domain registrar's DNS panel, add one record:
   - Type: `CNAME`
   - Name/Host: `game` (this makes game.yourdomain.com)
   - Value/Target: `pratzbuilds.github.io`
2. In GitHub: repo → Settings → Pages → Custom domain →
   type `game.yourdomain.com` → Save.
3. Wait 10–30 minutes, then tick "Enforce HTTPS" on the same page.
4. That's it — same repo, same updates, nicer address. The share
   button automatically uses whatever address the game is served from.

## 4. Editing text later

All words live in `data/lang/en.json`, `hi.json`, `mr.json`.
Edit any value (never the key on the left), commit, done.
New V4 keys you may want to tweak: `intro.*`, `scheme.*`,
`fund.cash/surplus/partial`, `mile.*`, `ui.disclaimer`.
