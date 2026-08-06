SHELL := /bin/bash

# Disable built-in rules and variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-builtin-variables

# icp-cli is the deploy/test tool (dfx is fully retired). Identity is selected
# per-command with `--identity <name>` where needed. IDENTITY is a pinned,
# overridable default (NOT the machine-wide active identity) so `make` never
# silently inherits whatever another terminal/agent/project last set as default.
IDENTITY ?= icgpt-deploy

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

# Live end-to-end smoketest of the LLM-as-judge against the real DFINITY LLM canister
# on mainnet (Qwen3-32B, free). Asserts it discriminates a good hint from a leak.
.PHONY: smoketest-judge-live
smoketest-judge-live:
	@bash scripts/smoketest_judge_live.sh

# Live smoketest of exact token accounting (llama_cpp >= v0.15.0) through icgpt_admin:
# proves the 5 opt-nat64 counts decode + reconcile and shows the warm cache-break reuse.
# Requires a local icgpt_admin with a registered, LOADED model (default: gemma).
# make smoketest-token-counts [ENV=local] [MODEL_GGUF=gemma-3-270m-it-Q8_0.gguf]
.PHONY: smoketest-token-counts
smoketest-token-counts:
	@bash scripts/smoketest_token_counts.sh $(ENV) $(MODEL_GGUF)

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
icp-cycles-balance:          # cycles balance of the active identity (make icp-cycles-balance ENV=production)
	@icp cycles balance -e $(ENV)

# Top up a canister's cycles from the active identity's balance.
# make icp-topup CANISTER_NAME=llama_cpp_qwen3_06b_q8 AMOUNT=20000000000000 ENV=local
.PHONY: icp-topup
icp-topup:
	@icp canister top-up $(CANISTER_NAME) --amount $(AMOUNT) -e $(ENV)

###########################################################################
# icp-cli targets (icp.yaml) — the deploy/test path. dfx is fully retired.
#
# ENV selects the icp environment:
#   local      -> the project-local managed replica (`make icp-network-start`;
#                 ephemeral gateway port, read back from `icp network status`).
#   production -> IC mainnet.
# MODE is the install mode for deploys: auto | install | reinstall | upgrade.
#
# Existing canister IDs are recorded in the icp ID store with `icp canister link`
# (see icp-link). `icp canister call` does not prompt on update calls.
ENV ?= local
MODE ?= upgrade
QUERY ?=

.PHONY: icp-project
icp-project:                 # show the effective icp.yaml config + environments
	@icp project show
	@echo "--- environments ---"
	@icp environment list

.PHONY: icp-status
icp-status:                  # make icp-status CANISTER_NAME=icgpt_admin ENV=production
	@icp canister status $(CANISTER_NAME) -e $(ENV)

.PHONY: icp-call
icp-call:                    # make icp-call CANISTER_NAME=.. CANISTER_METHOD=.. CANISTER_ARGUMENT='(..)' [QUERY=--query] ENV=..
	@icp canister call $(CANISTER_NAME) $(CANISTER_METHOD) '$(CANISTER_ARGUMENT)' -e $(ENV) $(QUERY)

.PHONY: icp-deploy
icp-deploy:                  # deploy ALL canisters to ENV (respects MODE)
	@icp deploy -e $(ENV) -m $(MODE) -y

.PHONY: icp-deploy-canister
icp-deploy-canister:         # make icp-deploy-canister CANISTER_NAME=icgpt_admin ENV=.. MODE=..
	@icp deploy $(CANISTER_NAME) -e $(ENV) -m $(MODE) -y

# Grant the LOCAL-DEV dev sign-in principal early-access on the LOCAL replica, so the one-click
# "⚙ Dev sign-in" (webpack serve) lands INSIDE the gated app. The principal is derived from the
# fixed seed in src/frontend/src/routes/devSignIn.js. It is deliberately NOT a Bootstrap.mo admin
# (that seed is public in source; bootstrap principals are permanent admins) — this target grants
# it via the admin `addToWhitelist` and is HARD-BLOCKED from ever touching production.
# make icp-whitelist-dev [ENV=local]
DEV_PRINCIPAL ?= u4erc-wu23y-oo5dh-sorei-yyceo-kzk6w-ejh2f-jzrbr-immca-i3vsa-pae
DEV_WHITELIST_IDENTITY ?= icpp-llm
.PHONY: icp-whitelist-dev
icp-whitelist-dev:
	@if [ "$(ENV)" = "production" ]; then \
		echo "REFUSING: icp-whitelist-dev is LOCAL-ONLY (the dev seed is public in source)."; exit 1; fi
	@echo "Whitelisting dev principal $(DEV_PRINCIPAL) on ENV=$(ENV) ..."
	@icp canister call icgpt_admin addToWhitelist \
		'(principal "$(DEV_PRINCIPAL)", "", "local dev sign-in")' \
		-e $(ENV) --identity $(DEV_WHITELIST_IDENTITY)

# Build the frontend for ENV and deploy the assets canister (asset-canister recipe).
# Canister IDs + replica root key are resolved at RUNTIME from the `ic_env` cookie
# (the asset canister serves it in production; the webpack dev server serves it
# locally), so the build needs no canister-id injection and there is no .env.
# NODE_ENV=production flips webpack to a minified production build for mainnet.
.PHONY: icp-deploy-frontend
icp-deploy-frontend:
	@if [ "$(ENV)" = "production" ]; then NODE_ENV=production npm run build; else npm run build:dev; fi
	@icp deploy canister_frontend -e $(ENV) -y

# Link an already-deployed canister ID into the icp store (idempotent create the dir first).
# make icp-link CANISTER_NAME=icgpt_admin PRINCIPAL=4jtrg-... ENV=production
.PHONY: icp-link
icp-link:
	@mkdir -p .icp/data/mappings
	@[ -f .icp/data/mappings/$(ENV).ids.json ] || echo '{}' > .icp/data/mappings/$(ENV).ids.json
	@icp canister link $(CANISTER_NAME) $(PRINCIPAL) -e $(ENV) --force

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


###########################################################################
# Model upload (icp-native uploader, vendored with llama_cpp_canister v0.14.0)
# (-) The parent of this folder is added to Python path, for `python -m` to work
# (-) The uploader is icp-native: it resolves the canister id from
#     .icp/data/mappings/<env>.ids.json and the replica url from `icp network status`,
#     and exports the active identity's PEM via `icp identity export`. So the LOCAL
#     network must be running (make icp-network-start) and the right identity active
#     (e.g. --identity icpp-llm for production).
#     NOTE: --network here is the icp.yaml ENVIRONMENT name (local | production).

# The sha256 of qwen2.5-0.5b-instruct-q8_0.gguf, as published on HuggingFace.
# The upload script verifies the file on disk against it before uploading.
QWEN25_05B_Q8_SHA256 ?= ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e

# NOTE: pass an ABSOLUTE path for the model.
#       The upload script resolves a relative path against its own repo root
#       (llms/llama_cpp_canister), not against our working directory.
QWEN25_05B_Q8_GGUF ?= $(CURDIR)/llms/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/qwen2.5-0.5b-instruct-q8_0.gguf

.PHONY: upload-llama-cpp-qwen25-05b-q8-local
upload-llama-cpp-qwen25-05b-q8-local:
	@echo "---"
	@echo "upload-llama-cpp-qwen25-05b-q8-local"
	python -m llms.llama_cpp_canister.scripts.upload --network local --canister llama_cpp_qwen25_05b_q8 --canister-filename model.gguf --filetype gguf --hf-sha256 "$(QWEN25_05B_Q8_SHA256)" $(QWEN25_05B_Q8_GGUF)

.PHONY: upload-llama-cpp-qwen25-05b-q8-ic
upload-llama-cpp-qwen25-05b-q8-ic:
	@echo "---"
	@echo "upload-llama-cpp-qwen25-05b-q8-ic"
	python -m llms.llama_cpp_canister.scripts.upload --network production --canister llama_cpp_qwen25_05b_q8 --canister-filename model.gguf --filetype gguf --hf-sha256 "$(QWEN25_05B_Q8_SHA256)" $(QWEN25_05B_Q8_GGUF)
	
.PHONY: download-log-llama-cpp-qwen25-05b-q8-ic
download-log-llama-cpp-qwen25-05b-q8-ic:
	@echo "---"
	@echo "download-log-llama-cpp-qwen25-05b-q8-ic"
	python -m llms.llama_cpp_canister.scripts.download --network production --canister llama_cpp_qwen25_05b_q8 --local-filename main-llama-cpp-qwen25-05b-q8.log main.log

# The sha256 of Qwen3-0.6B-Q8_0.gguf, as published on HuggingFace.
QWEN3_06B_Q8_SHA256 ?= 9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031

# NOTE: pass an ABSOLUTE path for the model (resolved by the upload script against
#       its own repo root, not our working directory).
QWEN3_06B_Q8_GGUF ?= $(CURDIR)/llms/models/Qwen/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q8_0.gguf

.PHONY: upload-llama-cpp-qwen3-06b-q8-local
upload-llama-cpp-qwen3-06b-q8-local:
	@echo "---"
	@echo "upload-llama-cpp-qwen3-06b-q8-local"
	python -m llms.llama_cpp_canister.scripts.upload --network local --canister llama_cpp_qwen3_06b_q8 --canister-filename model.gguf --filetype gguf --hf-sha256 "$(QWEN3_06B_Q8_SHA256)" $(QWEN3_06B_Q8_GGUF)

.PHONY: upload-llama-cpp-qwen3-06b-q8-ic
upload-llama-cpp-qwen3-06b-q8-ic:
	@echo "---"
	@echo "upload-llama-cpp-qwen3-06b-q8-ic"
	python -m llms.llama_cpp_canister.scripts.upload --network production --canister llama_cpp_qwen3_06b_q8 --canister-filename model.gguf --filetype gguf --hf-sha256 "$(QWEN3_06B_Q8_SHA256)" $(QWEN3_06B_Q8_GGUF)

.PHONY: download-log-llama-cpp-qwen3-06b-q8-ic
download-log-llama-cpp-qwen3-06b-q8-ic:
	@echo "---"
	@echo "download-log-llama-cpp-qwen3-06b-q8-ic"
	python -m llms.llama_cpp_canister.scripts.download --network production --canister llama_cpp_qwen3_06b_q8 --local-filename main-llama-cpp-qwen3-06b-q8.log main.log

# The sha256 of Qwen3-1.7B-Q4_K_M.gguf, as published on HuggingFace (unsloth).
QWEN3_17B_Q4_SHA256 ?= b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897

# NOTE: pass an ABSOLUTE path for the model (resolved by the upload script against
#       its own repo root, not our working directory).
QWEN3_17B_Q4_GGUF ?= $(CURDIR)/llms/models/unsloth/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q4_K_M.gguf

# NOTE: the 1.7B is uploaded as "models/model.gguf" (per README-qwen3-1.7B.md),
#       unlike the smaller models which use "model.gguf". load_model must match.
.PHONY: upload-llama-cpp-qwen3-17b-q4-local
upload-llama-cpp-qwen3-17b-q4-local:
	@echo "---"
	@echo "upload-llama-cpp-qwen3-17b-q4-local"
	python -m llms.llama_cpp_canister.scripts.upload --network local --canister llama_cpp_qwen3_17b_q4 --canister-filename models/model.gguf --filetype gguf --hf-sha256 "$(QWEN3_17B_Q4_SHA256)" $(QWEN3_17B_Q4_GGUF)

.PHONY: upload-llama-cpp-qwen3-17b-q4-ic
upload-llama-cpp-qwen3-17b-q4-ic:
	@echo "---"
	@echo "upload-llama-cpp-qwen3-17b-q4-ic"
	python -m llms.llama_cpp_canister.scripts.upload --network production --canister llama_cpp_qwen3_17b_q4 --canister-filename models/model.gguf --filetype gguf --hf-sha256 "$(QWEN3_17B_Q4_SHA256)" $(QWEN3_17B_Q4_GGUF)

.PHONY: download-log-llama-cpp-qwen3-17b-q4-ic
download-log-llama-cpp-qwen3-17b-q4-ic:
	@echo "---"
	@echo "download-log-llama-cpp-qwen3-17b-q4-ic"
	python -m llms.llama_cpp_canister.scripts.download --network production --canister llama_cpp_qwen3_17b_q4 --local-filename main-llama-cpp-qwen3-17b-q4.log main.log

# The sha256 of gemma-3-270m-it-Q8_0.gguf, as published on HuggingFace (unsloth).
GEMMA3_270M_SHA256 ?= d156a5159f2f79c1b1d53c7c1cc20f1ff28ab8d00f17a292620aad13399b9698

# NOTE: pass an ABSOLUTE path for the model (resolved by the upload script against
#       its own repo root, not our working directory).
GEMMA3_270M_GGUF ?= $(CURDIR)/llms/models/unsloth/gemma-3-270m-it-GGUF/gemma-3-270m-it-Q8_0.gguf

# NOTE: gemma is uploaded as "models/model.gguf" (like the 1.7B). load_model must match.
.PHONY: upload-llama-cpp-gemma3-270m-local
upload-llama-cpp-gemma3-270m-local:
	@echo "---"
	@echo "upload-llama-cpp-gemma3-270m-local"
	python -m llms.llama_cpp_canister.scripts.upload --network local --canister llama_cpp_gemma3_270m --canister-filename models/model.gguf --filetype gguf --hf-sha256 "$(GEMMA3_270M_SHA256)" $(GEMMA3_270M_GGUF)

.PHONY: upload-llama-cpp-gemma3-270m-ic
upload-llama-cpp-gemma3-270m-ic:
	@echo "---"
	@echo "upload-llama-cpp-gemma3-270m-ic"
	python -m llms.llama_cpp_canister.scripts.upload --network production --canister llama_cpp_gemma3_270m --canister-filename models/model.gguf --filetype gguf --hf-sha256 "$(GEMMA3_270M_SHA256)" $(GEMMA3_270M_GGUF)

.PHONY: download-log-llama-cpp-gemma3-270m-ic
download-log-llama-cpp-gemma3-270m-ic:
	@echo "---"
	@echo "download-log-llama-cpp-gemma3-270m-ic"
	python -m llms.llama_cpp_canister.scripts.download --network production --canister llama_cpp_gemma3_270m --local-filename main-llama-cpp-gemma3-270m.log main.log
