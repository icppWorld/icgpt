#!/bin/bash

#######################################################################
# For Linux & Mac
#######################################################################
export PYTHONPATH="${PYTHONPATH}:$(realpath ../icpp_llm/llama2_c)"


#######################################################################
# --network [local|ic]
#######################################################################

# Default network type is local
NETWORK_TYPE="local"

# Parse command line arguments for network type
while [ $# -gt 0 ]; do
    case "$1" in
        --network)
            shift
            if [ "$1" = "local" ] || [ "$1" = "ic" ]; then
                NETWORK_TYPE=$1
            else
                echo "Invalid network type: $1. Use 'local' or 'ic'."
                exit 1
            fi
            shift
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 --network [local|ic]"
            exit 1
            ;;
    esac
done

echo "Using network type: $NETWORK_TYPE"

#######################################################################

canisters=("llama2_260K" "llama2_15M" "llama2_42M")

# verify readiness of all backend canisters in sequential mode
echo " "
echo "--------------------------------------------------"
echo "Checking readiness endpoint for all backend canisters"
for canister in "${canisters[@]}"
do
    output=$(dfx canister call $canister ready --network $NETWORK_TYPE )

    if [ "$output" != "(variant { Ok = record { status_code = 200 : nat16 } })" ]; then
        echo "$canister is not ready. Exiting."
        echo $output
        exit 1
    else
        echo "$canister is ready."
    fi
done