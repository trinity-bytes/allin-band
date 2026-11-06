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

- [ ] T1 S2 S6 inline: brand and optimized assets.
- [ ] T2 S1 S3 S4 S5 S7 S8 S9 S10 inline: page, styles, demo.
- [ ] T3 S10 inline: README and docs.
- [ ] T4 all delegated: independent verification (Risk item 6, no automated test covers this).

Route evidence: one surface in shared files, so no Writer trigger; inline.

## Log

- L1 (2026-11-06) "inicia la auditoria, y en tus sugerencias de mejoras ten en cuenta que puedo agregar o quitar los assets que consideres necesarios asi que no hay nada fijo en la interfaz. incluso el logo puede ser cambiado"
- L2 (2026-11-06) "allin-band es un demo-proyecto acadeico."
- L3 (2026-11-06) "va. dale con  todo, usa las herramientas que creas convenitnes, incluso subagentes o lo qu e necesites"
- L4 (2026-11-06) Direction chosen by the user: "Chat familiar". Audit baseline: technical 11/20, Nielsen 20/36.
