/* ============================================================
   MEENA KI ZINDAGI — lightweight analytics (V4)
   Counts: plays, chapter-by-chapter drop-off, endings, shares.
   No personal data. No cookies set by this file.

   HOW TO TURN ON (pick ONE, or leave both empty = tracking off):

   1) GoatCounter (simplest — free, one dashboard page)
      - Create a free account at https://www.goatcounter.com
      - You get a code like  mygame  →  mygame.goatcounter.com
      - Put that code below in GOATCOUNTER_CODE.

   2) Google Analytics 4
      - Create a GA4 property at https://analytics.google.com
      - Copy the Measurement ID (looks like G-XXXXXXXXXX)
      - Put it below in GA4_ID.

   Events you will see either way:
     game_start, chapter_1 … chapter_8, milestone_*,
     ending_tier_1 … ending_tier_4, share_clicked
   Drop-off = compare counts: chapter_1 vs chapter_5 vs ending.
   ============================================================ */
(function () {
  "use strict";

  var GOATCOUNTER_CODE = "";   // e.g. "meenagame"
  var GA4_ID = "";             // e.g. "G-XXXXXXXXXX"

  // ---- GA4 loader (only if configured) ----
  if (GA4_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  // ---- the one function the game calls ----
  window.meenaTrack = function (eventName) {
    try {
      if (GA4_ID && window.gtag) window.gtag("event", eventName);
      if (GOATCOUNTER_CODE) {
        // GoatCounter counts each event as a pseudo-pageview
        var img = new Image();
        img.src = "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count?p=/event/" +
          encodeURIComponent(eventName) + "&t=" + encodeURIComponent(eventName);
      }
    } catch (e) { /* tracking must never break the game */ }
  };

  // count arrivals via shared links (link contains ?src=share)
  try {
    if (location.search.indexOf("src=share") >= 0) window.meenaTrack("arrived_via_share");
  } catch (e) {}
})();
