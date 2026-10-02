# First-layer demo verification — 2026-10-03

Commands run from water-era against the final implementation:

- npm run check: Syntax passed: 12 JavaScript modules.
- npm test: 20 tests, 20 pass, 0 fail, 0 cancelled, 0 skipped.
- npm run check:assets: 61 unique asset IDs; hashes/dimensions and all C/N/M image mappings passed.
- git diff --check: no whitespace errors in the game and root documentation repositories.
- Local Markdown links in 12 changed/new documents checked: all targets exist.

Browser: actual DOM buttons through Codex in-app browser; no game state injection. Three successful five-voyage routes (seeds 20261003 twice with different choices, and 2) plus failed seed 5 at battle turn 14. Route logs and screenshots are in this directory. The final fresh page had no warn/error console entries. Cached old-entry error and focus-induced page scrolling were corrected and retested; do not interpret the early browser session as error-free.

See ../README.md and ../../docs/development/first-layer-demo-v1.md for scope, trial choices and limits. No Boss or player save UI; no claim of exhaustive content, image, device, mobile or performance validation.
