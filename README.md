Meena ki Zindagi 🪔
A free, open-source financial literacy game for working-class Indian women. Guide Meena through 20 years of life in Mumbai — phone EMIs, chit funds, weddings, monsoons, scams, and schemes — and see where her choices lead.
Languages: English • हिंदी • मराठी (easy to add more)
What it teaches (through story, not lectures)
Emergency funds and the ₹456/year insurance combo (PMJJBY + PMSBY)
Ayushman Bharat (PM-JAY), e-Shram, Post Office RD, Sukanya Samriddhi (SSY), Atal Pension Yojana (APY), SIPs
How chit funds, "paisa double" schemes, loan apps, sahukars, jeweller gold schemes, and fantasy gaming actually work
That resilience — not just the biggest number — is the goal: 4 possible endings from Debt Trap to Aatmanirbhar
Tech (deliberately boring)
Plain HTML + CSS + JavaScript. No build step, no npm, no framework, no server, no login.
All game logic and numbers in `data/story.json`
All words in `data/lang/en.json`, `hi.json`, `mr.json` (one file per language)
Progress auto-saves in the player's browser (localStorage)
Installable PWA — works offline after first load
Sounds are synthesized in code (zero audio files)
Run it locally
```
cd meena
python3 -m http.server 8000
```
Open http://localhost:8000 — that's it. (See SETUP_GUIDE.md for phone testing and free deployment.)
Edit it
See EDIT_GUIDE.md — written so a non-programmer can change text, numbers, chapters, and languages, with copy-paste prompts for AI assistants.
Update cadence
Scheme rates (SSY, RD, APY, PMJJBY etc.) change occasionally. A 15-minute quarterly review of `data/story.json` numbers + the lm.* texts keeps the game accurate. See EDIT_GUIDE.md § "Quarterly rate check".
License
Code: MIT. Story & text content: CC BY 4.0. Use it, translate it, remix it — just keep it free for the women it's meant for. ❤️
