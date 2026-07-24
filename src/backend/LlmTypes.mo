// Types mirroring the subset of the llama_cpp_canister candid interface that the
// controller proxies. These MUST match llms/llama_cpp_canister/build/llama_cpp.did
// exactly, so (a) the controller can make inter-canister calls to the LLM and
// (b) the controller's own new_chat/run_update/health candid matches what the
// frontend's llamacpp.js already reads (.Ok.output/.conversation/... , .Err.error).
module LlmTypes {
  public type InputRecord = {
    args : [Text]; // CLI args of llama.cpp, as a list of strings
  };

  public type RunOutputRecord = {
    status_code : Nat16;
    output : Text;
    conversation : Text;
    error : Text;
    prompt_remaining : Text;
    generated_eog : Bool;
  };

  // Both arms are RunOutputRecord (matches llama_cpp): the frontend reads
  // .Err.error the same way as a successful .Ok.
  public type OutputRecordResult = {
    #Ok : RunOutputRecord;
    #Err : RunOutputRecord;
  };

  // The controller returns RunOutputRecord PLUS exact per-call metering it measured
  // around the LLM call: cycles_cost (the LLM's live-balance drop, via canister_status)
  // and duration_ns (IC system time bracketing ONLY the LLM call). Both exclude the
  // controller's own cost/time. The frontend reads .Ok.output/... as before, and the
  // two extra fields for exact conversation cost + on-chain tok/s.
  public type RunOutputRecordX = {
    status_code : Nat16;
    output : Text;
    conversation : Text;
    error : Text;
    prompt_remaining : Text;
    generated_eog : Bool;
    cycles_cost : Nat;
    duration_ns : Nat;
  };
  public type OutputRecordResultX = {
    #Ok : RunOutputRecordX;
    #Err : RunOutputRecordX;
  };

  public type ApiError = {
    #Other : Text;
    #StatusCode : Nat16;
  };

  public type StatusCodeRecord = { status_code : Nat16 };
  public type StatusCodeRecordResult = {
    #Ok : StatusCodeRecord;
    #Err : ApiError;
  };

  // The LLM canister interface, as seen from the controller. llama_cpp declares
  // health/check_access as `query`, but an inter-canister call runs them
  // replicated, so we declare them as plain async here (like IConfucius does).
  public type LLMCanister = actor {
    health : () -> async StatusCodeRecordResult;
    check_access : () -> async StatusCodeRecordResult;
    new_chat : (InputRecord) -> async OutputRecordResult;
    run_update : (InputRecord) -> async OutputRecordResult;
  };
};
