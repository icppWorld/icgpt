SHELL := /bin/bash

# Disable built-in rules and variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-builtin-variables

# icp-cli is the deploy/test tool (dfx is fully retired). Every icp command that needs an
# identity gets `--identity $(DEPLOY_IDENTITY)` explicitly - never the machine-wide active
# identity (usually `anonymous`, which cannot deploy). The deploy identity is the first
# non-comment line of the git-ignored .icp-identity file, used for every environment.
DEPLOY_IDENTITY := $(shell awk 'NF && substr($$1,1,1) != "\#" {print $$1; exit}' .icp-identity 2>/dev/null)
ICP_ID = --identity $(DEPLOY_IDENTITY)

# ENV selects the icp environment (icp.yaml):
#   local      -> the project-local managed replica (`make icp-network-start`)
#   staging    -> IC mainnet, the staging canisters (dev accounts only)
#   production -> IC mainnet, the live app (icgpt.onicai.com)
# Never `ic`: icp-cli's implicit `ic` environment has its own empty ID store and would create
# brand-new canisters, so anything but the three above is rejected.
ENV ?= local
VALID_ENVS := local staging production
ifeq ($(filter $(ENV),$(VALID_ENVS)),)
  $(error ENV='$(ENV)' is not one of: $(VALID_ENVS))
endif

# Deploy flags per environment. Mainnet deploys never pass -y: with -y icp-cli SKIPS its Candid
# compatibility check on upgrades. Production never creates canisters (--no-create).
ifeq ($(ENV),local)
  DEPLOY_FLAGS := -y
else ifeq ($(ENV),staging)
  DEPLOY_FLAGS :=
else
  DEPLOY_FLAGS := --no-create
endif

###########################################################################
# Some constants
CANISTER_CANDID_UI_IC ?= "a4gq6-oaaaa-aaaab-qaa4q-cai"

###########################################################################
.PHONY: all-static
all-static: \
	python-format python-lint \
	javascript-format javascript-lint
	
.PHONY: all-static-check
all-static-check: \
	python-format-check python-lint-check python-type-check \
	javascript-format-check javascript-lint-check

# Backend (Motoko) unit tests: the pure LLM-as-judge logic (Judge.mo) + any others.
.PHONY: test-backend
test-backend:
	@mops test

# Live smoketests run on the icpp-pro pytest harness (test/*.py). They need an icp
# identity (icpp-pro never uses the machine-wide active one). TEST_IDENTITY is a
# throwaway; create it once with: icp identity new icgpt-testing --storage plaintext
TEST_IDENTITY ?= icgpt-testing
MODEL_GGUF ?= gemma-3-270m-it-Q8_0.gguf

# Live end-to-end smoketest of the LLM-as-judge against the real DFINITY LLM canister
# on mainnet (Qwen3-32B, free). Asserts it discriminates a good hint from a leak.
.PHONY: smoketest-judge-live
smoketest-judge-live:
	@pytest -vv --network ic --identity $(TEST_IDENTITY) test/test_judge_live.py

# Live smoketest of exact token accounting (llama_cpp >= v0.15.0) through icgpt_admin:
# proves the 5 opt-nat64 counts decode + reconcile and shows the warm cache-break reuse.
# Requires an icgpt_admin (ENV) with a registered, LOADED model (default: gemma).
#   make smoketest-token-counts [ENV=local] [MODEL_GGUF=..] [TEST_IDENTITY=..]
# Against mainnet, run as an admin: make smoketest-token-counts ENV=production TEST_IDENTITY=icpp-llm
.PHONY: smoketest-token-counts
smoketest-token-counts:
	@ICGPT_TEST_MODEL_GGUF=$(MODEL_GGUF) pytest -vv --network $(ENV) --identity $(TEST_IDENTITY) test/test_token_counts.py

git-no-unstaged-files:
	@if [[ $$(git diff --name-only) ]]; then \
		echo " "; \
		echo "Unstaged Files ($$(git diff --name-only | wc -w)):"; \
		git diff --name-only | awk '{print "- " $$1}'; \
		echo " "; \
		echo "There are unstaged files in your working directory."; \
		echo "Please only deploy to ic from a freshly pulled main branch."; \
		echo " "; \
		exit 1; \
	else \
		echo "Ok, you have no unstaged files in your working directory." ;\
	fi

git-no-staged-files:
	@if [[ $$(git diff --cached --name-only) ]]; then \
		echo " "; \
		echo "Staged Files ($$(git diff --cached --name-only | wc -w)):"; \
		git diff --cached --name-only | awk '{print "- " $$1}'; \
		echo " "; \
		echo "There are staged files in your working directory."; \
		echo "Please only deploy to ic from a freshly pulled main branch."; \
		echo " "; \
		exit 1; \
	else \
		echo "Ok, you have no staged files in your working directory." ;\
	fi

git-on-origin-main:
	@if [[ $$(git log origin/main..HEAD --first-parent --oneline | awk '{print $$1}' | wc -w) > 0 ]]; then \
		echo " "; \
		echo "Your working directory is not at origin/main:"; \
		git log origin/main..HEAD --first-parent --oneline --boundary; \
		echo " "; \
		echo "Please only deploy to ic from a freshly pulled main branch."; \
		echo " "; \
		exit 1; \
	else \
		echo "Ok, your working directory is at orgin/main" ;\
	fi

###########################################################################
# Local managed network lifecycle (icp.yaml `local` network, ephemeral port).
# The gateway port is random on every start (icp.yaml gateway.port: 0) — always
# read it back from `icp network status`, never hardcode it.
.PHONY: icp-network-start
icp-network-start:
	@icp network start -d
	@make --no-print-directory icp-network-status

.PHONY: icp-network-stop
icp-network-stop:
	@icp network stop || true   # `icp network stop` exits non-zero when nothing runs

# There is no `--clean` flag. A managed network keeps its replica state AND the
# local canister-id mappings under .icp/cache. This wipes ONLY that disposable
# cache (never .icp/data, which holds the live mainnet ids) and restarts fresh.
.PHONY: icp-network-clean
icp-network-clean:
	@icp network stop || true
	@rm -rf .icp/cache
	@icp network start -d
	@make --no-print-directory icp-network-status

.PHONY: icp-network-status
icp-network-status:          # gateway_url / api_url of the running local network
	@icp network status -e local --json

.PHONY: icp-identity
icp-identity:                # active identity, its principal and ICP account-id
	@echo -n "identity  : " && icp identity default
	@echo -n "principal : " && icp identity principal
	@echo -n "account   : " && icp identity account-id

.PHONY: icp-cycles-balance
icp-cycles-balance: require-identity # cycles balance of the deploy identity (make icp-cycles-balance ENV=production)
	@icp cycles balance -e $(ENV) $(ICP_ID)

# Top up a canister's cycles from the deploy identity's cycles-ledger balance.
# make icp-topup CANISTER_NAME=llama_cpp_qwen3_06b_q8 AMOUNT=20000000000000 ENV=local
.PHONY: icp-topup
icp-topup: require-identity
	@icp canister top-up $(CANISTER_NAME) --amount $(AMOUNT) -e $(ENV) $(ICP_ID)

###########################################################################
# icp-cli targets (icp.yaml) — the deploy/test path. dfx is fully retired.
#
# MODE is the install mode for deploys: auto | install | reinstall | upgrade. Keep `upgrade`
# for every release; `auto` only to CREATE + install a new environment (eg. staging, once).
# SUBNET pins the subnet when creating canisters (only applies at creation).
#
# Existing canister IDs are recorded in the icp ID store with `icp canister link`
# (see icp-link). `icp canister call` does not prompt on update calls.
MODE ?= upgrade
QUERY ?=
SUBNET ?=

# Mainnet-touching targets depend on this: fail loudly without a deploy identity.
.PHONY: require-identity
require-identity:
	@[ -n "$(DEPLOY_IDENTITY)" ] || { echo "ERROR: .icp-identity is missing or empty - it must name the IC deploy identity (see .claude/skills/icgpt-release)."; exit 1; }

.PHONY: icp-project
icp-project:                 # show the effective icp.yaml config + environments
	@icp project show
	@echo "--- environments ---"
	@icp environment list

.PHONY: icp-status
icp-status: require-identity # make icp-status [CANISTER_NAME=icgpt_admin] ENV=production (no name = all)
	@icp canister status $(CANISTER_NAME) -e $(ENV) $(ICP_ID)

.PHONY: icp-call
icp-call: require-identity   # make icp-call CANISTER_NAME=.. CANISTER_METHOD=.. CANISTER_ARGUMENT='(..)' [QUERY=--query] ENV=..
	@icp canister call $(CANISTER_NAME) $(CANISTER_METHOD) '$(CANISTER_ARGUMENT)' -e $(ENV) $(QUERY) $(ICP_ID)

.PHONY: icp-deploy
icp-deploy: require-identity # deploy ALL canisters to ENV (respects MODE; frontend: use icp-deploy-frontend)
	@icp deploy -e $(ENV) -m $(MODE) $(DEPLOY_FLAGS) $(if $(SUBNET),--subnet $(SUBNET)) $(ICP_ID)

.PHONY: icp-deploy-canister
icp-deploy-canister: require-identity # make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=.. MODE=..
	@icp deploy $(CANISTER_NAME) -e $(ENV) -m $(MODE) $(DEPLOY_FLAGS) $(ICP_ID)

# Grant the LOCAL-DEV dev sign-in principal early-access on the LOCAL replica, so the one-click
# "⚙ Dev sign-in" (webpack serve) lands INSIDE the gated app. The principal is derived from the
# fixed seed in src/frontend/src/routes/devSignIn.js. It is deliberately NOT a Bootstrap.mo admin
# (that seed is public in source; bootstrap principals are permanent admins) — this target grants
# it via the admin `addToWhitelist` and is HARD-BLOCKED from ever touching mainnet.
# make icp-whitelist-dev [ENV=local]
DEV_PRINCIPAL ?= u4erc-wu23y-oo5dh-sorei-yyceo-kzk6w-ejh2f-jzrbr-immca-i3vsa-pae
.PHONY: icp-whitelist-dev
icp-whitelist-dev: require-identity
	@if [ "$(ENV)" != "local" ]; then \
		echo "REFUSING: icp-whitelist-dev is LOCAL-ONLY (the dev seed is public in source)."; exit 1; fi
	@echo "Whitelisting dev principal $(DEV_PRINCIPAL) on ENV=$(ENV) ..."
	@icp canister call icgpt_admin addToWhitelist \
		'(principal "$(DEV_PRINCIPAL)", "", "local dev sign-in")' -e $(ENV) $(ICP_ID)

# Staging is for dev accounts only (main.mo enforces early access there). These are the team's
# Internet Identity principals ON THE STAGING ORIGIN (II principals are per-origin), granted
# access with `make staging-whitelist-devs`. Space-separated; capture yours from the staging
# lock screen, which shows the caller's principal.
STAGING_DEV_PRINCIPALS ?=
.PHONY: staging-whitelist-devs
staging-whitelist-devs: require-identity
	@if [ "$(ENV)" != "staging" ]; then echo "REFUSING: staging-whitelist-devs is for ENV=staging only."; exit 1; fi
	@[ -n "$(STAGING_DEV_PRINCIPALS)" ] || { echo "STAGING_DEV_PRINCIPALS is empty."; exit 1; }
	@for p in $(STAGING_DEV_PRINCIPALS); do \
		echo "Whitelisting $$p on staging ..."; \
		icp canister call icgpt_admin addToWhitelist "(principal \"$$p\", \"\", \"staging dev account\")" -e staging $(ICP_ID) || exit 1; \
	done

# Build the frontend for ENV and deploy the assets canister (asset-canister recipe).
# Canister IDs + replica root key are resolved at RUNTIME from the `ic_env` cookie
# (the asset canister serves it on mainnet; the webpack dev server serves it
# locally), so the build needs no canister-id injection and there is no .env.
# Mainnet (staging + production) gets the minified production build. ICGPT_ENV tells webpack
# which environment it builds for: only production ships .well-known/ic-domains.
.PHONY: icp-deploy-frontend
icp-deploy-frontend: require-identity
	@if [ "$(ENV)" = "local" ]; then ICGPT_ENV=$(ENV) npm run build:dev; else ICGPT_ENV=$(ENV) NODE_ENV=production npm run build; fi
	@icp deploy canister_frontend -e $(ENV) $(DEPLOY_FLAGS) $(ICP_ID)

# Start a canister stopped by release-snapshot (deploys leave a stopped canister stopped).
# make icp-start CANISTER_NAME=icgpt_admin ENV=production
.PHONY: icp-start
icp-start: require-identity
	@icp canister start $(CANISTER_NAME) -e $(ENV) $(ICP_ID)

# Link an already-deployed canister ID into the icp store (idempotent create the dir first).
# make icp-link CANISTER_NAME=icgpt_admin PRINCIPAL=4jtrg-... ENV=production
.PHONY: icp-link
icp-link:
	@mkdir -p .icp/data/mappings
	@[ -f .icp/data/mappings/$(ENV).ids.json ] || echo '{}' > .icp/data/mappings/$(ENV).ids.json
	@icp canister link $(CANISTER_NAME) $(PRINCIPAL) -e $(ENV) --force

###########################################################################
# Maintenance mode (icgpt_admin): pauses inference + Lab saves for non-admins, who see a
# maintenance screen; admins keep full access to smoke-test. Callable by the deploy identity
# (a controller). make maintenance-on ENV=production [MSG="Back in 10 minutes"]
MSG ?=
.PHONY: maintenance-on
maintenance-on: require-identity
	@icp canister call icgpt_admin setMaintenance '(true, "$(MSG)")' -e $(ENV) $(ICP_ID)
	@icp canister call icgpt_admin getMaintenance '()' --query -e $(ENV) $(ICP_ID)

.PHONY: maintenance-off
maintenance-off: require-identity
	@icp canister call icgpt_admin setMaintenance '(false, "")' -e $(ENV) $(ICP_ID)
	@icp canister call icgpt_admin getMaintenance '()' --query -e $(ENV) $(ICP_ID)

###########################################################################
# Release support (see .claude/skills/icgpt-release).
#
# Record module hashes, status, cycles, settings + Candid of every canister in ENV to
# TMP-release/<env>-<ts>/, and diff the hashes against the previous record. Read-only.
.PHONY: release-record
release-record: require-identity
	@scripts/release-record.sh $(ENV) $(DEPLOY_IDENTITY)

# Upgrade-safety gate for icgpt_admin: the DEPLOYED stable signature + Candid interface of ENV
# vs the working tree (moc --stable-compatible, mops check-candid). Read-only; run it before
# every deploy of icgpt_admin. make release-stable-check ENV=production
.PHONY: release-stable-check
release-stable-check: require-identity
	@scripts/release-stable-check.sh $(ENV) $(DEPLOY_IDENTITY)

# Pre-upgrade backup: stop the canister and snapshot it (replacing its previous snapshot, so
# the per-canister snapshot limit is never hit). The canister STAYS STOPPED: deploy it, then
# `icp canister start`. make release-snapshot CANISTER_NAME=icgpt_admin ENV=production
.PHONY: release-snapshot
release-snapshot: require-identity
	@icp canister stop $(CANISTER_NAME) -e $(ENV) $(ICP_ID)
	@prev=$$(icp canister snapshot list $(CANISTER_NAME) -e $(ENV) $(ICP_ID) --json | jq -r '.snapshots[-1].id // empty'); \
		icp canister snapshot create $(CANISTER_NAME) $${prev:+--replace $$prev} -e $(ENV) $(ICP_ID)
	@icp canister snapshot list $(CANISTER_NAME) -e $(ENV) $(ICP_ID)

# Roll a canister back to a snapshot (module + all memory) and start it again.
# make release-rollback CANISTER_NAME=icgpt_admin SNAPSHOT=<id> ENV=production
.PHONY: release-rollback
release-rollback: require-identity
	@[ -n "$(SNAPSHOT)" ] || { echo "SNAPSHOT=<id> is required (make release-snapshot prints it)"; exit 1; }
	@icp canister stop $(CANISTER_NAME) -e $(ENV) $(ICP_ID)
	@icp canister snapshot restore $(CANISTER_NAME) $(SNAPSHOT) -e $(ENV) $(ICP_ID)
	@icp canister start $(CANISTER_NAME) -e $(ENV) $(ICP_ID)

###########################################################################
# LLM canisters — the SINGLE SOURCE OF TRUTH for each model's gguf, load_model args and
# max_tokens. load_model + set_max_tokens + timers live in main memory, so they MUST be re-run
# after EVERY install/upgrade of an LLM canister (make icp-provision-llm); the gguf itself
# survives an upgrade in stable memory (re-upload only after a reinstall).
LLM_CANISTERS := llama_cpp_gemma3_270m llama_cpp_qwen3_06b_q8 llama_cpp_qwen25_05b_q8 llama_cpp_lfm2_1p2b_q4 llama_cpp_qwen3_17b_q4

# Model key registered in icgpt_admin = the gguf filename (matches frontend MODELS[].gguf).
LLM_KEY_llama_cpp_gemma3_270m   := gemma-3-270m-it-Q8_0.gguf
LLM_KEY_llama_cpp_qwen3_06b_q8  := Qwen3-0.6B-Q8_0.gguf
LLM_KEY_llama_cpp_qwen25_05b_q8 := qwen2.5-0.5b-instruct-q8_0.gguf
LLM_KEY_llama_cpp_lfm2_1p2b_q4  := LFM2.5-1.2B-Instruct-Q4_K_M.gguf
LLM_KEY_llama_cpp_qwen3_17b_q4  := Qwen3-1.7B-Q4_K_M.gguf

# Where the gguf lives inside the canister (load_model --model must match).
LLM_FILE_llama_cpp_gemma3_270m   := models/model.gguf
LLM_FILE_llama_cpp_qwen3_06b_q8  := model.gguf
LLM_FILE_llama_cpp_qwen25_05b_q8 := model.gguf
LLM_FILE_llama_cpp_lfm2_1p2b_q4  := models/model.gguf
LLM_FILE_llama_cpp_qwen3_17b_q4  := models/model.gguf

# load_model args (candid `vec text` body) and max_tokens_update per model.
LLM_ARGS_llama_cpp_gemma3_270m   := "--model"; "models/model.gguf"; "-c"; "4096"; "--cache-type-k"; "q8_0"; "--cache-type-v"; "q8_0"
LLM_ARGS_llama_cpp_qwen3_06b_q8  := "--model"; "model.gguf"; "--cache-type-k"; "q8_0"; "--cache-type-v"; "q8_0"; "--batch-size"; "64"; "--ubatch-size"; "64"; "--ctx-size"; "16384"
LLM_ARGS_llama_cpp_qwen25_05b_q8 := $(LLM_ARGS_llama_cpp_qwen3_06b_q8)
LLM_ARGS_llama_cpp_lfm2_1p2b_q4  := "--model"; "models/model.gguf"; "--cache-type-k"; "q8_0"; "--cache-type-v"; "q8_0"; "--batch-size"; "8"; "--ubatch-size"; "8"; "--ctx-size"; "4096"
LLM_ARGS_llama_cpp_qwen3_17b_q4  := "--model"; "models/model.gguf"; "--cache-type-k"; "q8_0"; "--cache-type-v"; "q8_0"; "--batch-size"; "8"; "--ubatch-size"; "8"; "--ctx-size"; "16384"
LLM_MAXTOK_llama_cpp_gemma3_270m   := 44
LLM_MAXTOK_llama_cpp_qwen3_06b_q8  := 20
LLM_MAXTOK_llama_cpp_qwen25_05b_q8 := 20
LLM_MAXTOK_llama_cpp_lfm2_1p2b_q4  := 8
LLM_MAXTOK_llama_cpp_qwen3_17b_q4  := 4

# The sha256 of each gguf as published on HuggingFace (the uploader verifies it) and the local
# path of the downloaded file (ABSOLUTE: the uploader resolves relative paths against its own
# repo root, llms/llama_cpp_canister). Override a path to upload from elsewhere, eg.
# GEMMA3_270M_GGUF=~/github/repos/llama_cpp_canister/models/google/gemma-3-270m-it-GGUF/gemma-3-270m-it-Q8_0.gguf
GEMMA3_270M_SHA256  ?= d156a5159f2f79c1b1d53c7c1cc20f1ff28ab8d00f17a292620aad13399b9698
QWEN3_06B_Q8_SHA256 ?= 9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031
QWEN25_05B_Q8_SHA256 ?= ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e
LFM2_1P2B_Q4_SHA256 ?= b1b3de114215d9507409a662a501a631095a479a419584e8a2ded6304b19b4f5
QWEN3_17B_Q4_SHA256 ?= b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897
GEMMA3_270M_GGUF  ?= $(CURDIR)/llms/models/unsloth/gemma-3-270m-it-GGUF/gemma-3-270m-it-Q8_0.gguf
QWEN3_06B_Q8_GGUF ?= $(CURDIR)/llms/models/Qwen/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q8_0.gguf
QWEN25_05B_Q8_GGUF ?= $(CURDIR)/llms/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/qwen2.5-0.5b-instruct-q8_0.gguf
LFM2_1P2B_Q4_GGUF ?= $(CURDIR)/llms/models/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/LFM2.5-1.2B-Instruct-Q4_K_M.gguf
QWEN3_17B_Q4_GGUF ?= $(CURDIR)/llms/models/unsloth/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q4_K_M.gguf
LLM_SHA_llama_cpp_gemma3_270m    = $(GEMMA3_270M_SHA256)
LLM_SHA_llama_cpp_qwen3_06b_q8   = $(QWEN3_06B_Q8_SHA256)
LLM_SHA_llama_cpp_qwen25_05b_q8  = $(QWEN25_05B_Q8_SHA256)
LLM_SHA_llama_cpp_lfm2_1p2b_q4   = $(LFM2_1P2B_Q4_SHA256)
LLM_SHA_llama_cpp_qwen3_17b_q4   = $(QWEN3_17B_Q4_SHA256)
LLM_GGUF_llama_cpp_gemma3_270m   = $(GEMMA3_270M_GGUF)
LLM_GGUF_llama_cpp_qwen3_06b_q8  = $(QWEN3_06B_Q8_GGUF)
LLM_GGUF_llama_cpp_qwen25_05b_q8 = $(QWEN25_05B_Q8_GGUF)
LLM_GGUF_llama_cpp_lfm2_1p2b_q4  = $(LFM2_1P2B_Q4_GGUF)
LLM_GGUF_llama_cpp_qwen3_17b_q4  = $(QWEN3_17B_Q4_GGUF)

.PHONY: require-llm
require-llm:
	@[ -n "$(LLM_KEY_$(CANISTER_NAME))" ] || { echo "CANISTER_NAME must be one of: $(LLM_CANISTERS)"; exit 1; }

# Upload a model's gguf to its LLM canister (icp-native uploader, vendored with llama_cpp_canister).
# It resolves the canister id + replica url from icp, and signs as ICPP_PRO_TEST_IDENTITY.
# Runs `python` from the active (icgpt) conda env. make upload-llm CANISTER_NAME=.. ENV=..
.PHONY: upload-llm
upload-llm: require-identity require-llm
	ICPP_PRO_TEST_IDENTITY=$(DEPLOY_IDENTITY) python -m llms.llama_cpp_canister.scripts.upload --network $(ENV) --canister $(CANISTER_NAME) --canister-filename $(LLM_FILE_$(CANISTER_NAME)) --filetype gguf --hf-sha256 "$(LLM_SHA_$(CANISTER_NAME))" $(LLM_GGUF_$(CANISTER_NAME))

# Download an LLM canister's main.log. make download-log-llm CANISTER_NAME=.. ENV=production
.PHONY: download-log-llm
download-log-llm: require-identity require-llm
	ICPP_PRO_TEST_IDENTITY=$(DEPLOY_IDENTITY) python -m llms.llama_cpp_canister.scripts.download --network $(ENV) --canister $(CANISTER_NAME) --local-filename main-$(ENV)-$(CANISTER_NAME).log main.log

# (Re)provision one LLM canister after an install/upgrade: load the model, cap tokens, arm the
# in-memory timers, check readiness, and lock it to controllers only (the hard gate: only
# icgpt_admin, a controller, may call it). make icp-provision-llm CANISTER_NAME=.. ENV=..
.PHONY: icp-provision-llm
icp-provision-llm: require-identity require-llm
	@icp canister call $(CANISTER_NAME) load_model '(record { args = vec { $(LLM_ARGS_$(CANISTER_NAME)) } })' -e $(ENV) $(ICP_ID)
	@icp canister call $(CANISTER_NAME) set_max_tokens '(record { max_tokens_query = 1 : nat64; max_tokens_update = $(LLM_MAXTOK_$(CANISTER_NAME)) : nat64 })' -e $(ENV) $(ICP_ID)
	@icp canister call $(CANISTER_NAME) cache_cleanup_start_timer '()' -e $(ENV) $(ICP_ID)
	@icp canister call $(CANISTER_NAME) cycle_balance_start_timer '()' -e $(ENV) $(ICP_ID)
	@icp canister call $(CANISTER_NAME) set_access '(record { level = 0 : nat16 })' -e $(ENV) $(ICP_ID)
	@icp canister call $(CANISTER_NAME) ready '()' --query -e $(ENV) $(ICP_ID)

# Code-only upgrade of one LLM canister to the vendored wasm. Unlike `icp deploy`, it never
# syncs icp.yaml settings, so controllers added outside icp.yaml (production 4osxs + 44ual
# carry the dfx wallet jh35u, 6uwoh carries cda4n) are kept. icp still runs its Candid
# compatibility check (no -y outside local). Follow it with icp-provision-llm.
# make icp-upgrade-llm CANISTER_NAME=.. ENV=..
.PHONY: icp-upgrade-llm
icp-upgrade-llm: require-identity require-llm
	@icp canister install $(CANISTER_NAME) -m upgrade --wasm llms/llama_cpp_canister/build/llama_cpp.wasm -e $(ENV) $(ICP_ID) $(if $(filter local,$(ENV)),-y) < /dev/null

.PHONY: icp-provision-llms
icp-provision-llms:          # all LLM canisters of ENV
	@for c in $(LLM_CANISTERS); do $(MAKE) --no-print-directory icp-provision-llm CANISTER_NAME=$$c ENV=$(ENV) || exit 1; done

# Register every LLM canister in icgpt_admin (by its gguf model key) and verify the controller
# can reach each. Re-running is harmless ("already registered"). make icp-register-llms ENV=..
.PHONY: icp-register-llms
icp-register-llms: require-identity
	@for c in $(LLM_CANISTERS); do \
		key=$$($(MAKE) --no-print-directory -s print-llm-key CANISTER_NAME=$$c); \
		id=$$(icp canister status $$c -e $(ENV) -i $(ICP_ID)); \
		echo "add_llm_canister $$key -> $$id"; \
		icp canister call icgpt_admin add_llm_canister "(\"$$key\", \"$$id\")" -e $(ENV) $(ICP_ID); \
	done
	@icp canister call icgpt_admin checkAccessToLLMs '()' -e $(ENV) $(ICP_ID)

.PHONY: print-llm-key
print-llm-key:
	@echo $(LLM_KEY_$(CANISTER_NAME))

.PHONY: javascript-format
javascript-format:
	@echo "---"
	@echo "javascript-format"
	npm run format:write

.PHONY: javascript-format-check
javascript-format-check:
	@echo "---"
	@echo "javascript-format-check"
	npm run format:check

.PHONY: javascript-lint
javascript-lint:
	@echo "---"
	@echo "javascript-lint"
	npm run lint:fix

.PHONY: javascript-lint-check
javascript-lint-check:
	@echo "---"
	@echo "javascript-lint-check"
	npm run lint:check

.PHONY: python-clean
python-clean:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f  {} +

PYTHON_DIRS ?= scripts

.PHONY: python-format
python-format:
	@echo "---"
	@echo "python-format"
	python -m black $(PYTHON_DIRS)

.PHONY: python-format-check
python-format-check:
	@echo "---"
	@echo "python-format-check"
	python -m black --check $(PYTHON_DIRS)

.PHONY: python-lint
python-lint:
	@echo "---"
	@echo "python-lint"
	python -m pylint --jobs=0 --rcfile=.pylintrc $(PYTHON_DIRS)

.PHONY: python-lint-check
python-lint-check:
	@echo "---"
	@echo "python-lint-check"
	python -m pylint --jobs=0 --rcfile=.pylintrc $(PYTHON_DIRS)

.PHONY: python-type-check
python-type-check:
	@echo "---"
	@echo "python-type-check"
	python -m mypy --config-file .mypy.ini --show-column-numbers --strict $(PYTHON_DIRS)


###########################################################################
# Toolchain installation
.PHONY: install-all-ubuntu
install-all-ubuntu: install-jp-ubuntu install-icp install-javascript install-python

.PHONY: install-all-mac
install-all-mac: install-jp-mac install-icp install-javascript install-python

# icp-cli is the IC build/deploy tool (dfx is retired). Needs Node.js on PATH.
.PHONY: install-icp
install-icp:
	npm install -g @icp-sdk/icp-cli

.PHONY: install-javascript
install-javascript:
	npm install

.PHONY: install-jp-ubuntu
install-jp-ubuntu:
	sudo apt-get update && sudo apt-get install jp

.PHONY: install-jp-mac
install-jp-mac:
	brew install jp

.PHONY: install-python
install-python:
	pip install --upgrade pip
	pip install -r requirements-dev.txt

# .PHONY:install-rust
# install-rust:
# 	@echo "Installing rust"
# 	curl https://sh.rustup.rs -sSf | sh -s -- -y
# 	@echo "Installing ic-cdk-optimizer"
# 	cargo install ic-cdk-optimizer
