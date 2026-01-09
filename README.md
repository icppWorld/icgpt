# ICGPT

[Try it out](https://icgpt.onicai.com) !

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

git clone https://github.com/onicai/Charles
# FOLLOW INSTRUCTIONS OF Charles README to download the model from HuggingFace !!!
```

Clone icgpt repo:

```bash
git clone git@github.com:icppWorld/icgpt.git
cd icgpt
```

## Update requirements-dev.txt

We install python requirements from the icpp_llm & llama_cpp_canister repos as sibling repos.
If you do it differently, make sure that requirements-dev.txt is pointing to the correct locations.

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
npm install

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

# Charles: 42M with tok4096
../Charles/models/out-09/model.bin
../Charles/models/out-09/tok4096.bin
```

### Setup for llama_cpp_canister
- Clone [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister):
- Follow instructions of the [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister) to :
  - Build the wasm
  - Download the GGUF model from Huggingface

The following files are used by the ICGPT deployment steps:

```
# See: dfx.json 
../llama_cpp_canister/build/llama_cpp.did
../llama_cpp_canister/build/llama_cpp.wasm

# See: Makefile
../llama_cpp_canister/scripts/upload.py
```

The following models will be uploaded as ICGPT backend canisters:
```
../llama_cpp_canister/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/qwen2.5-0.5b-instruct-q8_0.gguf
```

## Deploy ICGPT to local network

Once the files of the backend LLMs are in place, as described in the previous step, you can deploy everything with:


```bash
#NOTE: Be aware of the environment setting `DFX_NETWORK` in your shell. It might interfere with the scripts.
unset DFX_NETWORK

# Start the local network
dfx start --clean

# Deploy the nns to the local network
dfx nns install

# IMPORTANT: dfx deploy ... updates .env for local canisters
#            .env is used by the frontend webpack.config.js !!!

# Deploy the wasms & upload models & prime the canisters
dfx deploy llama2_260K --network local
make upload-260K-local

dfx deploy llama2_15M --network local
make upload-15M-local

dfx deploy llama2_42M --network local
make upload-charles-42M-local

# llama.cpp qwen2.5 0.5b q8 (676 Mb)
dfx deploy llama_cpp_qwen25_05b_q8 --network local [-m upgrade/reinstall] # upgrade preserves model in stable memory
# dfx canister update-settings llama_cpp_qwen25_05b_q8 --wasm-memory-limit 4GiB
dfx canister status llama_cpp_qwen25_05b_q8 --network local
# if (re)installed:
  make upload-llama-cpp-qwen25-05b-q8-local # Not needed after an upgrade, only after initial or reinstall
dfx canister call llama_cpp_qwen25_05b_q8 load_model '(record { args = vec {"--model"; "model.gguf"; } })'  --network local
dfx canister call llama_cpp_qwen25_05b_q8 set_max_tokens '(record { max_tokens_query = 12 : nat64; max_tokens_update = 12 : nat64 })'  --network local
dfx canister call llama_cpp_qwen25_05b_q8 chats_resume  --network local
#
# Open up access:
# 0 = only controllers
# 1 = all except anonymous
dfx canister call llama_cpp_qwen25_05b_q8 set_access '(record { level = 1 : nat16 })' --network local
dfx canister call llama_cpp_qwen25_05b_q8 get_access --network local
#
# Final check
dfx canister call llama_cpp_qwen25_05b_q8 ready  --network local

# Generate the bindings
dfx generate --network local

# Deploy the frontend canisters to the local network
dfx deploy canister_frontend  --network local # REQUIRED: redeploy each time backend candid interface is modified.
                                              #           it creates src/declarations used by webpack.config.js



# Note: you can stop the local network with
dfx stop 
```

After the deployment steps described above, the full application is now deployed to the local network, including the front-end canister, the LLM back-end canisters, and the internet_identity canister:

However, you can not run the frontend served from the local IC network, due to CORS restrictions.

Just run it locally as described in the next section, `Front-end Development`

## Test Qwen2.5 0.5B Q8_0 backend with dfx

It is handy to be able to verify the Qwen2.5 backend canister with dfx:

- Chat with the LLM:

    Details how to use the Qwen models with llama.cpp:
    https://qwen.readthedocs.io/en/latest/run_locally/llama.cpp.html

    ```bash
    # Start a new chat - this resets the prompt-cache for this conversation
    dfx canister call llama_cpp_qwen25_05b_q8 new_chat '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"} })'

    # Repeat this call until the prompt_remaining is empty. KEEP SENDING THE ORIGINAL PROMPT 

    # Example of a longer prompt
    dfx canister call llama_cpp_qwen25_05b_q8 run_update '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"; "--prompt-cache-all"; "-sp"; "-p"; "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\ngive me a short introduction to LLMs.<|im_end|>\n<|im_start|>assistant\n"; "-n"; "512" } })' 

    # Example of a very short prompt
    dfx canister call llama_cpp_qwen25_05b_q8 run_update '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"; "--prompt-cache-all"; "-sp"; "-p"; "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n"; "-n"; "512" } })' 

     ...
    # Once prompt_remaining is empty, repeat this call, with an empty prompt, until `generated_eog=true`:
    dfx canister call llama_cpp_qwen25_05b_q8 run_update '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"; "--prompt-cache-all"; "-sp"; "-p"; ""; "-n"; "512" } })'

    ...

    # Once generated_eog = true, the LLM is done generating

    # this is the output after several update calls and it has reached eog:
    (
      variant {
        Ok = record {
          output = " level of complexity than the original text.<|im_end|>";
          conversation = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\ngive me a short introduction to LLMs.<|im_end|>\n<|im_start|>assistant\nLLMs are large language models, or generative models, that can generate text based on a given input. These models are trained on a large corpus of text and are able to generate text that is similar to the input. They can be used for a wide range of applications, such as language translation, question answering, and text generation for various tasks. LLMs are often referred to as \"artificial general intelligence\" because they can generate text that is not only similar to the input but also has a higher level of complexity than the original text.<|im_end|>";
          error = "";
          status_code = 200 : nat16;
          prompt_remaining = "";
          generated_eog = true;
        }
      },
    )

    For more details & options, see llama_cpp_canister repo.

## Front-end Development

The front-end is a react application with a webpack based build pipeline. Webpack builds with sourcemaps, so you can use the following front-end development workflow:

- Deploy the full application to the local network, as described in previous step
- Do not open the front-end deployed to the local network, but instead run the front-end with the npm development server:

  ```bash
  # from root directory

  conda activate icgpt

  # build a dev version, so you can add breakpoints etc.
  npm run build:dev

  # start the npm development server, with hot reloading
  # run against local deployment of backend
  npm run start:local
  # run against ic deployment of backend
  npm run start:ic         (NOTE: not tested...)
  
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

- Delete **canister_ids.json**, because when you forked or cloned the github repo [icgpt](https://github.com/icppWorld/icgpt), it contained the canisters used by our deployment at https://icgpt.onicai.com/

Step 1: Build the backend wasm files

- Clone [icpp_llm](https://github.com/icppWorld/icpp_llm/) and follow the instructions in [llama2_c](https://github.com/icppWorld/icpp_llm/tree/main/llama2_c) to build the wasm for each backend canister.

Step 2: Deploy the backend canisters

- Note that **dfx.json** points to the wasm files build during Step 1

  ```bash
  # Deploy & upload models
  dfx deploy --ic llama2_260K -m reinstall
  make upload-260K-ic

  dfx deploy --ic llama2_15M -m reinstall
  make upload-15M-ic

  dfx deploy --ic llama2_42M -m reinstall
  # To avoid time-outs:
  # [compute allocation](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/maintain/settings#compute-allocation)
  dfx canister update-settings --ic llama2_42M --compute-allocation 1 # (costs a rental fee)
  dfx canister status --ic llama2_42M 
  make upload-charles-42M-ic

  # qwen2.5 0.5b q8 (676 Mb)
  dfx deploy --ic llama_cpp_qwen25_05b_q8 -m [upgrade/reinstall] # upgrade preserves model in stable memory
  dfx canister --ic update-settings llama_cpp_qwen25_05b_q8 --wasm-memory-limit 4GiB
  dfx canister --ic status llama_cpp_qwen25_05b_q8
  dfx canister --ic call llama_cpp_qwen25_05b_q8 set_max_tokens '(record { max_tokens_query = 12 : nat64; max_tokens_update = 12 : nat64 })'
  dfx canister --ic call llama_cpp_qwen25_05b_q8 chats_resume
  #
  # Open up access to all except anonymous (An upgrade resets it to 0 !):
  # 0 = only controllers
  # 1 = all except anonymous
  dfx canister --ic call llama_cpp_qwen25_05b_q8 set_access '(record { level = 1 : nat16 })'
  dfx canister --ic call llama_cpp_qwen25_05b_q8 get_access

  # To avoid time-outs:
  # [compute allocation](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/maintain/settings#compute-allocation)
  dfx canister update-settings --ic llama_cpp_qwen25_05b_q8 --compute-allocation 1 # (costs a rental fee)
  dfx canister status --ic llama_cpp_qwen25_05b_q8 
  #
  # After `dfx deploy -m reinstall`: 
  make upload-llama-cpp-qwen25-05b-q8-ic  # Not needed after an upgrade, only after initial or reinstall
  #
  # After `dfx deploy -m upgrade`:
  dfx canister --ic  call llama_cpp_qwen25_05b_q8 load_model '(record { args = vec {"--model"; "model.gguf"; } })'

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

Note: Downloading the log file

You can download the `main.log` file from the canister with the command:

```
# For example, this is for the qwen2.5 q8_0 canister running on the IC in ICGPT
make download-log-llama-cpp-qwen25-05b-q8-ic
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
