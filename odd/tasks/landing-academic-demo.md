Objective: rebuild the AllinBand landing as an honest academic demo inside the "family chat" world, fixing every audit finding.
Branch: feat/academic-demo-redesign. Delivery: exception-ok (one rewrite, not sliceable by behavior; push and PR stay with the user).
Test runner: none in the project; checks run with a scratch Playwright script outside the repo.

## Specs

- S1. Product status: "allin-band es un demo-proyecto acadeico." The first viewport says so; no copy implies a product on sale, a real pilot, or a medical device.
- S2. "puedo agregar o quitar los assets que consideres necesarios asi que no hay nada fijo en la interfaz. incluso el logo puede ser cambiado". New logo, replaced or removed assets.
- S3. Chosen direction: "Chat familiar": the alert told as a family group thread, with an interactive demo where the visitor triggers an alert and cancels it or lets it escalate.
- S4. No form and no personal data collected; `console.log` of user data gone.
- S5. Claims stated as design goals; contradictions from the audit removed; plain language.
- S6. Page weight under 2 MB (audit: 27.24 MB).
- S7. Content visible without JS (audit: 22 hidden blocks).
- S8. Text respects the browser font-size preference; FAQ never clips at large text.
- S9. Contrast AA at 1440, 1366, 1024, 820, 390, 360; primary action inside the first viewport at those sizes.
- S10. Audit P2 list closed: nav state, seams, skip-link shadow, focus radius, hover conflict, og:image, 404, dead CSS and docs.

## Tasks

- [x] T1 S2 S6 inline: brand and optimized assets. Commit 98b843a.
- [x] T2 S1 S3 S4 S5 S7 S8 S9 S10 inline: page, styles, demo. Commits 33bec6b, 6c23a21, and the handoff commit.
- [x] T3 S10 inline: README and docs. Commit cfa6daa.
- [x] T4 all delegated: independent browser verification and bounded correction recheck completed; parent regression tests and final suite pass. Risk item 6; coverage limits recorded in L8. Correction commit recorded below.
- [x] T5 inline: DESIGN.md and .impeccable/design.json generated from implemented tokens and components; canonical headings and JSON readback pass. Both remain local under existing gitignore policy.

Route evidence: one surface in shared files, so no Writer trigger; inline.

## Log

- L1 (2026-11-06) "inicia la auditoria, y en tus sugerencias de mejoras ten en cuenta que puedo agregar o quitar los assets que consideres necesarios asi que no hay nada fijo en la interfaz. incluso el logo puede ser cambiado"
- L2 (2026-11-06) "allin-band es un demo-proyecto acadeico."
- L3 (2026-11-06) "va. dale con  todo, usa las herramientas que creas convenitnes, incluso subagentes o lo qu e necesites"
- L4 (2026-11-06) Direction chosen by the user: "Chat familiar". Audit baseline: technical 11/20, Nielsen 20/36.
- L5 (2026-11-06) Finish review: first pass "fix", verdict pass 7 of 8 resolved. Remaining items applied in the handoff commit but not recaptured or rechecked: reader label "Tú" in App, closing heading "Quién está detrás", disclosure chips and pinned bar at 18px. Its provenance finding was wrong: the scan reports 0 missing, provenance is embedded in the files.
- L6 (2026-11-06) User stopped both background agents and handed off: "estmos cerc de llegar al limite de 5 horas. asi que voy a continuar el trabajo con otro agente."
- L7 (2026-11-06) User resumed: "continua con el trabajo."
- L8 Resume verification: independent worker checked a6c188a against 9112679. Both first-viewport buttons fit all six sizes (360x740 bottoms 589.58 / 657.58); loaded resources 336,821 bytes, all assets 353,842 bytes, no external requests. Demo cancel/escalation/replay, no-JS content, mobile menu/Escape and computed text contrast checks pass. These checks are not WCAG certification or exhaustive dead-CSS proof.
- L9 Corrections: visibility:hidden excluded the skip link from keyboard focus; clip-path preserves focusability. Intrinsic grid minimums and attachment margins overflowed at a real browser font preference of 28px; zero-minimum tracks, width accounting and title wrapping restore 360px document width. Added public-browser regression scripts and README runner instructions. Both tests fail on pre-fix a6c188a and pass after correction. Independent bounded recheck confirms skip-link fix and diagnoses FAQ tail overflow; parent confirms final reflow fix.
- L10 Documentation: recorded the existing family-chat world, CSS tokens, components and responsive/motion rules in local DESIGN.md and .impeccable/design.json; no new visual direction or claims. Existing ignore policy preserved.
- L11 Engram reads work, but review/save writes are blocked because the host session is unregistered. Memory mirror pending; no session identity invented. RDD remains globally off. Risk: item 6 (visual and browser behavior lacks comprehensive automated coverage; two regressions now have runnable tests).
- L12 Final suite: six viewport checks, cancel/escalation/replay, first keyboard focus, menu/Escape, no-JS 7/7 demo items and 7/7 sections all pass; page errors []. Both new regression tests observed RED on a6c188a and GREEN on current source. JS and test syntax, JSON readback and git diff --check pass. Detector on the changed base.css returned []. An initial test harness URL glob timed out; corrected to assert location.hash and rerun successfully. Full heuristic re-scoring and exhaustive unused-CSS analysis were not performed; no full accessibility certification is claimed.
- Next: local continuation complete. Engram mirror still pending session registration. Push, PR and publishing remain with the user.
