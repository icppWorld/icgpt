---
name: icgpt-new-feature
description: The per-feature loop for icgpt — plan with an upgrade-compatibility assessment, implement on a feature branch, verify on a local replica (static checks, Motoko tests, pytest smoketests, browser E2E), commit, open the PR, resolve CodeRabbit, and wait for manual approval
disable-model-invocation: false
user-invocable: true
---

# New feature development for icgpt

icgpt.onicai.com has real users. Every change goes feature branch → PR → manual
approval → `main` → release (`icgpt-release`: staging, then prod). Nothing is
deployed to mainnet from this skill.

## 1. Plan

The plan MUST contain an **upgrade-compatibility assessment**. The default is
additive: the next release upgrades the live canisters in place, state intact.

- **icgpt_admin stable state** (`src/backend/main.mo` is a `persistent actor`:
  every non-`transient` `let`/`var` is stable). Adding a `var` with an initial
  value is fine. Removing, renaming or narrowing a stable field needs an explicit
  migration plus the user's sign-off — load the `migrating-motoko-actors` skill.
  Constants belong in `transient let` (a stable `let` keeps its install-time value
  forever).
- **Candid interface**: additive only (new methods, new record fields on
  returns). An old frontend must keep working against the new backend, because
  the release deploys the backend first.
- **LLM canisters**: a new llama_cpp_canister wasm, settings or model means a
  re-provision (`make icp-provision-llm`) — and a re-upload after a reinstall.
- **Access control**: identity and entitlements come from session state only
  (`caller`, controller status, the `ICGPT_ENV` canister environment variable) —
  never from arguments or anything the user can write. A gate is checked where the
  action happens (inside the canister method).
- **Environments**: will it behave correctly on `local`, `staging` (dev accounts
  only, red header) and `production`?
- **User-facing impact**: does it need a maintenance window at release?

Name the branch: `feature/<short-kebab-slug>`.

## 2. Branch

`git checkout -b feature/<slug>` from an up-to-date `main` — never work on `main`.

## 3. Implement

- Backend: `src/backend/` (Motoko; mops deps in `mops.toml`, moc pinned there).
  Load `writing-motoko` for language rules.
- After ANY change to the icgpt_admin interface, regenerate the frontend binding
  (byte-identical to `didc` output + prettier):
  ```bash
  mops build icgpt_admin
  cp .mops/.build/icgpt_admin.did src/frontend/src/canisters/idl/icgpt_admin.did
  didc bind -t js src/frontend/src/canisters/idl/icgpt_admin.did | npx prettier --stdin-filepath x.js > src/frontend/src/canisters/idl/icgpt_admin.idl.js
  ```
- Frontend: `src/frontend/src/` (React 19, react-router 8). Elements pinned to the
  top of the viewport offset themselves by `var(--env-bar-h, 0px)` (the
  staging/local environment bar).
- Deploy/ops changes go in the Makefile (the single source of truth for LLM
  settings is its `LLM_*` table) and `icp.yaml`.

## 4. Test on a local replica

Static + unit:

```bash
make all-static          # prettier + eslint + python format/lint
make test-backend        # mops test (Motoko unit tests)
make release-stable-check ENV=local   # stable + Candid compatibility vs what local runs
```

Local deploy (toolchain: `icp`, `mops`, `ic-wasm`, `didc`; python deps from
`requirements-dev.txt` in the active conda env; the release wasm unzipped into
`llms/llama_cpp_canister/build/`, see `llms/llama_cpp_canister/README-instructions.md`):

```bash
make icp-network-start
make icp-deploy ENV=local MODE=auto       # first time; afterwards MODE=upgrade
make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=local   # backend-only iteration
make upload-llm CANISTER_NAME=llama_cpp_gemma3_270m ENV=local GEMMA3_270M_GGUF=<path>
make icp-provision-llm CANISTER_NAME=llama_cpp_gemma3_270m ENV=local
make icp-register-llms ENV=local
make icp-whitelist-dev ENV=local
```

The ggufs live in `~/github/repos/llama_cpp_canister/models/` (point the
`*_GGUF` make variables at them). Upload more models only when the feature needs
them. A local upload can run out of cycles (IC0207): `make icp-topup
CANISTER_NAME=<c> AMOUNT=100000000000000 ENV=local` — local cycles are free.

Smoketests (the test identity `icgpt-testing` must be whitelisted on local):

```bash
pytest -vv --network local --identity icgpt-testing test/test_maintenance.py test/test_staging_gate.py
make smoketest-token-counts ENV=local     # needs a loaded model (gemma by default)
```

Browser E2E — run the real dev frontend and drive it:

```bash
npm run start:local      # http://localhost:8081, grey LOCAL bar, "⚙ Dev sign-in" button
```

Use the chrome-devtools MCP against a headless Chrome you start yourself
(`--headless=new --remote-debugging-port=9222 --user-data-dir=<scratchpad dir>`):
sign in with Dev sign-in, then exercise every area the feature touches (Lab run,
chat per model, Admin panel, docs pages, lock/maintenance screens), check the
tab titles and that the console shows no errors or warnings. To exercise
staging-only behaviour locally, set the variable and upgrade WITHOUT `icp deploy`
(deploy re-applies `ICGPT_ENV=local` from icp.yaml):

```bash
icp canister settings update icgpt_admin --add-environment-variable ICGPT_ENV=staging -e local --identity icpp-llm
icp canister install icgpt_admin -m upgrade --wasm .icp/cache/artifacts/icgpt_admin -e local --identity icpp-llm -y
```

Restore with `make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=local`.

## 5. Commit

Commit on `feature/<slug>`: single-line message, no trailers, never
`--no-verify` (the pre-commit hook runs `make all-static`). Push only when the
user asks.

## 6. PR

- `gh pr create` from `feature/<slug>` into `main`, describing the change and the
  compatibility assessment from step 1.
- Then run the `icgpt-coderabbit` skill: evaluate and resolve every CodeRabbit
  finding before the maintainer reviews.
- Every PR needs a MANUAL approval from the maintainer before merging. Never
  merge a PR yourself — ask the user and wait.
- After the merge, the change reaches users only through `icgpt-release`.
