# Evaluation

The frozen public development suite contains 24 questions covering ownership,
Commerce, Stripe, Ship, template setup, EmDash, blocks retirement,
cross-source retrieval, wrong-version and unavailable facts, private-data and
edit refusal, and explicit text-only screenshot limitation.

Run `dinkus-guide-eval run --json --mode extractive` after corpus sync. Each
case reports fact matches, required citation matches, abstention and pass
status. The evaluator spawns `bin/dinkus-guide`; it never imports ranking or
answer code.

Extractive results measure retrieval and citation behavior only. Fixture
provider tests measure adapter validation only. Neither is live model quality.
Any approved real-model run must record provider/model identity, corpus hash,
command, outcome and limits separately, without storing credentials or raw
provider transcripts.
