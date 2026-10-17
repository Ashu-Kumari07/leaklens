# LeakLens — Evidence-led Cost Review

Built by **LeakLogic**.

LeakLens helps finance and operations teams find possible cost leaks, inspect the supporting records, and track what happened after a human review. A flag is a lead to investigate—not proof of fraud, waste or money saved.

## The problem

Businesses pay for suppliers, software and cloud services. Records are often spread across spreadsheets and vendor portals. A duplicate payment or an increase in a recurring charge can be easy to miss. But two equal payments can also be legitimate, so a useful tool must show evidence and allow a reviewer to dismiss a false alarm.

## What this repository contains

A working, beginner-friendly hackathon prototype using plain HTML, CSS and JavaScript, plus an optional Node.js backend for a real TinyFish public-pricing lookup. No frontend framework, build process or third-party package installation is required.

This version intentionally simplifies the original React/FastAPI/database architecture. It is not a production finance system.

### Implemented

- Dark-violet, responsive dashboard.
- CSV preview, validation and downloadable row errors.
- Reimport deduplication and rejection of conflicting source transaction IDs.
- Possible duplicate-payment detection with linked source records.
- Recurring-cost increase candidates, using an explicitly named plan and matching billing interval.
- Human review statuses, notes, evidence references and browser-local history.
- Separate currency totals; integer minor-unit money calculations.
- Findings CSV export, including spreadsheet-formula escaping.
- Fictional demo data and unit tests.
- Real TinyFish API adapter on a local server, with a server-side key, exact URL allowlist, access token, cooldown and failure handling.

### Not implemented

- Bank connections, payments, refunds, cancellations or resource shutdowns.
- User accounts, shared database, secure multi-user roles or a tamper-proof audit log.
- LLM-generated explanations, invoice OCR, trained ML or subscription-usage integrations.
- Automatic public-price comparison or verified savings measurement.

## Project structure

```text
leaklens/
├── index.html                 # App entry point, kept at root for GitHub Pages
├── HTML/
│   └── guide.html             # Beginner-friendly demo instructions
├── CSS/
│   └── style.css              # Dark violet responsive theme
├── JavaScript/
│   ├── app.js                 # UI, local storage, review and export
│   └── core.js                # CSV validation, rules and money logic
├── server/
│   └── server.js              # Local static server + TinyFish adapter
├── sample_data/
│   ├── template.csv
│   └── demo_payments.csv
├── tests/
│   └── core.test.js
├── docs/
│   └── GITHUB_SETUP.md
├── .env.example               # Placeholder settings only
├── .gitignore
├── .nojekyll
├── package.json
└── README.md
```

## Quick start: run without TinyFish

1. Install Node.js 22 or newer from https://nodejs.org/.
2. Download/extract this project into a folder.
3. Open a terminal in that folder (no VS Code or Git commands are needed).
4. Run:

```bash
npm start
```

5. Open http://localhost:3000.
6. Select **Load fictional demo**, inspect the preview, then **Import valid rows & analyze**.

Do not double-click index.html: this app uses JavaScript modules and fetch, so use the local server or GitHub Pages.

There are no npm dependencies; `npm install` is not necessary. Running the app locally is separate from uploading it to GitHub: uploading requires no terminal.

## Demo expectations

The supplied CSV contains 22 fictional rows:

- 20 valid rows and 2 invalid rows.
- One possible duplicate: TX-17 and TX-29, both INR 5,000, linked to INV-101 with distinct payment references.
- One recurring increase: Demo Cloud / Starter, INR 12,000 to INR 14,500 per month. The INR 2,500 change is not automatically a saving.
- Legitimate same-amount payments with different invoices; pending, failed and reversed rows; a separate USD transaction.

Try marking a finding Under investigation. Add a note and leave confirmed/recovered amounts at zero. For a fictional confirmation, enter 5000 as the confirmed total and provide a fictional evidence reference. Only record recovered money after a fictional refund reference is supplied. Mark the entire demonstration simulated.

## CSV format

Required columns:

| Column | Accepted values / meaning |
| --- | --- |
| transaction_id | Required, non-empty source transaction ID |
| transaction_date | Real date in YYYY-MM-DD format |
| vendor_name | Non-empty vendor name |
| amount | Non-negative decimal, maximum 2 decimal places; no commas or currency symbol |
| currency | INR, USD, EUR or GBP in this prototype |
| payment_status | completed, pending, failed, reversed or refunded |

Useful additional columns:

| Column | Purpose |
| --- | --- |
| invoice_number | Required by the strong duplicate rule |
| payment_reference | Distinct completed payment references strengthen duplicate evidence |
| recurrence | monthly, annual or one_time |
| plan_name | Required for recurring-increase matching |

UTF-8 CSV only; maximum 10 MB, 10,000 data rows and 1 billion currency units per transaction. Quoted commas, escaped quotes and multiline fields are supported. Original column values are retained alongside normalized matching fields, source filename, row and import time. Credits/refunds are represented by status, not negative amounts. The app does not reconcile refund or reversal relationships.

## Detection rules

### Possible duplicate payments

Compare completed records with the same normalized vendor, invoice, currency and amount, at least two distinct payment references, and a date span no longer than 30 days. Potential exposure is `(distinct completed references - 1) × payment amount`.

This is a candidate only. Check installments, invoice reissues and linked bank reversals/refunds. A missing invoice or payment reference is not enough for this strong rule. Matching normalization is deliberately conservative: case, whitespace and periods/commas; no fuzzy vendor merges.

### Recurring-cost increases

Group completed charges by vendor, explicitly supplied plan, currency and interval. Compare the last two observations; monthly gaps must be 20–45 days and annual gaps 300–430 days. Flag increases of at least 10%. These thresholds are configurable code choices, not validated risk probabilities.

Seat counts, tax and contract changes are not verified. The increase is shown as a review lead, excluded from duplicate recovery totals and never annualized as savings automatically.

### Import safety

Repeated source IDs with identical matching fields are skipped. Conflicting matching fields under one source ID are rejected. Repeated fingerprints are skipped even under another ID; this conservative choice can hide genuinely separate payments with identical available fields. Correct the source export and clear/reimport when necessary. Evidence changes reopen reviewed findings to avoid carrying a decision onto changed records.

## Financial labels and review

- **Unverified duplicate exposure:** duplicate candidates with New / Under investigation status.
- **Confirmed outstanding:** reviewer-confirmed total minus recorded recovery.
- **Recovered:** amount entered by the reviewer with supporting reference; not independently bank-verified by this app.
- **Recurring-cost increase:** separate per-interval change, not proven waste or recoverable money.
- **Completed spend:** gross completed imported payments, including suspected duplicates. It is not net spend after refund reconciliation.

Currencies are never added together. Money is stored in integer minor units (two-decimal currencies only). Review statuses are New, Under investigation, Confirmed, Dismissed and Resolved. A note is required on every save. Confirmed money requires an evidence reference; recovered money cannot exceed confirmed money. The same reference field should identify refund proof when recording recovery. Resolved means follow-up is complete, not necessarily that all money was recovered. All status choices remain manually reversible; this is not an approval-state machine.

## TinyFish integration: real API, optional configuration

```text
User approves lookup
    → Local Node backend checks token + exact approved URL
    → TinyFish reads permitted public pricing page
    → Structured pricing fields are returned
    → LeakLens adds source URL and retrieval time
    → Reviewer checks comparability manually
```

The server uses the documented synchronous endpoint:

```text
POST https://agent.tinyfish.ai/v1/automation/run
X-API-Key: <server environment only>
```

Request fields include `url`, `goal`, `output_schema` and `agent_config.max_duration_seconds`. It requests vendor, plan, visible price text, currency, interval, seat terms, region and caveats. Lookup results are unverified evidence; the app does not turn a list-price difference into a savings claim.

### Enable a live lookup

1. Obtain a TinyFish key from https://agent.tinyfish.ai/api-keys and review its current pricing/terms.
2. Copy `.env.example` to `.env` in the project root, using a file manager or text editor.
3. Replace the placeholders:

```dotenv
TINYFISH_API_KEY=your_real_private_key
LEAKLENS_ACCESS_TOKEN=your_own_random_secret_of_at_least_20_characters
TINYFISH_ALLOWED_URLS=https://your-approved-vendor-domain.example/pricing
PORT=3000
```

The example URL is a placeholder. Replace it with a real permitted public page. Multiple approved URLs may be comma-separated; each form URL must match exactly, including trailing slashes or query strings. Never approve internal, login, confidential or control-panel URLs. Only use domains/pages you have reviewed and are permitted to research.

4. Stop the existing server with Ctrl+C and start:

```bash
npm run start:live
```

5. Open http://localhost:3000. Enter the vendor, plan, exact approved URL and the same local access token in the form.
6. Review and approve the potential credit use, then submit. Never put the TinyFish API key into the browser form.

The access token is sent to the local server and cleared from the form afterward; it is not persisted in local storage. Expense rows are not sent to TinyFish. Only the selected public URL and vendor/plan labels are sent.

The adapter makes real network requests only after configuration and user action. It does not fall back to fake success. No live request has been verified with your account/key as part of generating this starter. Local tests do not consume TinyFish credits.

### Failure behavior and limits

Missing configuration, invalid token, unapproved URL, upstream error or timeout produces a readable error; CSV analysis continues. One lookup at a time, with a one-minute start cooldown. No automatic retries. The provider time budget is 90 seconds and client timeout 120 seconds; an interrupted synchronous run cannot be cancelled through this adapter and may still consume credits. Page-extraction results need human checking.

## Role of AI / ML

Core detection and money calculations are deterministic JavaScript. TinyFish provides AI-based website research. LLM finding summaries and trained ML are future work, not included features. With enough historical and labeled data, later versions could add grounded summaries, anomaly detection and forecasting without letting AI decide financial totals or accuse a vendor.

## Tests

```bash
npm test
```

Tests cover money parsing, quoted CSV, demo findings, import deduplication, different invoices, reversed rows, repeated payment references, source-ID conflicts, review constraints and CSV export escaping. See `docs/TEST_RESULTS.md` for the checks actually run on this starter. No claim of a full browser test or a successful live TinyFish call is made.

## Publishing to GitHub without Git / VS Code

See [the step-by-step browser guide](docs/GITHUB_SETUP.md). Upload the extracted contents, not just the ZIP. A website upload is still saved as a GitHub commit, but you do not need Git commands, VS Code or a local repository.

### GitHub Pages versus the live backend

GitHub Pages can serve this HTML/CSS/JavaScript demo. It cannot run `server/server.js` or keep a browser-side API key secret. On Pages the CSV dashboard works, but the live TinyFish lookup needs the included local server. This starter does not include remote-backend URL/CORS configuration.

For a full public deployment, deploy a hardened backend separately, add real authentication, scoped rate limits, TLS, persistence and frontend API routing. The supplied server deliberately binds only to 127.0.0.1 and is not a production-hosting template.

## Security and privacy

- Use fictional demo data. Financial rows are saved unencrypted in this browser's local storage, which is editable and can be cleared.
- Clearing local app data does not delete downloaded exports or provider-side logs.
- No multi-user access controls or tamper-proof audit trail are provided.
- Vendor-page text is untrusted input; the lookup prompt disallows actions, logins and access-control bypasses. Agent instructions are not a security sandbox: review results and approved URLs.
- Keys stay in the server environment. The local server only serves explicitly listed public frontend/sample files—not `.env` or source secrets.
- Never upload `.env`, real statements, real invoices, access tokens or keys. `.gitignore` does NOT protect a file you deliberately upload through the GitHub website. Review every upload yourself.
- If a secret is exposed, revoke/rotate it immediately; deleting the visible file alone does not remove Git history.

## Feasibility and future scope

Build and demonstrate the CSV → findings → evidence → review → export workflow first. Then configure one permitted TinyFish vendor lookup.

Later: backend database, secure login, approval roles, invoice OCR with confirmation, subscription usage/renewal integrations, authorized accounting exports, cloud utilization context and ML after sufficient history. Do not automate payments, cancellations or cloud shutdowns in the hackathon MVP.

## Reference material

- Project specification: LeakLens Project Blueprint, LeakLogic, version 1.0, October 2026 (provided by the project owner; not redistributed here).
- TinyFish Agent API: https://docs.tinyfish.ai/agent-api
- TinyFish API reference: https://docs.tinyfish.ai/agent-api/reference
- GitHub upload guide: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- GitHub Pages source setup: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

API documentation checked on 18 October 2026; verify current provider terms and API behavior before a public demo.

## Team

LeakLogic — product: LeakLens. Add your real team members and contact details here before publishing. No open-source license is selected in this starter; choose one deliberately if you want to grant reuse rights.
