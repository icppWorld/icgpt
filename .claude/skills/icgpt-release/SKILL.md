---
name: icgpt-release
description: Release ceremony for icgpt — preflight, deploy to the mainnet staging environment, staging sign-off, then a paused (maintenance mode) and snapshotted production upgrade with hash verification, admin smoke test, resume, tag, and the rollback path
disable-model-invocation: false
user-invocable: true
---

# Release icgpt (staging → production)

icgpt.onicai.com has real users. A release promotes ONE commit of `main`:
first to **staging** (mainnet, dev accounts only), then — after the user signs
off on staging — to **production**, paused behind maintenance mode, with a
snapshot to roll back to.

## Rules (never break these)

- Environments are `local`, `staging`, `production` — never `-e ic` (icp-cli's
  implicit `ic` environment would create brand-new canisters; the Makefile
  refuses it).
- Deploy only through the Makefile targets. They pass the deploy identity from
  `.icp-identity` and never `-y` on mainnet (`-y` makes icp-cli SKIP its Candid
  compatibility check); production also gets `--no-create` and `-m upgrade`.
- Never `MODE=reinstall` on a mainnet canister — it wipes state.
- Every mainnet-changing step needs the user's go-ahead; the staging sign-off is
  an explicit question (`AskUserQuestion`), never assumed.
- The same commit, built on the same machine, goes to staging and production;
  production's module hashes must equal staging's (the builds are deterministic).

## 1. Preflight

1. Clean, current `main`:
   ```bash
   git checkout main && git pull
   make git-on-origin-main git-no-unstaged-files git-no-staged-files
   ```
2. Tooling: `icp`, `mops`, `ic-wasm`, `didc`, `jq`; the llama wasm unzipped in
   `llms/llama_cpp_canister/build/` with the sha256 pinned in `icp.yaml`;
   `.icp-identity` names the deploy identity (`make icp-status ENV=production`
   fails loudly otherwise).
3. Version: bump `package.json` `"version"` to X.Y.Z (semver; a breaking change
   for users or state = major). That commit goes straight to `main` with the
   message `X.Y.Z` (ask the user to push it).
4. What changes — build, then compare against both environments:
   ```bash
   icp build
   make release-record ENV=staging
   make release-record ENV=production
   git log --oneline v<previous>..HEAD        # the release notes
   ```
   The LOCAL BUILD column says `same` for canisters this release does not change.
   The frontend asset canister's wasm rarely changes, but its ASSETS do whenever
   `src/frontend/` changed — then it is deployed too.
5. Cycles: every canister in both environments ≥ 5T (the CYCLES column), and the
   deploy identity has enough for top-ups (`make icp-cycles-balance ENV=production`).
   Top up with `make icp-topup CANISTER_NAME=<c> AMOUNT=<n> ENV=<env>`.
6. Upgrade safety of icgpt_admin against what each environment really runs:
   ```bash
   make release-stable-check ENV=staging
   make release-stable-check ENV=production
   ```
   Both must print `compatible` for the Motoko stable state AND the Candid
   interface. If not: STOP — the change needs a migration (see `icgpt-new-feature`).

## 2. Deploy to staging

Order: backend first, frontend last (the new backend serves the old frontend).

```bash
make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=staging      # if changed
make icp-upgrade-llm CANISTER_NAME=<llm> ENV=staging                # only if the llama wasm changed
make icp-provision-llm CANISTER_NAME=<llm> ENV=staging              # after EVERY llm install/upgrade
make icp-deploy-frontend ENV=staging                                # if src/frontend changed
make release-record ENV=staging                                     # deployed == built ("same")
```

## 3. Staging gate

1. Smoketests (`icgpt-testing` is a whitelisted staging dev account):
   ```bash
   pytest -vv --network staging --identity icgpt-testing test/test_maintenance.py test/test_staging_gate.py
   make smoketest-token-counts ENV=staging TEST_IDENTITY=icgpt-testing
   ```
2. Anonymous browser pass (headless Chrome + chrome-devtools MCP) on the staging
   URL `https://<staging canister_frontend id>.icp0.io`: red STAGING header on
   every page, `[STAGING]` tab titles, docs pages, login page, no console errors,
   and `/.well-known/ic-domains` NOT served.
3. The user signs in on staging with Internet Identity (dev-accounts-only, so
   their staging principal must be whitelisted/admin) and exercises the release:
   Lab run, chat on each model, Admin panel.
4. Ask the user explicitly (`AskUserQuestion`): "Staging passed — release X.Y.Z
   to production?" Stop unless the answer is yes.

## 4. Release to production

```bash
make release-stable-check ENV=production              # re-run: must still be compatible
make release-record ENV=production                    # the pre-release record
make maintenance-on ENV=production MSG="ICGPT is being upgraded to X.Y.Z - back in a few minutes"
make release-snapshot CANISTER_NAME=icgpt_admin ENV=production   # stops it + snapshots; note the id
make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=production
make icp-start CANISTER_NAME=icgpt_admin ENV=production
```

- While icgpt_admin is stopped, the frontend shows its "Connection interrupted"
  screen; once started, non-admins see the maintenance screen.
- LLM canisters, only if the llama wasm changed (their snapshots are large — confirm
  the cycles cost with the user first): per canister `make release-snapshot`,
  `make icp-upgrade-llm`, `make icp-start`, `make icp-provision-llm`. Never
  `icp-deploy-canister` for an LLM: `icp deploy` syncs icp.yaml's controllers and would
  drop the extra ones production carries (the dfx wallet on 4osxs + 44ual, cda4n on 6uwoh).
  The upgrade keeps the uploaded gguf; a snapshot is about the canister's memory size
  (1.4-3.9 GiB) and costs storage cycles until it is deleted.
- Frontend (if changed): `make icp-deploy-frontend ENV=production`. Its rollback
  is redeploying the previous tag's frontend, so it needs no snapshot.

Verify, still paused:

```bash
make release-record ENV=production     # every upgraded module hash == staging's
make smoketest-token-counts ENV=production TEST_IDENTITY=icpp-llm   # admin: not paused
```

A hash that differs from staging means production did not get what staging
tested: roll back (step 5). Then the user checks icgpt.onicai.com in their
browser as an admin (the orange MAINTENANCE ON banner shows; chat + Lab work).
Only then:

```bash
make maintenance-off ENV=production
```

## 5. Rollback

```bash
make maintenance-on ENV=production MSG="..."          # if icgpt_admin still answers
make release-rollback CANISTER_NAME=icgpt_admin SNAPSHOT=<id> ENV=production
make icp-deploy-frontend ENV=production               # from a checkout of the previous tag, if the frontend changed
make release-record ENV=production                    # back to the pre-release hashes
make maintenance-off ENV=production
```

A restored LLM canister needs `make icp-provision-llm` again. Tell the user what
failed before retrying anything.

## 6. Finish

- Tag the released commit and push the tag (ask first):
  `git tag vX.Y.Z && git push origin vX.Y.Z`.
- Keep the snapshot: the next `release-snapshot` replaces it.
- Report to the user: the version, what was deployed where, before/after module
  hashes (the TMP-release records), snapshot ids, and cycles balances.

## First release (introduces maintenance mode)

Production's current icgpt_admin has no `setMaintenance`, so it cannot be paused
for this one release: skip `maintenance-on`/`maintenance-off`, and rely on the
snapshot + rollback path (the change is additive and passed
`release-stable-check`). Expect icgpt_admin's hash to differ from the old
production build: production was built by an older toolchain, and this build makes
its Candid interface public (`mops.toml` args).

## One-time: create the staging environment

Outward-facing and costs cycles — confirm each step with the user.

1. Fund the deploy identity's cycles-ledger balance (canister creation and
   top-ups draw from it; `make icp-cycles-balance ENV=staging`). From the dfx
   cycles wallet of the same principal, e.g. 150T:
   ```bash
   dfx canister call um5iw-rqaaa-aaaaq-qaaba-cai deposit '(record { to = record { owner = principal "<deploy principal>"; subaccount = null }; memo = null })' --with-cycles 150000000000000 --wallet <dfx wallet id> --network ic --identity <deploy identity>
   ```
2. Create + install on production's subnet (mixed subnets add cross-subnet
   latency between icgpt_admin and the LLMs):
   ```bash
   ICGPT_ENV=staging NODE_ENV=production npm run build     # staging frontend first: no ic-domains
   make icp-deploy ENV=staging MODE=auto SUBNET=lspz2-jx4pu-k3e7p-znm7j-q4yum-ork6e-6w4q6-pijwq-znehu-4jabe-kqe
   git add .icp/data/mappings/staging.ids.json      # commit it (via a PR)
   ```
   (`make icp-deploy` deploys every canister, the frontend included, and syncs
   whatever `dist/frontend` holds — hence the staging build first.)
3. Upload + provision all five models, register them:
   ```bash
   make upload-llm CANISTER_NAME=<llm> ENV=staging <MODEL>_GGUF=<path>    # each of the 5
   make icp-provision-llms ENV=staging
   make icp-register-llms ENV=staging
   ```
   The ggufs are in `~/github/repos/llama_cpp_canister/models/`; Qwen3-1.7B
   (`Qwen3-1.7B-Q4_K_M.gguf`) comes from huggingface.co/unsloth/Qwen3-1.7B-GGUF.
4. Access: open the staging URL, sign in with Internet Identity, copy your
   principal from the "Staging — dev accounts only" screen (II principals are
   per-origin), then make it an admin and whitelist the dev accounts (including
   `icgpt-testing` for the smoketests) by adding them to `STAGING_DEV_PRINCIPALS`
   in the Makefile:
   ```bash
   make icp-call ENV=staging CANISTER_NAME=icgpt_admin CANISTER_METHOD=addAdmin CANISTER_ARGUMENT='(principal "<your staging principal>", "<name>")'
   make staging-whitelist-devs ENV=staging
   ```
5. Top up every staging canister to ≥ 5T, then run the staging gate (step 3).
