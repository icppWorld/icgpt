#!/bin/sh

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
canisters=("canister_frontend" "llama2_260K" "llama2_15M")

# Define the target balance in cycles
TOPPED_OFF_BALANCE_T=3  # Adjust this to your desired balance in cycles
TOPPED_OFF_BALANCE=$(echo "$TOPPED_OFF_BALANCE_T * 1000000000000" | bc)
TOPPED_OFF_BALANCE=$(printf "%.0f" $TOPPED_OFF_BALANCE)

echo " "
echo "--------------------------------------------------"
echo -n "- dfx identity             : "; dfx identity whoami
echo -n "- Wallet balance           : "; dfx wallet --network $NETWORK_TYPE balance

# top off cycles for all llms in sequential mode
echo " "
echo "--------------------------------------------------"
echo "Top off all llms to $TOPPED_OFF_BALANCE_T Tcycles ($TOPPED_OFF_BALANCE cycles)"
for canister in "${canisters[@]}"
do
    CURRENT_BALANCE=$(dfx canister --network $NETWORK_TYPE status $canister 2>&1 | grep "Balance:" | awk '{gsub("_", ""); print $2}')
    NEED_CYCLES=$(echo "$TOPPED_OFF_BALANCE - $CURRENT_BALANCE" | bc)
    if [ $(echo "$NEED_CYCLES > 0" | bc) -eq 1 ]; then
        CANISTER_ID=$(dfx canister --network $NETWORK_TYPE id $canister)
        echo "Sending $NEED_CYCLES cycles to $canister"
        dfx wallet send $CANISTER_ID $NEED_CYCLES --network $NETWORK_TYPE
    else
        echo "No need to send cycles to $canister"
    fi
done

echo " "
echo "--------------------------------------------------"
echo -n "- dfx identity             : "; dfx identity whoami
echo -n "- Wallet balance after     : "; dfx wallet --network $NETWORK_TYPE balance
