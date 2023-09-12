# icgpt

The full application consists of 2 GitHub repositories:
1. [icgpt](https://github.com/icppWorld/icgpt)  (This repo)
2. [icpp-llm](https://github.com/icppWorld/icpp-llm)

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



## Dracula UI

All color styling is done using the open source Dracula UI:
- [github](https://github.com/dracula/dracula-ui)
- [user guide](https://ui.draculatheme.com/) 



## toolchain & dependencies

Install the toolchain:

- The dfx release version is specified in `dfx.json`
- We use [vessel](https://github.com/dfinity/vessel) to include motoko package sets curated in the [vessel-package-set.](https://github.com/kritzcreek/vessel-package-set/tree/main/index) (See Appendix B below)

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
