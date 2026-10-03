# Spring/action-end v2 verification — 2026-10-03

- 12 JavaScript module syntax checks passed.
- 25 Node tests passed, 0 failed (including 5 spring/action revision regressions).
- 65 unique asset IDs checked; hashes, dimensions and all C/N/M mappings passed.
- Changed Markdown local links and git diff whitespace checks passed.
- Actual browser seed 20261003: spring yields three cards once; node reward leaves 13/10 hand and 3/3 AP with no discard; explicit end opens discard and settles hunger/water once. The new route completed all five voyages; log spring-v2-route.txt.
- Additional browser route: after reward, drink water, eat ration and craft torch; zero remaining AP auto-settles and starts voyage 2 with exactly ten cards, without discard. Health 30; hunger/hydration 90.
- Final canvas CSS dimensions match viewport 1280x720, no horizon-art screenshot overlay; loaded card images confirmed; final fresh page console warn/error empty. Final overview screenshot saved separately.

Scope: local desktop horizontal view, trial pool. No exhaustive balance, mobile, every node or production performance validation. See ../../docs/design/spring-and-action-end.md and ../asset-sources/spring-v2.md.
