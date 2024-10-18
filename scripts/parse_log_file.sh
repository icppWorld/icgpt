#!/bin/bash

echo Number of unique users:
grep 'main_: saving final output to session file' /Users/arjaan/onicai/repos/llama_cpp_canister/main-llama-cpp-qwen25-05b-q8.log | sort | uniq | wc -l

echo Number of completed chats:
grep ' found an EOG token' /Users/arjaan/onicai/repos/llama_cpp_canister/main-llama-cpp-qwen25-05b-q8.log | wc -l