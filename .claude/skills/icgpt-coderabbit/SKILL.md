---
name: icgpt-coderabbit
description: Evaluate and resolve every CodeRabbit finding on an open icgpt PR — fetch the review comments, fix legitimate findings on the same branch, rebut false positives with reasoning, until nothing is left unaddressed
disable-model-invocation: false
user-invocable: true
---

# Resolve CodeRabbit findings on an icgpt PR

Part of the PR step of `icgpt-new-feature`: after a PR is created, every
CodeRabbit finding is evaluated and resolved BEFORE the maintainer reviews.

## 1. Fetch the findings

CodeRabbit posts a PR-level summary comment plus inline review comments.
Fetch both:

```bash
gh pr view <N> --comments                              # summary + discussion comments
gh api repos/icppWorld/icgpt/pulls/<N>/comments        # inline review comments (the findings)
gh api repos/icppWorld/icgpt/pulls/<N>/reviews         # review bodies
```

CodeRabbit needs a few minutes after a push — if there is no review yet, wait
and re-fetch rather than concluding there are no findings.

## 2. Evaluate each finding — three verdicts

- **Legitimate** → fix it, following the implementation and test rules of
  `icgpt-new-feature` (steps 3-4): re-run what the fix touches — at minimum
  `make all-static`, plus `make test-backend` for `src/backend/` and the
  affected local smoketests / browser check for behaviour changes. Commit to
  the SAME feature branch — single-line message, no trailers. CodeRabbit
  re-reviews incrementally on push.
- **False positive / not applicable** → reply on that comment thread with the
  concrete reasoning (cite the code, the IC/Motoko semantics, or the design
  decision that shows why), so the maintainer sees the assessment:
  ```bash
  gh api repos/icppWorld/icgpt/pulls/<N>/comments/<comment_id>/replies -f body="..."
  ```
- **Real but out of scope** → reply saying so, open a GitHub issue for it
  (`gh issue create`), and link the issue in the reply.

Security findings on access control get extra care: a "false positive" verdict
on an authorisation finding needs the write paths into the guarded value spelled
out in the reply (what the caller controls vs what the IC proves — `caller`,
controller status, canister environment variables).

Never dismiss a finding silently, and never suppress one by disabling
CodeRabbit or editing its configuration.

## 3. Done when

- Every finding has either a fixing commit or a reasoned reply.
- `make all-static` and `make test-backend` are green after any fixes, and
  any behaviour change was re-verified locally (`icgpt-new-feature` step 4).
- Report the tally to the user (fixed / rebutted / deferred, with links).
  The PR then waits for the maintainer's manual approval — never merge.
