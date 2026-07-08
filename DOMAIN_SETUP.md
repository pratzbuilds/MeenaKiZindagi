# Hosting the game on your own domain (game.yourdomain.com)

You already have a domain. Here's how to point a subdomain at your GitHub-hosted game.
Total time: 10 minutes of clicking, plus a 15-minute wait for DNS/HTTPS.

---

## What you'll end up with

- `game.yourdomain.com` → shows the game
- Same repo, same updates — pushing to GitHub still deploys instantly
- Free HTTPS (the little padlock 🔒) handled by GitHub automatically
- All tracking, shares, save-game — everything keeps working with no code changes

---

## Step 1 — At your domain registrar (GoDaddy / Namecheap / BigRock / etc.)

Log in to the place where you bought the domain, find the DNS panel (sometimes
called "Manage DNS", "DNS Records", or "Advanced DNS"), and add ONE new record:

| Field                | Value                        |
| -------------------- | ---------------------------- |
| Type                 | `CNAME`                      |
| Host / Name / Subdomain | `game`                    |
| Value / Points to / Target | `pratzbuilds.github.io` |
| TTL                  | Leave default (usually 3600 or "Automatic") |

Save. That's the only DNS change you need.

**Tip:** If you want the game at the root (`yourdomain.com` itself), the setup is
slightly different — use 4 `A` records instead. But subdomain is much cleaner
because your main domain stays free for a landing page later.

---

## Step 2 — In your GitHub repo

1. Open https://github.com/pratzbuilds/MeenaKiZindagi
2. Click **Settings** (top nav, far right)
3. In the left sidebar, click **Pages**
4. Under "Custom domain", type: `game.yourdomain.com`
5. Click **Save**

GitHub will now check whether the DNS record you set in Step 1 has propagated.
This can take anywhere from 2 minutes to 24 hours (usually under 30 minutes).

You'll see a message like "DNS check in progress" → "DNS check successful".

---

## Step 3 — Turn on HTTPS

Once the DNS check passes, a checkbox appears on the same Pages page:

☐ **Enforce HTTPS**  ← tick this

GitHub will generate a free SSL certificate. It can take another 10–20 minutes.
When it's ready, `https://game.yourdomain.com` will show the padlock icon and
your game will be live at the new address.

---

## Step 4 — What happens to the old GitHub URL?

`https://pratzbuilds.github.io/MeenaKiZindagi/` keeps working AND redirects to
`game.yourdomain.com` automatically. Anyone with old links stays working.

The share button in the game automatically uses whatever address the game is
being played from — no code change needed.

---

## Common issues

**"DNS check failed"** → Wait 15 minutes and try again. Some registrars are slow.
If it's still failing after an hour, check the CNAME record spelling.

**Padlock not appearing after 24 hours** → In the Pages settings, uncheck
"Enforce HTTPS", save, tick it again, save. This nudges GitHub to retry.

**Game shows but looks broken** → Clear browser cache. Because the service
worker cached the old GitHub URL, a hard reload (Ctrl+Shift+R or long-press
the reload button on mobile) fixes it. This is a one-time issue per browser.

---

## Later: your brand's landing page

When you're ready, you can host a landing page for your brand at the root
domain (`yourdomain.com`) with a big "Play the Game" button pointing to
`game.yourdomain.com`. That page can live in a totally separate GitHub repo —
they don't conflict. Ping me when you want to build it.
