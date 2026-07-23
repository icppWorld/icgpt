# llama_cpp_canister

This folder holds an unzipped official release of
https://github.com/onicai/llama_cpp_canister

Currently: **v0.12.0** (see version.txt)

Note that `build/` and `*.wasm` are gitignored, so after a fresh clone of ICGPT
you must unzip the release here yourself, using the steps below.

How to unzip a release here, or upgrade ICGPT to a new version:

- Remove everything except README-instructions.md from this folder
- Download llama_cpp_canister_v#.#.#.zip from https://github.com/onicai/llama_cpp_canister/releases
- unzip it
- copy full content of zip file into this folder
- Check version.txt and correct it if the release forgot to bump it
  (the v0.12.0 zip still said 0.11.0)

Do NOT reformat the content of this folder. It is excluded from prettier &
eslint (see .eslintignore), so it stays byte-identical to the release zip.

## REQUIRED PATCH after unzipping: get_chats

As of v0.12.0, the released `build/llama_cpp.did` is wrong for `get_chats`:

- the canister sends a record field named `timestamp`
  (`src/db_chats.cpp` does `r_out.append("timestamp", ...)`,
   value formatted as `YYYY-MM-DD_HH-MM-SS`)
- the .did declares that field as `timestamp_ns`

Candid field names are hashed, so NO client can decode the response. The ICGPT
`Chats` button fails with `Error: Cannot find required field timestamp_ns`, and
even `dfx canister call llama_cpp_qwen25_05b_q8 get_chats` fails with
`Failed to deserialize idl blob: Invalid data`.

Until upstream ships the fix, edit `build/llama_cpp.did` after every unzip:

```
type GetChatsRecord = record {
  chats : vec record {
    timestamp : text;      <-- was: timestamp_ns : text
    chat : text
  }
};
```

Note `build/` is gitignored, so this patch is NOT stored in git. It has to be
re-applied by hand each time you unzip a release.

Do NOT rename the other `timestamp_ns` fields in the file - those belong to
`get_creation_timestamp_ns` and are correct.

Afterwards regenerate the frontend bindings:

```bash
dfx generate llama_cpp_qwen25_05b_q8 --network local
```

Careful: dfx 0.32 generates declarations that import from `@icp-sdk/core/*`,
while ICGPT uses the `@dfinity/*` packages. Until ICGPT migrates, rewrite the
imports in `src/declarations/llama_cpp_qwen25_05b_q8/` back to
`@dfinity/agent`, `@dfinity/principal` & `@dfinity/candid`, or webpack fails
with `Module not found: Can't resolve '@icp-sdk/core/agent'`.

Then redeploy ICGPT using instructions of README
