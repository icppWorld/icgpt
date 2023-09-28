# icgpt

The full application consists of 2 GitHub repositories:
1. [icgpt](https://github.com/icppWorld/icgpt)  (This repo)
2. [icpp_llm](https://github.com/icppWorld/icpp_llm)

# Setup

## Conda

[Download MiniConda](https://docs.conda.io/en/latest/miniconda.html#linux-installers) and then install it:

```bash
bash Miniconda3-xxxxx.sh
```

Create a conda environment with NodeJS & Python 3.11:

```bash
conda create --name icgpt nodejs python=3.11
conda activate icgpt
```

## git

```bash
git clone git@github.com:icppWorld/icgpt.git
cd icgpt
```

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

## icpp_llama2

We defined in dfx.json of the icgpt repo what to use for the `llama2` canister:
```json
"llama2": {
      "type": "custom",
      "candid": "../icpp_llm/icpp_llama2/src/llama2.did",
      "wasm": "../icpp_llm/icpp_llama2/build/llama2.wasm",
      "shrink": false,
      "remote": {
        "candid": "llama2.did",
        "id": {
          "ic": "4c4bn-daaaa-aaaag-abvcq-cai"
        }
      }
    }
```

So, make sure to clone the icpp_llm repo as a sibling, and build the wasm for icpp_llama2 as described in that repo. 


## Javascript bindings 


## process.env.CANISTER_ID_<NAME>

The generated declarations and in our own frontend code the canister Ids are defined with `process.env.CANISTER_ID_<NAME>`.

The way that these environment variables are created is:
- The command `dfx deploy` maintains a section in the file `.env` where it stores the canister id for every deployed canister.
- The commands `npm build/run` use `webpack.config.js`, where the `webpack.EnvironmentPlugin` is used to define the values.


## Dracula UI

All color styling is done using the open source Dracula UI:
- [github](https://github.com/dracula/dracula-ui)
- [user guide](https://ui.draculatheme.com/) 



## toolchain & dependencies

Install the toolchain:

- The dfx release version is specified in `dfx.json`

```bash
conda activate icgpt
make install-all

# ~/bin must be on path
source ~/.profile

# Verify all tools are available
dfx --version
vessel --version

# verify all other items are working
make all-static-check
```



# Development

## Start local network

```bash
make dfx-start-local

# stop it with
make dfx-stop-local
```

## Internet Identity

icgpt is using internet identity for authentication.

The internet_identity canister will be installed during a `dfx deploy --network local` command using the instructions provided in `dfx.json`. It will NOT be deployed when deploying to the IC.

For details, see this [forum post](https://forum.dfinity.org/t/problem-insalling-internet-identity-in-local-setup/20417/18).

The II canister will be: `be2us-64aaa-aaaaa-qaabq-cai`
Which is what is filled out on line 8 of webpack.config.js  

## Deploy icgpt

### The commit-sha in the About page
Because it is a SaaS application, we use a Continuous Deployment approach, where we use the current commit-sha as the version. 

We include the commit-sha in the frontend's About, which is injected into the deployment by the asset file `src/frontend/assets/deploy-info/commit.json`.

This file is not checked in, but automatically created/updated by all the following commands:
 - `make set-commit-sha`
 - `make dfx-deploy-local` 
 - `make dfx-deploy-ic`
l
### Deploy
Deploy the icgpt to the local network with:

```bash
# from root directory

conda activate icgpt

# Start local network
make dfx-start-local

# Deploy
make dfx-deploy-local
```



## Frontend Development

The frontend is a react application with a webpack based build pipeline. Webpack builds with sourcemaps, so you can use the devtools of the browser for debugging:

- Run frontend with npm development server:

  ```bash
  # from root directory
  
  conda activate icgpt
  
  # start the development server, with hot reloading
  npm run start
  
  # to rebuild from scratch
  npm run build
  ```

- Open the browser at the URL printed & open the browser devtools

- Make changes to the frontend code in your favorite editor, and when you save it, everything will auto-rebuild and auto-reload

# Adding cycles

## Check status
Make sure that the cycles wallet of icpp-llm has sufficient cycles:
```bash
dfx identity use icpp-llm

# Verify status
make dfx-canisters-of-project-ic
```

## Add cycles to icpp-llm Identities' cycles wallet
- Login NNS
- My Canisters -> `jh35u-eqaaa-aaaag-abf3a-cai` 
  - Shows the balance
  - Has options for:
    - Add Controller
    - Add Cycles

## Add cycles to the project canisters
```bash
dfx identity use icpp-llm

# Verify status
make dfx-canisters-of-project-ic

# Add 0.5T cycles: 
make dfx-cycles-to-llama2
make dfx-cycles-to-frontend
```

# Appendix A: Custom Domain `icgpt.icpp.world`

[IC Custom Domain Docs](https://internetcomputer.org/docs/current/developer-docs/production/custom-domain/#custom-domains-on-the-boundary-nodes)

One time steps to use the custom domain `icgpt.icpp.world` :

- Define the DNS records at netfirms.com
  - See also the google drive docs for netfirms

- Created these files in a folder `src/frontend/domain-info`:

  - `domain-info/.well-known/ic-domains`

  Instead of a file `domain-info/.ic-assets.json` as explained in the docs, I added this content to `src/frontend/src/.ic-assets.json5`:
  ```json
  {
    "match": ".well-known",
    "ignore": false
  },
  ```

  Note that the name `domain-info` is something I chose. 

- Updated the `CopyPlugin` of `webpack.config.js` to copy these files into the `dist/frontend` folder during build.

- Verify that files are included in `dist/frontend` during build:

  ```bash
  npm run build
  ```

- Deploy to canister

- Initiate the registration of domain with IC with command:

  ```bash
  $ curl -sLv -X POST \
      -H 'Content-Type: application/json' \
      https://ic0.app/registrations \
      --data @- <<EOF
  {
      "name": "icgpt.icpp.world"
  }
  EOF
  
  ...
  * Connection #0 to host ic0.app left intact
  {"id":"213b1338e030ac13404f9252870ad373462ec2a567b1c472ac5361c5109d83a8"}
  ```

- Query the status, using the REQUEST_ID (`e8f1...`):

  ```bash
  $ curl -sLv -X GET \
      https://ic0.app/registrations/213b1338e030ac13404f9252870ad373462ec2a567b1c472ac5361c5109d83a8
  ...
  # once approved
  * Connection #0 to host ic0.app left intact
  {"name":"icgpt.icpp.world","canister":"4v3v2-lyaaa-aaaag-abzna-cai","state":"Available"}
  ```