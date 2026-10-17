# Starter validation — 18 October 2026

Executed in the generation environment using Node.js:

- 8 passing unit tests for CSV, validation, monetary parsing, detection, deduplication, review constraints and export escaping.
- 4 passing local HTTP smoke tests: frontend file serving, sensitive-file denial, token requirement and unapproved-URL rejection.
- JavaScript syntax checks passed for frontend app and local server.
- Sample dataset produced 20 valid rows, 2 validation errors and 2 candidate findings.

Total: 12 automated tests passed. No external TinyFish request was made; local server tests use a dummy key and reject requests before reaching the provider. No API key is included. Full interactive browser, cross-browser, accessibility, load and production security testing have not been performed.

Run again with `npm test` (Node.js 22 or newer).
