# DESIGN BRIEF — Meena ki Zindagi visual upgrade
*Paste this whole file into Claude Design (or hand it to a Mumbai illustrator) to explore hand-drawn art directions. The game already works with built-in flat SVG scenes in exactly the layout described below — new art can replace it panel-for-panel without touching game logic.*

## The product
A free web game (Hindi/Marathi/English) where the player guides Meena, a 22-year-old garment worker in Mumbai, through 20 years of money decisions. Played on cheap Android phones, mostly at night in bed, by working-class women (housekeepers, factory workers, beauticians). It must feel like RELIEF from a stressful day — warm, funny, alive — with learning as a side effect. Not a quiz. Not a bank app.

## Art direction
Hand-drawn, local, relatable. Flat warm shapes, confident dark-brown outlines, imperfect lines welcome. References: Indian matchbox labels, truck art, bazaar poster painting, chawl wall murals. NOT: 3D, corporate fintech, glossy vector people, Western stock-illustration style.

**Palette (already in the game — keep it):**
- Paper `#FFF3DC` · Ink (outlines) `#2E1E12` · Haldi yellow `#F5A800`
- Rani pink `#D6336C` · Peacock teal `#146B6A` · Leaf green `#4C8C2B` · Brick red `#B3402A`

## The one scene that IS the game (most important asset)
A single room interior, 360×200 landscape, seen straight-on, that changes with time and fortune. Everything below already exists as code-drawn placeholders — redraw the same elements in the same positions:

**Fixed:** warm wall, earthen floor, window (right) showing Mumbai towers, wooden shelf (left) holding a steel dabba and THE GULLAK (clay pot — it visibly fills with gold as savings grow; this is the game's signature).

**Changes with fortune:** GOOD → fridge appears (year 9+), framed family photos accumulate, faces smile. STRUGGLING → wall crack, clothesline across the room, tired faces, bare shelf.

**Changes with time (the aging is the magic):**
- Meena at 4 life stages: 22 (black hair, bright rani sari) → late 20s → late 30s (first grey streak) → mid 40s (greying bun, deeper-toned sari)
- Husband (teal kurta, moustache) appears year 5+. In one story branch he dies — he is replaced by a small lit diya on the shelf. Draw this with dignity.
- Daughter: cradle (yr 7) → little girl in haldi frock with pigtails (yr 10) → teenager holding a schoolbook (yr 15+; no book in the branch where she was pulled from school)

## Asset list if replacing code art with images
PNG with transparency, 2x resolution: room backgrounds ×3 tones; Meena ×4 ages × (smile/tired); husband ×2 ages; daughter ×3 ages (+bookless variant); gullak ×5 fill levels; props (dabba, fridge, photos, diya, cradle, crack, clothesline). Consistent scale so they compose in the layout above.

## Also worth designing
App icon (gullak + falling coin, currently exists as simple version) · 1080×1080 share card template (result + "Can you do better? Play free") · four ending badge illustrations: Debt Trap 🕳️ / Just Surviving 🌧️ / Secure 🌤️ / Aatmanirbhar 🌟.

## Handoff note for whoever implements new art
All scene drawing lives in ONE function in `js/app.js`: `stageSVG()` (plus helpers `svgWoman/svgMan/svgGirl`). Either restyle those SVG shapes, or swap the function to return `<img>` layers using the state values it already receives (year, fortune tone, widowed/education flags, gullak fill %). Any AI coding assistant can do this given this file + that function.
