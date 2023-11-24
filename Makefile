SHELL := /bin/bash

# Disable built-in rules and variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-builtin-variables

NETWORK ?= local
DFX_WEBSERVER_PORT ?= $(shell dfx info webserver-port)
IDENTITY ?= $(shell dfx identity whoami)

###########################################################################
# Some constants
CANISTER_INSTALL_MODE ?= install
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

# This installs ~/bin/dfx
# Make sure to source ~/.profile afterwards -> it adds ~/bin to the path if it exists
.PHONY: dfx-install
dfx-install:
	sh -ci "$$(curl -fsSL https://sdk.dfinity.org/install.sh)"

.PHONY: dfx-cycles-to-llama2
dfx-cycles-to-llama2:
	@$(eval CANISTER_LLAMA2_ID := $(shell dfx canister --network ic id llama2))
	@echo "-------------------------------------------------------------------------"
	@echo "dfx identity             : $(IDENTITY)"
	@echo "- balance before: "
	@dfx wallet --network ic balance
	@echo "-------------------------------------------------------------------------"
	@echo "llama2 canister  before    : $(CANISTER_LLAMA2_ID)"
	@dfx canister --network=ic status llama2
	@echo "-------------------------------------------------------------------------"
	@echo "Sending 0.5T cycles to llama2"
	dfx wallet --network ic send $(CANISTER_LLAMA2_ID) 500000000000
	@echo "-------------------------------------------------------------------------"
	@echo "dfx identity             : $(IDENTITY)"
	@echo "- balance after: "
	@dfx wallet --network ic balance
	@echo "-------------------------------------------------------------------------"
	@echo "llama2 canister  after    : $(CANISTER_LLAMA2_ID)"
	@dfx canister --network=ic status llama2

.PHONY: dfx-cycles-to-frontend
dfx-cycles-to-frontend:
	@$(eval CANISTER_FRONTEND_ID := $(shell dfx canister --network ic id canister_frontend))
	@echo "-------------------------------------------------------------------------"
	@echo "dfx identity             : $(IDENTITY)"
	@echo "- balance before: "
	@dfx wallet --network ic balance
	@echo "-------------------------------------------------------------------------"
	@echo "canister_frontend canister  before    : $(CANISTER_FRONTEND_ID)"
	@dfx canister --network=ic status canister_frontend
	@echo "-------------------------------------------------------------------------"
	@echo "Sending 0.5T cycles to canister_frontend"
	dfx wallet --network ic send $(CANISTER_FRONTEND_ID) 500000000000
	@echo "-------------------------------------------------------------------------"
	@echo "dfx identity             : $(IDENTITY)"
	@echo "- balance after: "
	@dfx wallet --network ic balance
	@echo "-------------------------------------------------------------------------"
	@echo "canister_frontend canister  after    : $(CANISTER_FRONTEND_ID)"
	@dfx canister --network=ic status canister_frontend

.PHONY: dfx-canisters-of-project-ic
dfx-canisters-of-project-ic:
	@$(eval IDENTITY_PRINCIPAL := $(shell dfx identity --network ic get-principal))
	@$(eval IDENTITY_CYCLES_WALLET := $(shell dfx identity --network ic get-wallet))
	@$(eval IDENTITY_ICP_WALLET := $(shell dfx ledger --network ic account-id))
	@$(eval IDENTITY_ICP_BALANCE := $(shell dfx ledger --network ic balance))
	@$(eval IC_CANISTER_ID_FRONTEND := $(shell dfx canister --network ic id canister_frontend))
	@$(eval IC_CANISTER_ID_LLAMA2_260K := $(shell dfx canister --network ic id llama2_260K))
	@$(eval IC_CANISTER_ID_LLAMA2 := $(shell dfx canister --network ic id llama2))
	@$(eval IC_CANISTER_ID_LLAMA2_42M := $(shell dfx canister --network ic id llama2_42M))
	@$(eval IC_CANISTER_ID_LLAMA2_110M := $(shell dfx canister --network ic id llama2_110M))

	@echo '-------------------------------------------------'
	@echo "NETWORK                  : ic"
	@echo "dfx identity             : $(IDENTITY)"
	@echo "identity's principal     : $(IDENTITY_PRINCIPAL)"
	@echo "identity's cycles wallet : $(IDENTITY_CYCLES_WALLET)"
	@echo "identity's ICP wallet    : $(IDENTITY_ICP_WALLET)"
	@echo "identity's ICP balance   : $(IDENTITY_ICP_BALANCE)"
	@echo '-------------------------------------------------'
	@echo "identity's cycles wallet : $(IDENTITY_CYCLES_WALLET)"
	@echo "- balance: "
	@dfx wallet --network ic balance
	@echo "- status: "
	@dfx canister --network=ic status $(IDENTITY_CYCLES_WALLET)
	@echo '-------------------------------------------------'
	@echo "canister_frontend        : $(IC_CANISTER_ID_FRONTEND)"
	@dfx canister --network=ic status canister_frontend
	@echo '-------------------------------------------------'
	@echo "llama2_260K canister     : $(IC_CANISTER_ID_LLAMA2_260K)"
	@dfx canister --network=ic status llama2_260K
	@echo '-------------------------------------------------'
	@echo "llama2 canister (15M)    : $(IC_CANISTER_ID_LLAMA2)"
	@dfx canister --network=ic status llama2
	@echo '-------------------------------------------------'
	@echo "llama2_42M canister      : $(IC_CANISTER_ID_LLAMA2_42M)"
	@dfx canister --network=ic status llama2_42M
	@echo '-------------------------------------------------'
	@echo "llama2_110M canister     : $(IC_CANISTER_ID_LLAMA2_110M)"
	@dfx canister --network=ic status llama2_110M
	@echo '-------------------------------------------------'
	@echo 'View in browser at:'
	@echo  "canister_frontend (ICGPT) : https://$(CANISTER_FRONTEND).ic0.app/"
	@echo  "identity's wallet              : https://$(IDENTITY_CYCLES_WALLET).raw.ic0.app/"
	@echo  "Candid UI                      : https://$(CANISTER_CANDID_UI_IC).raw.ic0.app/"
	@echo  "Candid UI of canister_frontend : https://$(CANISTER_CANDID_UI_IC).raw.ic0.app/?id=$(CANISTER_FRONTEND)"
	

.PHONY: dfx-canisters-of-project-local
dfx-canisters-of-project-local:
	@$(eval IDENTITY_CYCLES_WALLET := $(shell dfx identity get-wallet))
	@$(eval CANISTER_CANDID_UI_LOCAL ?= $(shell dfx canister id __Candid_UI))
	@$(eval CANISTER_FRONTEND := $(shell dfx canister id canister_frontend))

	
	@echo '-------------------------------------------------'
	@echo "NETWORK            : local"
	@echo "cycles canister    : $(IDENTITY_CYCLES_WALLET)"
	@echo "Candid UI canister : $(CANISTER_CANDID_UI_IC)"
	@echo "canister_frontend  : $(CANISTER_FRONTEND)"
	@echo '-------------------------------------------------'
	@echo 'View in browser at:'
	@echo  "__Candid_UI                    : http://localhost:$(DFX_WEBSERVER_PORT)?canisterId=$(CANISTER_CANDID_UI_LOCAL)"
	@echo  "Candid UI of canister_frontend : http://localhost:$(DFX_WEBSERVER_PORT)?canisterId=$(CANISTER_CANDID_UI_LOCAL)&id=$(CANISTER_FRONTEND)"
	@echo  "canister_frontend              : http://localhost:$(DFX_WEBSERVER_PORT)?canisterId=$(CANISTER_FRONTEND)"

.PHONY: dfx-canisters-of-project
dfx-canisters-of-project:
	@if [[ ${NETWORK} == "ic" ]]; then \
		make --no-print-directory dfx-canisters-of-project-ic; \
	else \
		make --no-print-directory dfx-canisters-of-project-local; \
	fi

.PHONY: dfx-canister-methods
dfx-canister-methods:
	@echo "make dfx-canister-methods CANISTER_NAME=$(CANISTER_NAME)"
	@echo "NETWORK            : $(NETWORK)"
	@echo "CANISTER_NAME           : $(CANISTER_NAME)"
	@echo "View the canister's interface (i.e. the candid methods) at :"
	@echo "- Candid UI: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$(CANISTER_NAME)"
	@echo "- icrocks  : https://ic.rocks/principal/$(CANISTER_NAME)"
	@echo "- Canlist  : https://k7gat-daaaa-aaaae-qaahq-cai.ic0.app/search?s=$(CANISTER_NAME)"
	@echo "-------------------------------------------------------------------------"
	@echo "Checking if it is listed at Canlista"
	@dfx canister --network $(NETWORK) call kyhgh-oyaaa-aaaae-qaaha-cai getCandid '(principal "$(CANISTER_NAME)")'

.PHONY: dfx-canister-create
dfx-canister-create:
	@echo "make dfx-canister-create CANISTER_NAME=$(CANISTER_NAME)"
	@echo "NETWORK            : $(NETWORK)"
	@echo "CANISTER_NAME      : $(CANISTER_NAME)"
	@dfx canister --network $(NETWORK) create $(CANISTER_NAME)

.PHONY: dfx-canister-stop
dfx-canister-stop:
	@echo "make dfx-canister-stop CANISTER_NAME=$(CANISTER_NAME)"
	@echo "NETWORK            : $(NETWORK)"
	@echo "CANISTER_NAME      : $(CANISTER_NAME)"
	@dfx canister --network $(NETWORK) stop $(CANISTER_NAME)

.PHONY: dfx-canister-delete
dfx-canister-delete:
	@echo "make dfx-canister-delete CANISTER_NAME=$(CANISTER_NAME)"
	@echo "NETWORK            : $(NETWORK)"
	@echo "CANISTER_NAME      : $(CANISTER_NAME)"
	@dfx canister --network $(NETWORK) stop $(CANISTER_NAME)
	@dfx canister --network $(NETWORK) delete $(CANISTER_NAME)

.PHONY: dfx-canister-install-upgrade
dfx-canister-install-upgrade:
	@make --no-print-directory dfx-canister-install CANISTER_INSTALL_MODE=upgrade

.PHONY: dfx-canister-install-reinstall
dfx-canister-install-reinstall:
	@make --no-print-directory dfx-canister-install CANISTER_INSTALL_MODE=reinstall

.PHONY: dfx-canister-install
dfx-canister-install:
	@echo "make dfx-canister-install CANISTER_NAME=$(CANISTER_NAME)"
	@echo "NETWORK            : $(NETWORK)"
	@echo "CANISTER_NAME      : $(CANISTER_NAME)"
	@dfx canister --network $(NETWORK) install --mode $(CANISTER_INSTALL_MODE) $(CANISTER_NAME)

.PHONY: dfx-canister-call
dfx-canister-call:
	@dfx canister --network $(NETWORK) call --output $(CANISTER_OUTPUT) --type $(CANISTER_INPUT) $(CANISTER_NAME) $(CANISTER_METHOD) '$(CANISTER_ARGUMENT)'

.PHONY: dfx-deploy-local
dfx-deploy-local:
	@echo " "
	@dfx deploy
	@echo  "All done.... Getting details... "
	@make --no-print-directory dfx-canisters-of-project

.PHONY: dfx-deploy-ic
dfx-deploy-ic:	
	@echo " "
	@echo "--Deploy--"
	@dfx deploy --network ic
	@echo "--All done.... Get canister details..--"
	@make --no-print-directory dfx-canisters-of-project NETWORK=ic

.PHONY: dfx-identity-and-wallet-for-cicd
dfx-identity-and-wallet-for-cicd:
	@echo $(DFX_IDENTITY_PEM_ENCODED) | base64 --decode > identity-cicd.pem
	@dfx identity import cicd ./identity-cicd.pem
	@rm ./identity-cicd.pem
	@dfx identity use cicd
	@dfx identity --network ic set-wallet "$(DFX_WALLET_CANISTER_ID)"

.PHONY: dfx-identity-use
dfx-identity-use:
	@dfx identity use $(IDENTITY)

.PHONY: dfx-identity-whoami
dfx-identity-whoami:
	@echo -n $(shell dfx identity whoami)
	
.PHONY: dfx-identity-get-principal
dfx-identity-get-principal:
	@echo -n $(shell dfx identity get-principal)

.PHONY: dfx-ping
dfx-ping:
	@dfx ping $(NETWORK)

.PHONY: dfx-start-local
dfx-start-local:
	@dfx stop
	@dfx start --clean --background

.PHONY: dfx-stop-local
dfx-stop-local:
	@dfx stop

.PHONY: dfx-wallet-details
dfx-wallet-details:
	@$(eval IDENTITY_CYCLES_WALLET := $(shell dfx identity --network $(NETWORK) get-wallet))
	@echo "-------------------------------------------------------------------------"
	@echo "make dfx-wallet-details NETWORK=$(NETWORK)"
	@if [[ ${NETWORK} == "ic" ]]; then \
		echo  "View details at         : https://$(IDENTITY_CYCLES_WALLET).raw.ic0.app/"; \
	else \
		echo  "View details at         : ?? http://localhost:$(DFX_WEBSERVER_PORT)?canisterId=$(IDENTITY_CYCLES_WALLET) ?? "; \
	fi
	
	@echo "-------------------------------------------------------------------------"
	@echo -n "cycles canister id      : " && dfx identity --network $(NETWORK) get-wallet
	@echo -n "cycles canister name    : " && dfx wallet --network $(NETWORK) name
	@echo -n "cycles canister balance : " && dfx wallet --network $(NETWORK) balance
	@echo "-------------------------------------------------------------------------"
	@echo "controllers: "
	@dfx wallet --network $(NETWORK) controllers
	@echo "-------------------------------------------------------------------------"
	@echo "custodians: "
	@dfx wallet --network $(NETWORK) custodians
	@echo "-------------------------------------------------------------------------"
	@echo "addresses: "
	@dfx wallet --network $(NETWORK) addresses

.PHONY: dfx-wallet-controller-add
dfx-wallet-controller-add:
	@[ "${PRINCIPAL}" ]	|| ( echo ">> Define PRINCIPAL to add as controller: 'make dfx-cycles-controller-add PRINCIPAL=....' "; exit 1 )
	@echo    "NETWORK         : $(NETWORK)"
	@echo    "PRINCIPAL       : $(PRINCIPAL)"
	@dfx wallet --network $(NETWORK) add-controller $(PRINCIPAL)

.PHONY: dfx-wallet-controller-remove
dfx-wallet-controller-remove:
	@[ "${PRINCIPAL}" ]	|| ( echo ">> Define PRINCIPAL to remove as controller: 'make dfx-cycles-controller-remove PRINCIPAL=....' "; exit 1 )
	@echo    "NETWORK         : $(NETWORK)"
	@echo    "PRINCIPAL       : $(PRINCIPAL)"
	@dfx wallet --network $(NETWORK) remove-controller $(PRINCIPAL)

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
.PHONY: install-all
install-all: install-jp install-dfx install-javascript install-python

# This installs ~/bin/dfx
# Make sure to source ~/.profile afterwards -> it adds ~/bin to the path if it exists
.PHONY: install-dfx
install-dfx:
	sh -ci "$$(curl -fsSL https://sdk.dfinity.org/install.sh)"

.PHONY: install-javascript
install-javascript:
	npm install

.PHONY: install-jp
install-jp:
	sudo apt-get update && sudo apt-get install jp

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
# Llama2 model upload
# (-) The parent of this folder is added to Python path, for `python -m` to work
# (-) Everything else just works, because the upload script:
#     -> uses model & tokenizer path are relative to itself
#     -> pulls the canister information out of the network info (.dfx in icgpt repo)

.PHONY: upload-all-local
upload-all-local: upload-260K-local upload-15M-local upload-42M-local upload-110M-local

.PHONY: upload-all-ic
upload-all-ic: upload-260K-ic upload-15M-ic upload-42M-ic upload-110M-ic

.PHONY: upload-260K-local
upload-260K-local:
	@echo "---"
	@echo "upload-260K-local"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network local --canister llama2_260K --model stories260K/stories260K.bin --tokenizer stories260K/tok512.bin

.PHONY: upload-15M-local
upload-15M-local:
	@echo "---"
	@echo "upload-15M-local"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network local --canister llama2 --model models/stories15M.bin --tokenizer tokenizers/tokenizer.bin

.PHONY: upload-42M-local
upload-42M-local:
	@echo "---"
	@echo "upload-42M-local"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network local --canister llama2_42M --model models/stories42M.bin --tokenizer tokenizers/tokenizer.bin

.PHONY: upload-110M-local
upload-110M-local:
	@echo "---"
	@echo "upload-110M-local"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network local --canister llama2_110M --model models/stories110M.bin --tokenizer tokenizers/tokenizer.bin

.PHONY: upload-260K-ic
upload-260K-ic:
	@echo "---"
	@echo "upload-260K-ic"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network ic --canister llama2_260K --model stories260K/stories260K.bin --tokenizer stories260K/tok512.bin

.PHONY: upload-15M-ic
upload-15M-ic:
	@echo "---"
	@echo "upload-15M-ic"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network ic --canister llama2 --model models/stories15M.bin --tokenizer tokenizers/tokenizer.bin

.PHONY: upload-42M-ic
upload-42M-ic:
	@echo "---"
	@echo "upload-42M-ic"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network ic --canister llama2_42M --model models/stories42M.bin --tokenizer tokenizers/tokenizer.bin

.PHONY: upload-110M-ic
upload-110M-ic:
	@echo "---"
	@echo "upload-110M-local"
	export PYTHONPATH="${PYTHONPATH}:$(shell realpath ..)"; \
    python -m icpp_llm.icpp_llama2.scripts.upload --network ic --canister llama2_110M --model models/stories110M.bin --tokenizer tokenizers/tokenizer.bin