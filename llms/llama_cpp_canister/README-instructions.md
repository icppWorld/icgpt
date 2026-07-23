# llama_cpp_canister

This folder holds an unzipped official release of
https://github.com/onicai/llama_cpp_canister

Currently: **v0.12.1** (see version.txt)

Note that `build/` and `*.wasm` are gitignored, so after a fresh clone of ICGPT
you must unzip the release here yourself, using the steps below.

How to unzip a release here, or upgrade ICGPT to a new version:

- Remove everything except README-instructions.md from this folder
- Download llama_cpp_canister_v#.#.#.zip from https://github.com/onicai/llama_cpp_canister/releases
- unzip it
- copy full content of zip file into this folder
- Check version.txt and correct it if the release forgot to bump it

Do NOT reformat the content of this folder. It is excluded from prettier &
eslint (see .eslintignore), so it stays byte-identical to the release zip.

## Regenerating the frontend bindings

After unzipping a release whose `build/llama_cpp.did` changed, regenerate the
declarations:

```bash
dfx generate llama_cpp_qwen25_05b_q8 --network local
```

Careful: dfx 0.32 generates declarations that import from `@icp-sdk/core/*`,
while ICGPT uses the `@dfinity/*` packages. Until ICGPT migrates, rewrite the
imports in `src/declarations/llama_cpp_qwen25_05b_q8/` back to
`@dfinity/agent`, `@dfinity/principal` & `@dfinity/candid`, or webpack fails
with `Module not found: Can't resolve '@icp-sdk/core/agent'`.

Then redeploy ICGPT using instructions of README.

## History

- v0.12.1 fixed a `get_chats` candid bug: the released `.did` declared the
  chat record field as `timestamp_ns`, while the canister actually sends
  `timestamp` (a `YYYY-MM-DD_HH-MM-SS` string). Field names are hashed, so no
  client could decode `get_chats` (the ICGPT `Chats` button failed with
  `Cannot find required field timestamp_ns`). ICGPT carried a temporary local
  edit to `build/llama_cpp.did` for v0.12.0; that patch is no longer needed.
  See https://github.com/onicai/llama_cpp_canister/issues/24
