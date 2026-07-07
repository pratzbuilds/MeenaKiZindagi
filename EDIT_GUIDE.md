# EDIT GUIDE — Meena ki Zindagi
*How to change anything in the game without breaking it. Includes copy-paste prompts you can give any AI assistant (ChatGPT, Claude, Gemini — even small/free models handle these tasks well because each task is small and mechanical).*

---

## The golden rule: TWO kinds of files

| You want to change… | Edit this file | Example |
|---|---|---|
| **Words** (any sentence, in any language) | `data/lang/en.json`, `hi.json`, `mr.json` | Make a joke funnier, fix a translation |
| **Numbers & logic** (costs, rates, effects, chapters, choices) | `data/story.json` | RD rate changes to 6.9%, add a new decision |
| Colours / fonts | `css/style.css` | Change pink to orange |
| Game rules engine | `js/app.js` | (Rarely — ask an AI for help here) |

Every piece of text has an **ID** (like `c4s2.o1fb`). `data/story.json` says *"show text c4s2.o1fb here"*; the language files say *what those words are* in each language. Change the words → edit 3 language files (same ID in each). Change the logic → edit story.json once.

**ID naming:** `c4s2.o1fb` = **c**hapter 4, **s**creen 2, **o**ption 1, **f**eed**b**ack. `.q` = the question. `lm.*` = "Aur Samjho" learn-more cards. `ev.*` = shock events. `ui.*` = buttons/labels.

**JSON survival rules:**
- Every line ends with a comma EXCEPT the last one before a `}` or `]`
- All text in "double quotes". A quote inside text must be written as `\"`
- After ANY edit, paste the whole file into https://jsonlint.com before deploying

---

## Task recipes

### A. Change a sentence / fix a translation
1. Open the game, note roughly what the sentence says.
2. Open `data/lang/en.json` (or hi/mr), Ctrl+F a few words of it, edit, save, validate, deploy.

**AI prompt:** *"Here is a JSON language file for a game. Find the value containing '___' and rewrite it to say ___ in the same tone (warm, funny, simple Hinglish/Hindi/Marathi for a low-income Mumbai audience). Return only the corrected line."*

### B. Quarterly rate check (15 min, 4×/year) ⭐ most important routine
Government scheme rates change occasionally. Check current values of: **SSY, Post Office RD, PPF, APY amounts, PMJJBY (₹436) and PMSBY (₹20) premiums, PM-JAY cover (₹5 lakh)** on india.gov.in / indiapost.gov.in / jansuraksha.gov.in.

If a rate changed (say RD 6.7% → 6.9%):
1. `data/story.json` → `"config" → "rates"` → change `"rd": 0.067` to `0.069`
2. Search all 3 language files for `6.7` and update the mentions.
3. Also search story.json `costLabel` fields (the little price tags on options).

**AI prompt:** *"In these 4 attached JSON files, find every mention of the Post Office RD rate 6.7% (also written 0.067) and change it to 6.9% (0.069). List every line you changed. Do not change anything else."*

### C. Change an amount, cost, or effect
In `data/story.json`, each option has an `effects` block. The vocabulary:

| Effect | Meaning |
|---|---|
| `"cash": -5000` | one-time money out of the gullak (positive = money in) |
| `"debt": 30000` | take a loan (grows 30%/yr until repaid) |
| `"autosave": {"target":"rd","monthly":1000}` | start saving monthly into a pot: `cash, rd, sip, ssy, gold, chit, endowment, scam` |
| `"drain": {"monthly":1200,"years":2}` | monthly expense for N years (negative monthly = extra income!) |
| `"invest": {"target":"gold","amount":8000}` | move a lump sum from cash into a pot |
| `"redeem": {"target":"rd","cut":0.05}` | break a pot back into cash, losing 5% |
| `"tension": 8` / `"health": -5` | meters (0–100) |
| `"flags": {"pmjjby": true}` | remember a fact — flags drive insurance payouts, endings |
| `"pauseSaves": 1` | skip all autosaves for 1 year |
| `"tone": "good"/"bad"/"neutral"` | feedback colour + sound |
| `"hideIfFlag": "ssy"` / `"needFlag": "eshram"` | show option only if flag absent / present |

### D. Add a new decision screen
1. In `data/story.json`, copy an existing screen block (from `{ "id": ...` to its closing `}`) inside the chapter's `"screens": [...]`, give it a new id like `"c4s4"`, adjust options/effects.
2. In ALL THREE language files add: `"c4s4.q"`, `"c4s4.o1"`, `"c4s4.o1fb"`, `"c4s4.o2"`, `"c4s4.o2fb"`… (one pair per option).
3. Validate all 4 files, test, deploy.

**AI prompt:** *"Here is story.json and en.json from my game. Add a new decision screen 'c4s4' to chapter ch4 about [SITUATION]. 3 options: one good, one neutral, one bad, using only these effect types: [paste table above]. Then give me the 6 matching text entries for en.json in the same warm funny tone, plus Hindi and Marathi translations with the same keys for hi.json and mr.json."*

### E. Reorder or remove a chapter/screen
- **Reorder screens:** cut-paste the whole screen block to a new position in the `screens` array. Nothing else needed.
- **Remove a screen:** delete its block. (Leaving its text keys in the language files is harmless.)
- **Reorder chapters:** move the chapter block AND fix the `"year"` values so they still increase (1,2,3,5,7,10,15,20 style). The engine computes time-jumps from these.

### F. Add a whole new language (e.g. Bengali)
1. Copy `data/lang/en.json` → `data/lang/bn.json`, translate every value (never change the keys).
2. In `js/app.js`, find the three `lang-btn` lines in `renderTitle` and add: `<button class="lang-btn ${lang === "bn" ? "active" : ""}" data-l="bn">বাংলা</button>`
3. In `sw.js`, add `"./data/lang/bn.json",` to the FILES list.

**AI prompt:** *"Translate every VALUE in this JSON file to Bengali. Keep every KEY exactly the same. Keep the tone warm, funny, simple — for a low-income Mumbai audience. Keep ₹ amounts, scheme names (PMJJBY, SSY, RD) and emojis unchanged. Return the complete JSON."*

### G. Update a YouTube link
Learn-more videos live in `data/story.json` as `"video": "..."` inside `learnmore` blocks. Most are YouTube **search links** (`youtube.com/results?search_query=...`) on purpose — they never go dead. To pin a specific video you've vetted, replace with its full URL.

### H. Change difficulty / balance
In `data/story.json` `"config"`: `debtRate` (0.30 = loans grow 30%/yr — lower is kinder), `chitCollapseChance` (0.35), `sipSwing` (0.08 = market wobble), `expenseShare` (0.55 of household income). In `js/app.js` search for `0.06` ("repayment effort") — raise to make debt easier to escape.

### I. Change the look
`css/style.css` top `:root` block holds all colours with names (`--haldi`, `--rani`, `--peacock`…). Change a hex code, everything updates.

---

## After every edit
1. jsonlint.com → validate each edited file
2. Test locally (`python3 -m http.server 8000`)
3. Bump `meena-v1` → `meena-v2` in `sw.js`
4. Re-deploy (SETUP_GUIDE.md § 3)

## The one prompt that fixes 90% of breakages
*"My web game shows a blank/broken screen after I edited this JSON file. Here is the file: [paste]. Find the JSON syntax error (probably a comma or quote), fix it, and return the corrected file."*
