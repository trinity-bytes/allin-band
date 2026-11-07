Objective: replace the family-chat landing with the nature and care redesign approved piece by piece in Figma, as an honest academic demo.
Branch: feat/academic-demo-redesign (head 258fb18, not pushed). Delivery: ask-on-risk; push and PR stay with the user.
Test runner: none in the project; scratch Playwright outside the repo, plus tests/reflow.cjs and tests/skip-link.cjs.
Status: implementation approved on 2026-11-06 (L9).

## Specs

Design source: Figma file IEIOIHCnxY7dYDObgHVwAi, page "Redesign / Hero v2" (21:223). Desktop column at x=0, mobile column at x=1540, horizontal strip 64:223 below both.

- S1. Section order: Hero (21:224), Una emergencia no avisa (53:223), Una mañana cualquiera (31:225 plus states 42:267, 42:293), Tú decides primero (23:223), Si no respondes, tu familia lo sabe (31:226), Tu familia sabe cómo estás (31:227), Pensada para todos los días (27:230), Metas de diseño (31:228), Lo que no puede hacer (31:229), Lo que la gente pregunta (31:230), Quién está detrás and footer (31:231). Mobile frames: 23:235, 53:252, 37:237, 37:261, 37:293, 37:338, 38:223, 38:229, 38:255, 38:271, 38:311.
- S2. Direction: dark forest ground, warm white text, amber accent, Host Grotesk headings, Atkinson Hyperlegible Next text. Remove the indigo and marigold palette: "parece marca de bebida energetica". Chat treatment stays out of the page.
- S3. Own surface style "bruma": moss veil #233229 at 50-66 %, 32px backdrop blur, no border, no reflection, no gradient, no shadow, only over photos. "busques una identidad propia para el proyecto". No card around free text: "ya satura mucho el uso de cards".
- S4. Navbar: open text over the sky with ring mark and white demo pill; mist band only after scrolling.
- S5. Hero: headline behind the band, parallax layers landscape, headline, band, grass mid, grass near; staged entrance; pointer depth on desktop; static on touch and reduced motion.
- S6. Pulse: flat baseline, rate shown by beat spacing, line drawn like tricks.de with stroke-dashoffset. "al hacer hover sobre las partes del timeline donde se muestran las obsercaviones, la frecuentcia del pulso aya cambiando, acelerandose cuando se selecciona la aprte de la alerta y descelerandoce cuando regresa a la normal". "ademas de que se active con el hover debe cambiar entre ellos automaticamente". About 6 s per state; hover, focus or tap pause it; progress bar on the active tab; no auto-advance under reduced motion.
- S7. Horizontal scroll: "desde la seccion una mañana cualquiera hasta la seccion pensada para todos los dias, sea scroll horizontal". Desktop only; mobile stays vertical for now. Sticky stage plus translateX from vertical scroll, no library, pulse progress line. Vertical fallback for reduced motion, no JS and short viewports. Morning auto-advance runs only while its panel is in view. Menu anchors and keyboard must reach every panel. Needs a fit plan for 1366x768.
- S8. Metas de diseño: giant band from the left edge, stats following its curve with dots; desktop leader lines to right-aligned labels. Measured right-edge profile is in the Log. Keep IPX7: "deja lo del ipx7, es un nice to have".
- S9. Contacts: no limit anywhere: "quita lo de los contactos porque podria parecer limitante". FAQ question becomes "¿A quién le avisa?"; its answer still has to be written.
- S10. Facts from the report: band alerts first with sound and vibration, the phone also shows it, the phone is the Bluetooth bridge at about 10 m; health center and first contact are notified together, next contact after 10 s. Goals: 5 s, 99,5 %, 24 h, AES-256, PIN or biometrics, Android 10+ and iOS 14+. Keep the academic disclosure in the first viewport; nothing reads as a certified or real medical device.
- S11. Copy, sources and team as in Figma. Team: Tamara Guzman, Mariana Morocho, Fabrizio Santi, Jahat Trinidad. Student codes never appear on the page.
- S12. Images: use assets/images/web with srcset; lazy-load below the first screen; "Imagen ilustrativa" on generated images. The old 2 MB limit is replaced by a per-screen budget, proposed: first screen about 1.25 MB desktop, 0.3 MB mobile; whole page about 2.5 MB desktop, 0.93 MB mobile. Assumption: user has not confirmed this budget.
- S13. Keep from the previous work: content visible without JS, no personal data, keyboard access, reflow at large text, AA contrast measured in browser at 1440, 1366, 1024, 820, 390, 360.

## Tasks

- [x] T0 assets inline: 24 responsive WebP files in assets/images/web. Commit b0f25e4. Upscaled PNG and original JPEG sources moved to ../allin-band-sources, outside the repo.
- [x] T1 S2 S3 S4 inline: tokens, fonts (self-host Host Grotesk), base styles, navbar, footer. Also the static hero layers and callouts, because the navbar is designed over the hero sky. Commit 2fdbecd.
- [ ] T2 S1 S5 S10 S11 S12 inline: middle sections structure and copy, hero motion (static layers already done in T1).
- [ ] T3 S6 S7 inline: pulse component and horizontal journey.
- [ ] T4 S8 S9 inline: goals curve, limits, FAQ, closing.
- [ ] T5 S13: browser verification at all sizes, regression tests, docs and DESIGN.md update.

Route evidence: one page across shared files, so no Writer trigger; inline. Risk to review at T3: item 6, browser behavior with little automated coverage.

## Log

- L1 (2026-11-06) "te habia dado mi feedback respecto al rediseño y te prometi que te pasaria referenecias para el hero"
- L2 (2026-11-06) Figma mockup iterated through references, palette, type, surfaces, pulse, phones, problem section, goals and team. The Engram topic design/hero-v2-mockup holds the decisions.
- L3 (2026-11-06) "todavia no di el visto bueno. solo hemos visto como 2 a 3 secciones de la landing"
- L4 (2026-11-06) "va. antes de pasarlo a limpio necesito escalar esas imagenes generadas a una resolucion mas alta."
- L5 (2026-11-06) Upscaled sources received: chair, landscape, morning, portrait at 3072x2048, family at 2048x2560, faces and landscapes inspected with no visible artifacts. Files use the suffix _upscayl_2x_remacri-4x.png and total 49 MB, so they must not be committed.
- L6 (2026-11-06) WebP weights: full page 2.56 MB at desktop sizes, 0.93 MB at mobile sizes; first screen layers 1.25 MB desktop, 0.29 MB mobile. Transparency verified on band-800.
- L7 Band outline, side view, right edge as fraction of image width by fraction of height: .108 .748, .156 .792, .204 .824, .252 .848, .3 .864, .348 .912, .396 .916, .444 .896, .492 .9, .54 .9, .588 .9, .636 .892, .684 .88, .732 .86, .78 .832, .828 .8, .876 .756, .924 .692.
- L8 Environment: band and grass PNG sources are on origin/main (13ff63e, 7a3f4e1), not on this branch; docs/DESIGN-PLAN.md is also there. The report docx in docs/ holds student codes and weighs 20 MB: keep it out of commits. Report citations were not checked against primary sources. Contrast measured only on some desktop surfaces.
- L9 (2026-11-06) "vamos a continuar con el desarrollo de la landing, ahora pasaos a la implementacion. tenemos los assets optimizados, asi que cre que falta commitearlos y descartar los assets no optimos"
- L10 (2026-11-06) T1 done. Old chat page removed (chat.css, sections.css, demo.js, Bricolage font). New css/nav.css, hero.css, closing.css. Checked in the browser over http at 1440x900, 1366x768, 1024x768, 390x844 and 360x640: no horizontal scroll, no console errors; closing measured 1212 px desktop (frame 1210) and 1209 px mobile (frame 1214). Callouts appear only from 80rem, because at 1024 the left chip touched the edge. No-JS mobile: the navbar flows above the hero. tests/skip-link.cjs PASS. tests/reflow.cjs PASS with the full Chromium binary (CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome); the headless shell ignores the font preference and fails at the base commit too. Its FAQ check has nothing to test until T4. Known gaps: nav anchors and "Probar el demo" (#tu-decides) point to sections built in T2-T4; mobile intro copy keeps "AllinBand es el concepto" (the Figma mobile frame starts with "El concepto"); favicon, og-image and its alt text still belong to the chat page; band-cutout.webp is no longer used. Contrast not measured yet (T5).
- L11 (2026-11-06) "queda bien pero no olvides las animaciones, efectos de parallax y otras cosas que prometiste en el momento del diseño de la landing". Shell approved visually over Tailscale. Motion promised in design (Engram design/hero-references): staged entrance and pointer-driven layered depth from the first 8 s of the Pyko video; no three.js. Order: hero motion first (T2a), then middle sections (T2b), pulse and horizontal journey (T3).
- L12 (2026-11-06) T2a hero motion: staged entrance after the landscape and band decode (1.2 s cap); words rise one by one, band rises and scales, grass climbs, dots pop, leader lines draw with stroke-dashoffset, chips slide in, copy fades up. Desktop with hover and fine pointer: scroll drift and pointer depth per layer, band tilts up to 7 deg. Checked over http at 1440x900: play class set, band and grass transforms follow the pointer and the scroll, no errors. Reduced motion: no motion class, words opacity 1, no transforms. Touch at 390: entrance plays, layers stay static. With hero.js blocked, the 3 s failsafe shows the content. skip-link and reflow tests PASS.
- Next: T2b middle sections.
