# SETUP GUIDE — Meena ki Zindagi
*Written for someone with basic computer skills. Every step is copy-paste-able. Total time to go live: ~15 minutes, cost: ₹0.*

---

## 1. What you have

One folder called `meena` containing:

```
meena/
├── index.html            ← the page (rarely touched)
├── css/style.css         ← colours & looks
├── js/app.js             ← game engine (rarely touched)
├── data/story.json       ← GAME LOGIC & NUMBERS (you edit this)
├── data/lang/en.json     ← all English text (you edit this)
├── data/lang/hi.json     ← all Hindi text
├── data/lang/mr.json     ← all Marathi text
├── manifest.webmanifest  ← makes it installable as an app
├── sw.js                 ← makes it work offline
└── icons/                ← app icons
```

**Important:** double-clicking `index.html` will NOT work (browsers block local file loading for security). You must either run a tiny local server (step 2) or put it online (step 3).

---

## 2. Test on your own computer (2 minutes)

**Windows / Mac / Linux with Python installed** (Macs have it built in):

1. Open Terminal (Mac) or Command Prompt (Windows).
2. Type `cd ` (with a space), then drag the `meena` folder into the window, press Enter.
3. Type: `python3 -m http.server 8000` (on Windows try `python -m http.server 8000`)
4. Open your browser to: **http://localhost:8000**

To test on your phone (same WiFi): find your computer's IP address (Windows: `ipconfig`, Mac: System Settings → WiFi → Details) and open `http://THAT-IP:8000` on the phone.

To stop the server: press `Ctrl + C` in the terminal.

---

## 3. Put it online FREE — Option A: Netlify Drop (easiest, 3 minutes)

1. Go to **https://app.netlify.com/drop** (make a free account if asked).
2. Drag the whole `meena` folder onto the page.
3. Done. You get a link like `https://something-random.netlify.app` — this works on any phone, anywhere.
4. To rename the link: Site settings → Change site name → e.g. `meena-ki-zindagi` → your link becomes `https://meena-ki-zindagi.netlify.app`

**To update the game later:** go to your site on Netlify → "Deploys" tab → drag the updated folder in again. New version is live in seconds.

## 3. Put it online FREE — Option B: GitHub Pages (better for open source)

1. Make a free account at **https://github.com**
2. Click **+** (top right) → New repository → name it `meena` → Public → Create.
3. Click "uploading an existing file" → drag ALL files/folders from inside `meena` → Commit.
4. Repository → Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save.
5. After ~2 minutes your game is live at `https://YOUR-USERNAME.github.io/meena/`

Bonus: GitHub is also your backup and your open-source home. Anyone can suggest improvements.

**To update later:** open the file on GitHub → pencil icon → paste new content → Commit. Live in ~1 minute.

---

## 4. Installing on phones (what to tell your users)

The game is a PWA (works like an app, no Play Store needed):
- **Android (Chrome):** open the link → menu (⋮) → **"Add to Home screen"** → it installs with an icon, works offline.
- **iPhone (Safari):** open the link → Share button → **"Add to Home Screen"**.

Progress saves automatically on each phone. No login, no data collection.

---

## 5. Optional: your own domain (~₹700–900/year)

1. Buy a domain (e.g. `meenakizindagi.in`) from GoDaddy/Hostinger/Cloudflare.
2. Netlify: Site settings → Domain management → Add custom domain → follow the DNS instructions shown.
That's the ONLY possible cost in this whole project. Everything else is free forever.

---

## 6. After you edit any file (checklist)

1. **Validate JSON** (a missing comma breaks everything): paste the edited file's contents into **https://jsonlint.com** → click Validate. Fix anything red.
2. Test locally (step 2) — play the chapter you changed.
3. Re-deploy (drag to Netlify / commit to GitHub).
4. In `sw.js`, change `meena-v1` to `meena-v2` (then v3, v4…) each time you deploy — this makes phones that installed the game fetch your new version.

---

## 7. If something breaks

Open the game → press F12 (computer browser) → "Console" tab → red text tells you what's wrong. 90% of the time it's a JSON comma. Copy the red error + the file you edited into any AI assistant and ask it to fix the JSON. See EDIT_GUIDE.md for ready-made prompts.
