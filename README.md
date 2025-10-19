Plan to Reach Production Readiness

Stabilise the backend

Turn the giant migrations into verified releases; add seed data for staging and automated supabase db push scripts.
Build server-side functions for credit transactions, escrow holds/releases, dispute resolution steps, and scheduled reconciliations.
Implement core marketplace features

Matching engine that uses declared needs/offers to propose trades and 3-way loops; persist match proposals and expose them via API/UI.
Time-credit pricing and conversions (legal hour ≠ fashion hour) using real Nigerian market data; ensure ledger entries reconcile automatically.
Harden onboarding & verification

Integrate a reliable email provider for transactional emails with bounce handling; queue retries and surface status to admins.
Allow full app access after onboarding but gate sensitive actions (withdrawal, high-value trades) until email & optionally phone are verified.
Strengthen the frontend

Finish flows for service discovery, trade negotiation, messaging, and time logging; wire them to real data.
Add global error handling, loading states, and offline support.
Testing & QA

Snapshot Supabase schema tests, Vitest/Jest unit coverage for hooks/stores, Cypress/Playwright for critical flows (onboarding, match acceptance, dispute).
Set up lint/format hooks and CI to block regressions.
Operational readiness

CI/CD pipeline (GitHub Actions) that runs tests, applies migrations, and deploys to staging/prod.
Monitoring/logging (Sentry, Supabase logs) and alerting for failed trades, email delivery issues, and balance mismatches.
Documentation/runbooks for support (resend verification, intervene in disputes, refund credits).
Pilot rollout

Start with a closed beta: onboard a handful of real Nigerian SMEs, observe trades manually, refine pricing multipliers, gather feedback.
Iterate on matchmaking, refine credit valuations, and once metrics look healthy, scale marketing.
Until those gaps close, keep the rating at 4/10—good momentum, but more engineering and operational rigor is needed before real businesses can rely on it day to day.
1. Core Matching Engine (needs/offers → trades, including 3‑way loops)
What’s in place

We now store each profile’s needs and category.
There’s a lightweight matching service (src/services/matchingEngine.ts) that writes two‑way proposals into a new match_proposals table via the refresh_two_way_matches() RPC.
Discover displays those proposals, so users at least see simple “I need what you offer / you need what I offer” suggestions.
What’s missing

No three‑way loop detection yet—the RPC only pairs two users.
No rest endpoint for proposals beyond the Supabase RPC (e.g., no filtering by score).
No trace of state transitions (accept/decline) beyond a status column with no UI action.
What to do

Extend the matching function(s) to generate looped triples (A→B→C→A) and write them to their own table or multi-part proposal.
Add API/UI affordances to accept/decline and convert proposals into actual trades records.
Align matching frequency (cron job / scheduled function) so proposals don’t go stale.
2. Time-credit pricing & auto-reconciled ledger entries
What’s in place

The schema includes detailed credit_transactions tables with constraints.
timeCreditsService.calculateExchangeRate(...) exists in the frontend to do rough conversions.
The migrations enforce basic accounting constraints (balance_before/balance_after checks).
What’s missing

No central pricing service fed by “real Nigerian market data”; the exchange rates are still hard-coded heuristics.
Ledger entries are not auto-generated when matches occur—only the welcome bonus runs via trigger.
No back-office job ensures trades settle exactly, or that totals reconcile.
What to do

Build a single source of truth for rates, ideally seeded from market data and stored server-side.
When a trade moves from accepted → completed, insert the corresponding credit/debit entries automatically via stored procedures or backend functions.
Add reconciliation checks/tests and alerts for mismatched ledger sums.

Progress

✅ Added `credit_exchange_rates` as the canonical table seeded with recent Nigerian market data, plus helper `get_latest_exchange_rate` to keep trades/ledger aligned.  
✅ New `handle_trade_completion` trigger posts earned/spent `credit_transactions` for both participants the moment a trade flips to `completed`, pulling the correct rate snapshot and keeping profile balances up to date.  
✅ Reconciliation workflow via `run_credit_reconciliation` / `assert_credit_reconciliation` logs mismatches into `credit_reconciliation_events` and fires `pg_notify('ledger_alerts', ...)` for automated monitoring.
3. Harden onboarding & verification (per myrule.mdc)
Current state

Sign-up collects display name, services, needs, phone, etc., and seeds those into profiles at creation.
Onboarding recognises what’s already done and guides users through email verification (with reminders/resend).
AuthGuard blocks the rest of the app until is_onboarded flips, so sign-in is otherwise seamless.
What’s left

No phone OTP enforcement (it’s now optional) and no follow-up flows for unverified phone/email beyond banners.
No fraud/throttling checks or dispute path in onboarding.
Verification requirements are lighter than the “must verify before trading” stance in the rule file.
Suggestions

Reinstate phone verification for higher-value actions (posting services, initiating trades).
Layer in rate limiting or “verify in X days” policies to meet the trust expectations described in myrule.mdc.
Add admin dashboards to review verification status and intervene manually.
Bottom line
✔️ We accomplished the scaffolding: storing needs/offers, creating a proposal table, pushing the UI reminders, and seeding default ledger behavior.
❌ The deeper marketplace mechanics (three-way loops, dynamic pricing, automatic settlement, rigorous verification gates) are still to be implemented.

Next steps

Decide whether you want me to add 3-way matching and pricing/settlement logic now, and if yes, sketch the desired data flow so I can start coding.
For onboarding/verification, confirm the level of strictness you want—e.g. block trades until both phone and email are confirmed, or only certain actions.
Let me know which of those you’d like me to tackle first, and I’ll queue up the work.
