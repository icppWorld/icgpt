# ICGPT

<img src="./images/icgpt-start-screen.png" alt="icgpt-start-screen" width="600">

---

[Try it out on the IC](https://icgpt.icpp.world) !

---

The full application consists of 3 GitHub repositories:

1. [icgpt](https://github.com/icppWorld/icgpt) (This repo)
2. [icpp_llm](https://github.com/icppWorld/icpp_llm)
3. [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister)

# Setup

## Nodejs

Make sure you have nodejs installed on your system.

## Conda

[Download MiniConda](https://docs.conda.io/en/latest/miniconda.html#linux-installers) and then install it:

```bash
bash Miniconda3-xxxxx.sh
```

Create a conda environment with Python 3.11:

```bash
conda create --name icgpt python=3.11
conda activate icgpt
```

## git

Clone dependency repos:

```bash
git clone https://github.com/icppWorld/icpp_llm
# FOLLOW Set Up INSTRUCTIONS OF icpp_llm/llama2_c README !!!

git clone https://github.com/onicai/llama_cpp_canister
# FOLLOW Set Up INSTRUCTIONS OF llama_cpp_canister README !!!
```

Clone icgpt repo:

```bash
git clone git@github.com:icppWorld/icgpt.git
cd icgpt
```

## Update requirements-dev.txt

We install python requirements from the icpp_llm & llama_cpp_canister repos.
Make sure that requirements-dev.txt is pointing to the correct locations.

### pre-commit

Create this pre-commit script, file `.git/hooks/pre-commit`

```bash
#!/bin/bash

# Apply all static auto-formatting & perform the static checks
export PATH="$HOME/miniconda3/envs/icgpt/bin:$PATH"
/usr/bin/make all-static
```

and make the script executable:

```bash
chmod +x .git/hooks/pre-commit
```

## toolchain & dependencies

Install the toolchain:

- The dfx release version is specified in `dfx.json`

```bash
conda activate icgpt
make install-all-ubuntu  # for Ubuntu.
make install-all-mac     # for Mac.
                         # see Makefile to replicate for other systems

# ~/bin must be on path
source ~/.profile

# Verify all tools are available
dfx --version

# verify all other items are working
conda activate icgpt
make all-static-check
```

# Development

## The backend LLM canisters

ICGPT includes LLM backend canisters from [icpp_lmm](https://github.com/icppWorld/icpp_llm) & [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister)

### Setup for icpp_llm
- Clone [icpp_lmm](https://github.com/icppWorld/icpp_llm) as a sibling to this repo
- Follow instructions of [llama2_c](https://github.com/icppWorld/icpp_llm/tree/main/llama2_c) to :
  - Build the wasm
  - Get the model checkpoints

The following files are used by the ICGPT deployment steps:

```
# See: dfx.json 
../icpp_llm/llama2_c/src/llama2.did
../icpp_llm/llama2_c/build/llama2.wasm

# See: Makefile
../icpp_llm/llama2_c/scripts/upload.py
```

The following models will be uploaded as ICGPT backend canisters:
```
../icpp_llm/llama2_c/stories260K/stories260K.bin
../icpp_llm/llama2_c/stories260K/tok512.bin

../icpp_llm/llama2_c/tokenizers/tok4096.bin
../icpp_llm/llama2_c/models/stories15Mtok4096.bin

# Charles: 42M with tok4096  (Not yet public)
../charles/models/out-09/model.bin
../charles/models/out-09/tok4096.bin
```

### Setup for llama_cpp_canister
- Clone [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister):
- Follow instructions of the [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister) to :
  - Build the wasm
  - Download the GGUF modelsfrom Huggingface

The following files are used by the ICGPT deployment steps:

```
# See: dfx.json 
../../../onicai/repos/llama_cpp_canister/src/llama_cpp.did
../../../onicai/repos/llama_cpp_canister/build/llama_cpp.wasm

# See: Makefile
../../../onicai/repos/llama_cpp_canister/scripts/upload.py
```

The following models will be uploaded as ICGPT backend canisters:
```
../../../onicai/repos/llama_cpp_canister/models/storiesICP42Mtok4096.gguf
../../../onicai/repos/llama_cpp_canister/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/qwen2.5-0.5b-instruct-q8_0.gguf
```

## Deploy ICGPT to local network

Once the files of the backend LLMs are in place, as described in the previous step, you can deploy everything with:

```bash
# Start the local network
dfx start --clean

# In another terminal, deploy the canisters
# IMPORTANT: THIS UPDATES .env FOR local

# Deploy all wasms listed in dfx.json
dfx deploy
# Or, one by one... LLM (first LLMs, then ii & frontend !)
# see dfx.json
dfx deploy llama2_260K
dfx deploy llama2_15M
dfx deploy llama2_42M
dfx deploy llama2_110M
dfx deploy llama_cpp_qwen25_05b_q8


dfx deploy internet_identity
dfx deploy canister_frontend

# Upload the LLM models to the deployed backend canisters
make upload-260K-local
make upload-15M-local
make upload-charles-42M-local
# make upload-42M-local
# make upload-110M-local
make upload-qwen25-05b-q8-local
# Or alternatively
make upload-all-local

# NOTE: when re-deploying the model, you do NOT need to re-upload the model
#       the model is stored in stable memory
#       However, you do need to load it into working memory, with the command:
make load-model-qwen25-05b-q8-local

# Note: you can stop the local network with
dfx stop
```

After the deployment steps described above, the full application is now deployed to the local network, including the front-end canister, the LLM back-end canisters, and the internet_identity canister:

However, you can not run the frontend served from the local IC network, due to CORS restrictions.

Just run it locally as described in the next section, `Front-end Development`

## Front-end Development

The front-end is a react application with a webpack based build pipeline. Webpack builds with sourcemaps, so you can use the following front-end development workflow:

- Deploy the full application to the local network, as described in previous step
- Do not open the front-end deployed to the local network, but instead run the front-end with the npm development server:

  ```bash
  # from root directory

  conda activate icgpt

  # start the npm development server, with hot reloading
  npm run start

  # to rebuild from scratch
  npm run build
  ```

- When you login, just create a new II, and once login completed, you will see the start screen shown at the top of this README.

- Open the browser devtools for debugging

- Make changes to the front-end code in your favorite editor, and when you save it, everything will auto-rebuild and auto-reload

### Update to latest Internet Identity

We use `latest` for all `@dfinity/...` packages in package.json, so to update to the latest version just run:

```
npm update
```

### Styling with Dracula UI

All front-end color styling is done using the open source Dracula UI:

- [github](https://github.com/dracula/dracula-ui)
- [user guide](https://ui.draculatheme.com/)

# Deployment to IC

Step 0: When deploying for the first time:

- Delete **canister_ids.json**, because when you forked or cloned the github repo [icgpt](https://github.com/icppWorld/icgpt), it contained the canisters used by our deployment at https://icgpt.icpp.world/

Step 1: Build the backend wasm files

- Clone [icpp_llm](https://github.com/icppWorld/icpp_llm/) and follow the instructions in [llama2_c](https://github.com/icppWorld/icpp_llm/tree/main/llama2_c) to build the wasm for each backend canister.

Step 2: Deploy the backend canisters

- Note that **dfx.json** points to the wasm files build during Step 1

  ```bash
  # Deploy
  dfx deploy --ic llama2_260K -m reinstall
  dfx deploy --ic llama2_15M -m reinstall
  dfx deploy --ic llama2_42M -m reinstall
  dfx deploy --ic llama2_110M -m reinstall

  # Upload the LLM models to the backend canisters
  make upload-260K-ic
  make upload-15M-ic
  make upload-charles-42M-ic
  # make upload-42M-ic
  # make upload-110M-ic
  # Or, alternatively
  make upload-all-ic

  #--------------------------------------------------------------------------
  # IMPORTANT: ic-py might throw a timeout => patch it here:
  # Ubuntu:
  # /home/<user>/miniconda3/envs/<your-env>/lib/python3.11/site-packages/httpx/_config.py
  # Mac:
  # /Users/<user>/miniconda3/envs/<your-env>/lib/python3.11/site-packages/httpx/_config.py
  # DEFAULT_TIMEOUT_CONFIG = Timeout(timeout=5.0)
  DEFAULT_TIMEOUT_CONFIG = Timeout(timeout=99999999.0)
  # And perhaps here:
  # Ubuntu:
  # /home/<user>/miniconda3/envs/<your-env>/lib/python3.11/site-packages/httpcore/_backends/sync.py #L28-L29
  # Mac:
  # /Users/<user>/miniconda3/envs/<your-env>/lib/python3.11/site-packages/httpcore/_backends/sync.py #L28-L29
  #
  class SyncStream(NetworkStream):
      def __init__(self, sock: socket.socket) -> None:
          self._sock = sock

      def read(self, max_bytes: int, timeout: typing.Optional[float] = None) -> bytes:
          exc_map: ExceptionMapping = {socket.timeout: ReadTimeout, OSError: ReadError}
          with map_exceptions(exc_map):
              # PATCH AB
              timeout = 999999999
              # ENDPATCH
              self._sock.settimeout(timeout)
              return self._sock.recv(max_bytes)
  # ------------------------------------------------------------------------

  ```

Step 3: deploy the frontend

- Now that the backend is in place, the frontend can be deployed

  ```bash
  # from root directory
  conda activate icgpt

  dfx identity use <identity-of-controller>

  # This deploys just the frontend!
  dfx deploy --ic canister_frontend
  ```

## Verify

```bash
scripts/ready.sh --network [local/ic]
```

## Check cycle balance

```bash
scripts/balance.sh --network [local/ic]
```

## Top up cycles

```bash
# Edit the value of TOPPED_OFF_BALANCE_T in the script.
scripts/top-off.sh --network [local/ic]
```

# Appendix A - NOTES

## process.env.CANISTER*ID*<NAME>

The generated declarations and in our own front-end code the canister Ids are defined with `process.env.CANISTER_ID_<NAME>`.

The way that these environment variables are created is:

- The command `dfx deploy` maintains a section in the file `.env` where it stores the canister id for every deployed canister.
- The commands `npm build/run` use `webpack.config.js`, where the `webpack.EnvironmentPlugin` is used to define the values.

## Internet Identity

icgpt is using internet identity for authentication.

When deploying locally, the internet_identity canister will be installed automatically during the `make dfx-deploy-local` or `dfx deploy --network local` command. It uses the instructions provided in `dfx.json`.

When deploying to IC, it will NOT be deployed.

For details, see this [forum post](https://forum.dfinity.org/t/problem-insalling-internet-identity-in-local-setup/20417/18).
