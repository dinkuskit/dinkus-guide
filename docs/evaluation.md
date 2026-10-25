# Evaluation

The frozen public development suite contains 24 questions covering ownership,
Commerce, Stripe, Ship, template setup, EmDash, page blocks transition,
cross-source retrieval, wrong-version and unavailable facts, private-data and
edit refusal, and explicit text-only screenshot limitation.

Run `dinkus-guide-eval run --json --mode extractive` after corpus sync. The
corrected suite is version 3 and retains 24 public development cases. It checks
extractive facts in cited evidence and answer text after removing the echoed
question (so the question cannot score),
model facts in the answer and text of cited evidence, and requires every source in a
multi-source case, validates abstentions and exit codes, and reports each case.
The evaluator spawns `bin/dinkus-guide`; it never imports ranking or answer code.
The screenshot case is intentionally text-only: no image inspection is claimed.

Extractive results measure retrieval and citation behavior only. Fixture
provider tests measure adapter validation only. Neither is live model quality.
Missing model configuration is reported as `unavailable` with a null score, not
as a zero-quality model result. Any approved real-model run must record the
actual returned provider model identity separately from requested configuration,
the corpus hash, command, outcome and limits, without storing credentials or raw
provider transcripts.
