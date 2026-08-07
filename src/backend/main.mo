import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Int "mo:base/Int";
import Bootstrap "Bootstrap";
import LlmTypes "LlmTypes";
import LLM "mo:llm";
import Judge "Judge";
import LogStore "LogStore";
import Cycles "mo:base/ExperimentalCycles";
import Timer "mo:base/Timer";

// ICGPT admin & CONTROLLER canister.
//
// (1) Gated early-access: while `earlyAccess` is true, only admins + whitelisted
//     principals are `allowed`; others request access for an admin to approve.
// (2) Controller / hard gate: this canister is the ONLY caller allowed to reach the
//     LLM canister(s). The frontend routes inference here; we proxy new_chat/run_update
//     per call (so the browser keeps streaming), enforcing the access gate + per-user
//     prompt-cache isolation, and metering usage. The LLM is locked to controllers-only
//     and this canister is a controller of it (see README hard-gate deploy steps).
persistent actor {
  type Entry = { email : Text; note : Text; at : Int };
  type Info = { principal : Principal; email : Text; note : Text; at : Int };
  type AdminInfo = { principal : Principal; who : Text };
  type Access = {
    earlyAccess : Bool;
    isAdmin : Bool;
    whitelisted : Bool;
    requested : Bool;
    allowed : Bool;
  };

  // Early-access scale is small, so keep state as plain stable arrays (persist across
  // upgrades automatically) with linear helpers - no map library or upgrade hooks.
  // In a `persistent actor` these `var`s are stable (persist across upgrades) by default.
  var earlyAccess : Bool = true;
  var admins : [(Principal, Text)] = []; // runtime admins (in addition to Bootstrap)
  var whitelist : [(Principal, Entry)] = [];
  var requests : [(Principal, Entry)] = [];

  // ----- entry-list helpers -------------------------------------------------
  func findEntry(arr : [(Principal, Entry)], p : Principal) : ?Entry {
    for ((k, v) in arr.vals()) { if (k == p) { return ?v } };
    null;
  };
  func hasKey(arr : [(Principal, Entry)], p : Principal) : Bool {
    for ((k, _) in arr.vals()) { if (k == p) { return true } };
    false;
  };
  func upsertEntry(arr : [(Principal, Entry)], p : Principal, e : Entry) : [(Principal, Entry)] {
    let without = Array.filter<(Principal, Entry)>(arr, func((k, _)) { k != p });
    Array.append(without, [(p, e)]);
  };
  func removeEntry(arr : [(Principal, Entry)], p : Principal) : [(Principal, Entry)] {
    Array.filter<(Principal, Entry)>(arr, func((k, _)) { k != p });
  };
  func toInfos(arr : [(Principal, Entry)]) : [Info] {
    Array.map<(Principal, Entry), Info>(
      arr,
      func((p, e)) { { principal = p; email = e.email; note = e.note; at = e.at } },
    );
  };

  // ----- admin check --------------------------------------------------------
  func isAdmin(p : Principal) : Bool {
    if (Bootstrap.isBootstrap(p)) { return true };
    for ((k, _) in admins.vals()) { if (k == p) { return true } };
    false;
  };
  func requireAdmin(caller : Principal) {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) {
      Debug.trap("Unauthorized: admin only");
    };
  };

  // Allowed to use inference: admin OR early access is off OR whitelisted.
  func isAllowed(caller : Principal) : Bool {
    if (Principal.isAnonymous(caller)) { return false };
    isAdmin(caller) or (not earlyAccess) or hasKey(whitelist, caller);
  };

  // Ops = app admin OR an IC controller of this canister (the deploy/CLI identity),
  // for controller-config methods typically run from the CLI at deploy time.
  func requireOps(caller : Principal) {
    if (Principal.isAnonymous(caller) or not (isAdmin(caller) or Principal.isController(caller))) {
      Debug.trap("Unauthorized: ops (admin or controller) only");
    };
  };

  // ----- public: access ----------------------------------------------------

  /// The caller's principal - handy for the access screen and for capturing a
  /// principal to hardcode as a bootstrap admin.
  public query ({ caller }) func whoami() : async Principal { caller };

  /// The single call the frontend gate needs. allowed = admin OR not earlyAccess OR
  /// whitelisted. Non-allowed users are shown the request-access screen.
  public query ({ caller }) func myAccess() : async Access {
    let admin = isAdmin(caller);
    let wl = hasKey(whitelist, caller);
    {
      earlyAccess;
      isAdmin = admin;
      whitelisted = wl;
      requested = hasKey(requests, caller);
      allowed = admin or (not earlyAccess) or wl;
    };
  };

  public query ({ caller }) func isCallerAdmin() : async Bool { isAdmin(caller) };

  public query func getEarlyAccess() : async Bool { earlyAccess };

  /// A signed-in, not-yet-allowed caller requests access, describing their use case.
  /// An admin later approves it onto the whitelist (approval is discussed on OpenChat).
  /// The use case is stored in the `note` field. Bounded to protect stable memory.
  public shared ({ caller }) func requestAccess(useCase : Text) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) { return #err("sign in first") };
    if (isAdmin(caller) or hasKey(whitelist, caller)) {
      return #err("you already have access");
    };
    if (Text.size(useCase) > 1000) {
      return #err("use case too long (max 1000 chars)");
    };
    if (not hasKey(requests, caller) and requests.size() >= 5000) {
      return #err("the request list is full - please contact the team directly");
    };
    requests := upsertEntry(requests, caller, { email = ""; note = useCase; at = Time.now() });
    #ok;
  };

  // ----- admin: early access ------------------------------------------------
  public shared ({ caller }) func setEarlyAccess(e : Bool) : async () {
    requireAdmin(caller);
    earlyAccess := e;
  };

  public query ({ caller }) func listRequests() : async [Info] {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) { return [] };
    toInfos(requests);
  };

  public query ({ caller }) func listWhitelist() : async [Info] {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) { return [] };
    toInfos(whitelist);
  };

  /// Approve a pending request: move it onto the whitelist, preserving email + timestamp.
  public shared ({ caller }) func approve(p : Principal) : async Result.Result<(), Text> {
    requireAdmin(caller);
    switch (findEntry(requests, p)) {
      case null { #err("no such request") };
      case (?e) {
        whitelist := upsertEntry(whitelist, p, e);
        requests := removeEntry(requests, p);
        #ok;
      };
    };
  };

  public shared ({ caller }) func reject(p : Principal) : async () {
    requireAdmin(caller);
    requests := removeEntry(requests, p);
  };

  /// Directly whitelist a principal (no prior request), e.g. a known colleague.
  public shared ({ caller }) func addToWhitelist(p : Principal, email : Text, note : Text) : async () {
    requireAdmin(caller);
    if (Principal.isAnonymous(p)) { Debug.trap("cannot whitelist the anonymous principal") };
    if (Text.size(email) > 200 or Text.size(note) > 200) { Debug.trap("email/note too long (max 200)") };
    whitelist := upsertEntry(whitelist, p, { email; note; at = Time.now() });
  };

  public shared ({ caller }) func removeFromWhitelist(p : Principal) : async () {
    requireAdmin(caller);
    whitelist := removeEntry(whitelist, p);
  };

  // ----- admin: admins ------------------------------------------------------
  public query ({ caller }) func listAdmins() : async { bootstrap : [AdminInfo]; added : [AdminInfo] } {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) {
      return { bootstrap = []; added = [] };
    };
    let bs = Array.map<(Principal, Text), AdminInfo>(
      Bootstrap.list(),
      func((p, w)) { { principal = p; who = w } },
    );
    let ad = Array.map<(Principal, Text), AdminInfo>(
      admins,
      func((p, w)) { { principal = p; who = w } },
    );
    { bootstrap = bs; added = ad };
  };

  /// Grant admin to a principal at runtime (in addition to the hardcoded bootstrap).
  /// Re-calling updates the who label. Admin-only.
  public shared ({ caller }) func addAdmin(p : Principal, who : Text) : async () {
    requireAdmin(caller);
    if (Principal.isAnonymous(p)) { Debug.trap("cannot grant admin to the anonymous principal") };
    if (Text.size(who) > 200) { Debug.trap("who label too long (max 200)") };
    let without = Array.filter<(Principal, Text)>(admins, func((k, _)) { k != p });
    admins := Array.append(without, [(p, who)]);
  };

  /// Revoke a runtime-added admin. The hardcoded bootstrap admins are permanent.
  public shared ({ caller }) func removeAdmin(p : Principal) : async () {
    requireAdmin(caller);
    admins := Array.filter<(Principal, Text)>(admins, func((k, _)) { k != p });
  };

  // =========================================================================
  // Controller role: proxy inference to the LLM canister(s).
  // =========================================================================

  // Registered LLMs as (modelKey, canisterId) pairs (stable). modelKey is the gguf
  // filename the canister serves (matches the frontend MODELS[].gguf); new_chat routes
  // by it. Actor refs are created on demand - cheap, avoids a transient Buffer.
  var llmCanisters : [(Text, Text)] = [];
  // A conversation must stay on ONE LLM (its prompt cache lives there), so pin each
  // caller to the LLM chosen at new_chat; run_update reuses it.
  var callerLlm : [(Principal, Nat)] = [];

  func llmActor(idx : Nat) : LlmTypes.LLMCanister {
    actor (llmCanisters[idx].1);
  };
  // Index of the LLM serving `model` (the gguf key), or null if not registered.
  func findLlmByModel(model : Text) : ?Nat {
    var i = 0;
    while (i < llmCanisters.size()) {
      if (llmCanisters[i].0 == model) { return ?i };
      i += 1;
    };
    null;
  };

  // The IC management canister, for reading a canister's LIVE cycle balance. This
  // canister is a controller of each LLM, so canister_status is permitted. We declare
  // only the `cycles` field; candid record subtyping ignores the rest of the response.
  let IC : actor {
    canister_status : shared { canister_id : Principal } -> async {
      cycles : Nat;
    };
  } = actor ("aaaaa-aa");

  // The LLM's live cycle balance (0 if it can't be read - callers treat 0 as "unknown").
  func llmBalance(idx : Nat) : async Nat {
    try {
      let s = await IC.canister_status({
        canister_id = Principal.fromText(llmCanisters[idx].1);
      });
      s.cycles;
    } catch (_) { 0 };
  };

  // ----- cycles monitoring (public /canisters status page) ------------------
  // A snapshot of each canister's cycle balance, refreshed by a timer every 10 min so the
  // read is a cheap query (no per-load management-canister calls, no anonymous drain vector).
  // Self balance is read directly; the LLMs via canister_status (this canister controls them).
  type CanisterCycles = { name : Text; canisterId : Text; cycles : Nat };
  type CyclesReport = { canisters : [CanisterCycles]; updatedAt : Int };
  var cyclesSnapshot : [CanisterCycles] = [];
  var cyclesSnapshotAt : Int = 0;

  func refreshCyclesSnapshot() : async () {
    // icgpt_admin itself first (id "" - the frontend fills its own known id), then each LLM.
    var out : [CanisterCycles] = [{
      name = "icgpt_admin";
      canisterId = "";
      cycles = Cycles.balance();
    }];
    var i = 0;
    while (i < llmCanisters.size()) {
      let bal = await llmBalance(i);
      out := Array.append(
        out,
        [{ name = llmCanisters[i].0; canisterId = llmCanisters[i].1; cycles = bal }],
      );
      i += 1;
    };
    cyclesSnapshot := out;
    cyclesSnapshotAt := Time.now();
  };

  // Arm the refresh timers: a one-shot to populate ~immediately after (re)install, plus a
  // recurring 10-minute refresh. Timers do NOT survive an upgrade, so this is called at init
  // AND from postupgrade to re-arm.
  func armCyclesTimer<system>() {
    ignore Timer.setTimer<system>(#seconds 2, refreshCyclesSnapshot);
    ignore Timer.recurringTimer<system>(#seconds 600, refreshCyclesSnapshot);
  };
  armCyclesTimer<system>();
  system func postupgrade() { armCyclesTimer<system>() };

  // Public, non-anonymous: the cached cycle-balance snapshot for the /canisters page.
  public query ({ caller }) func getCyclesReport() : async CyclesReport {
    if (Principal.isAnonymous(caller)) {
      return { canisters = []; updatedAt = 0 };
    };
    { canisters = cyclesSnapshot; updatedAt = cyclesSnapshotAt };
  };

  // Attach the measured per-call cost + on-chain duration to the LLM's response.
  func xify(r : LlmTypes.OutputRecordResult, cost : Nat, durNs : Nat) : LlmTypes.OutputRecordResultX {
    switch (r) {
      case (#Ok(o)) { #Ok({ o with cycles_cost = cost; duration_ns = durNs }) };
      case (#Err(o)) { #Err({ o with cycles_cost = cost; duration_ns = durNs }) };
    };
  };
  func getCallerLlm(caller : Principal) : Nat {
    for ((k, v) in callerLlm.vals()) { if (k == caller) { return v } };
    0;
  };
  func setCallerLlm(caller : Principal, idx : Nat) {
    let without = Array.filter<(Principal, Nat)>(callerLlm, func((k, _)) { k != caller });
    callerLlm := Array.append(without, [(caller, idx)]);
  };

  // Force the --prompt-cache path to a per-caller location, so users can't share
  // or read each other's cache now that the controller is the sole LLM caller.
  // Derived from msg.caller, so it's unspoofable.
  func rewriteCachePath(args : [Text], caller : Principal) : [Text] {
    let newPath = Principal.toText(caller) # "/prompt.cache";
    let n = args.size();
    var out : [Text] = [];
    var i = 0;
    var replaced = false;
    while (i < n) {
      if (args[i] == "--prompt-cache" and i + 1 < n) {
        out := Array.append(out, [args[i], newPath]);
        i += 2;
        replaced := true;
      } else {
        out := Array.append(out, [args[i]]);
        i += 1;
      };
    };
    if (not replaced) { out := Array.append(out, ["--prompt-cache", newPath]) };
    out;
  };

  func errOutCode(msg : Text, status : Nat16) : LlmTypes.OutputRecordResultX {
    #Err({
      status_code = status;
      output = "";
      conversation = "";
      error = msg;
      prompt_remaining = "";
      generated_eog = true;
      cycles_cost = 0;
      duration_ns = 0;
      n_prompt_tokens = null;
      n_prompt_tokens_cached = null;
      n_prompt_tokens_decoded = null;
      n_tokens_generated = null;
      n_prompt_tokens_remaining = null;
    });
  };
  // Gate/config rejections use 403 (surface immediately); transient infra failures use 503 so the
  // frontend classifier can tell them apart and retry the 503s with backoff.
  func errOut(msg : Text) : LlmTypes.OutputRecordResultX { errOutCode(msg, 403) };

  // Cost = the LLM's live-balance drop across the call (excludes the controller's own
  // cost). Guard against 0 (unknown balance) and non-decreasing balance.
  func costOf(balBefore : Nat, balAfter : Nat) : Nat {
    if (balBefore > balAfter and balAfter != 0) { balBefore - balAfter } else { 0 };
  };
  func durOf(t0 : Int, t1 : Int) : Nat {
    if (t1 > t0) { Int.abs(t1 - t0) } else { 0 };
  };

  // ----- usage metering -----------------------------------------------------
  type UsageStat = {
    conversations : Nat;
    calls : Nat;
    tokensOut : Nat;
    cyclesCost : Nat; // exact accrued LLM cycle cost across this user's calls
    lastAt : Int;
  };
  type UsageInfo = {
    principal : Principal;
    conversations : Nat;
    calls : Nat;
    tokensOut : Nat;
    cyclesCost : Nat;
    lastAt : Int;
  };
  var usage : [(Principal, UsageStat)] = [];
  var earlyAccessCallCap : Nat = 0; // 0 = unlimited

  func getUsage(caller : Principal) : UsageStat {
    for ((k, v) in usage.vals()) { if (k == caller) { return v } };
    { conversations = 0; calls = 0; tokensOut = 0; cyclesCost = 0; lastAt = 0 };
  };
  func setUsage(caller : Principal, s : UsageStat) {
    let without = Array.filter<(Principal, UsageStat)>(usage, func((k, _)) { k != caller });
    usage := Array.append(without, [(caller, s)]);
  };
  func estTokens(text : Text) : Nat {
    var words = 0;
    for (w in Text.split(text, #char ' ')) { if (Text.size(w) > 0) { words += 1 } };
    words * 135 / 100;
  };

  // ----- monitoring log -----------------------------------------------------
  // A bounded ring buffer of failure events (model "not ready"/errors, trapped LLM calls, and
  // client-reported events), for admins to review after the fact. Pure buffer logic lives in
  // LogStore.mo (unit-tested); this actor only appends and serves them.
  let LOG_CAP : Nat = 1000; // oldest evicted beyond this
  var logs : [LogStore.LogEntry] = [];

  func logEvent(kind : Text, model : Text, p : Principal, status : Nat16, detail : Text) {
    logs := LogStore.pushBounded(
      logs,
      {
        at = Time.now();
        kind;
        model;
        principal = p;
        statusCode = status;
        detail = LogStore.truncate(detail, 500);
      },
      LOG_CAP,
    );
  };

  // ----- admin: LLM registry ------------------------------------------------
  public shared ({ caller }) func add_llm_canister(modelKey : Text, canisterId : Text) : async Result.Result<(), Text> {
    requireOps(caller);
    // One canister per model key, and one registration per canister.
    for ((k, id) in llmCanisters.vals()) {
      if (k == modelKey) { return #err("model already registered") };
      if (id == canisterId) { return #err("canister already registered") };
    };
    llmCanisters := Array.append(llmCanisters, [(modelKey, canisterId)]);
    #ok;
  };
  public shared ({ caller }) func remove_llm_canister(canisterId : Text) : async () {
    requireOps(caller);
    llmCanisters := Array.filter<(Text, Text)>(llmCanisters, func((_, id)) { id != canisterId });
  };
  public query ({ caller }) func get_llm_canisters() : async [(Text, Text)] {
    if (Principal.isAnonymous(caller) or not (isAdmin(caller) or Principal.isController(caller))) {
      return [];
    };
    llmCanisters;
  };

  /// The live cycle balance of each registered LLM (via the management canister's
  /// canister_status — this canister is a controller of each). Ops-only; also confirms
  /// the per-call cost measurement can read balances. (On a local replica cycles are
  /// not charged, so per-call deltas are 0 there; real on the IC.)
  public shared ({ caller }) func get_llm_balances() : async [Nat] {
    requireOps(caller);
    var out : [Nat] = [];
    var i = 0;
    while (i < llmCanisters.size()) {
      out := Array.append(out, [await llmBalance(i)]);
      i += 1;
    };
    out;
  };

  /// Verify the controller can reach every registered LLM (it is a controller of
  /// each, so check_access should return Ok). Admin-only.
  public shared ({ caller }) func checkAccessToLLMs() : async Result.Result<(), Text> {
    requireOps(caller);
    var i = 0;
    while (i < llmCanisters.size()) {
      try {
        switch (await llmActor(i).check_access()) {
          case (#Ok(_)) {};
          case (#Err(_)) { return #err("no access to " # llmCanisters[i].1) };
        };
      } catch (_) { return #err("call failed to " # llmCanisters[i].1) };
      i += 1;
    };
    #ok;
  };

  // ----- inference proxy (streaming preserved: one proxy call per LLM call) --
  public query func health() : async LlmTypes.StatusCodeRecordResult {
    if (llmCanisters.size() > 0) { #Ok({ status_code = 200 }) } else {
      #Err(#Other("no LLM configured"));
    };
  };

  public shared ({ caller }) func new_chat(model : Text, input : LlmTypes.InputRecord) : async LlmTypes.OutputRecordResultX {
    if (not isAllowed(caller)) {
      return errOut("Access denied - request early access");
    };
    if (llmCanisters.size() == 0) { return errOut("no LLM configured") };
    // Quota: block STARTING a new conversation once over the call budget (a reply
    // in progress is never cut off, since run_update is not quota-checked).
    if (earlyAccess and not isAdmin(caller) and earlyAccessCallCap > 0 and getUsage(caller).calls >= earlyAccessCallCap) {
      return errOut("You have reached your early-access usage limit.");
    };
    // Route to the canister serving the requested model, and pin the caller to it for
    // the rest of the conversation (run_update reuses the pin).
    let idx = switch (findLlmByModel(model)) {
      case (?i) { i };
      case null { return errOut("unknown model: " # model) };
    };
    setCallerLlm(caller, idx);
    let u = getUsage(caller);
    setUsage(caller, { u with conversations = u.conversations + 1; lastAt = Time.now() });
    // Bracket the LLM call with its live cycle balance (for exact cost) and the IC
    // system time (for exact duration) - both exclude the controller's own cost/time.
    let balBefore = await llmBalance(idx);
    let t0 = Time.now();
    let raw = try {
      await llmActor(idx).new_chat({ args = rewriteCachePath(input.args, caller) });
    } catch (e) {
      logEvent("call_failed", model, caller, 503, Error.message(e));
      return errOutCode("LLM call failed: " # Error.message(e), 503);
    };
    let t1 = Time.now();
    let balAfter = await llmBalance(idx);
    switch (raw) {
      case (#Err(o)) { logEvent("llm_err", model, caller, o.status_code, o.error) };
      case (#Ok(_)) {};
    };
    xify(raw, costOf(balBefore, balAfter), durOf(t0, t1));
  };

  public shared ({ caller }) func run_update(input : LlmTypes.InputRecord) : async LlmTypes.OutputRecordResultX {
    if (not isAllowed(caller)) {
      return errOut("Access denied - request early access");
    };
    let idx = getCallerLlm(caller);
    if (idx >= llmCanisters.size()) {
      return errOut("session LLM unavailable - start a new chat");
    };
    let balBefore = await llmBalance(idx);
    let t0 = Time.now();
    let raw = try {
      await llmActor(idx).run_update({ args = rewriteCachePath(input.args, caller) });
    } catch (e) {
      logEvent("call_failed", llmCanisters[idx].0, caller, 503, Error.message(e));
      return errOutCode("LLM call failed: " # Error.message(e), 503);
    };
    let t1 = Time.now();
    let balAfter = await llmBalance(idx);
    let cost = costOf(balBefore, balAfter);
    let durNs = durOf(t0, t1);
    // Meter: count the call, est. generated tokens, and accrue exact cycles.
    let u = getUsage(caller);
    let tok = switch (raw) {
      case (#Ok(o)) { estTokens(o.output) };
      case (#Err(o)) {
        logEvent("llm_err", llmCanisters[idx].0, caller, o.status_code, o.error);
        0;
      };
    };
    setUsage(
      caller,
      {
        u with calls = u.calls + 1;
        tokensOut = u.tokensOut + tok;
        cyclesCost = u.cyclesCost + cost;
        lastAt = Time.now();
      },
    );
    xify(raw, cost, durNs);
  };

  // ----- LLM-as-judge (Prompt Cost Lab quality signal) ----------------------
  // Free DFINITY LLM model (0 cycles attached; see mo:llm FREE_MODELS). Advisory:
  // Qwen3-32B exposes no temperature/seed, so a single score is noisy - we average
  // JUDGE_SAMPLES runs. Byte caps keep reply+rubric under the canister's 10 KiB request
  // limit. Pure parsing/averaging/truncation live in Judge.mo (unit-tested).
  let JUDGE_MODEL : Text = "qwen3:32b";
  let JUDGE_SAMPLES : Nat = 3;
  let JUDGE_REPLY_CAP : Nat = 6000; // UTF-8 bytes
  let JUDGE_RUBRIC_CAP : Nat = 3000; // UTF-8 bytes

  public type JudgeOutput = {
    score : Nat; // averaged 0..100
    samples : [Nat]; // per-run parsed scores (may be fewer than JUDGE_SAMPLES)
    note : Text; // last raw judge output (advisory; may include reasoning)
  };

  /// Score how well `reply` satisfies `rubric` on 0..100, using the free on-chain
  /// DFINITY LLM canister (Qwen3-32B). Gated on early-access (same as inference), not
  /// admin-only, so any Lab user can grade. Averages JUDGE_SAMPLES runs; returns #err
  /// if the model never produced a parseable score or the call failed.
  public shared ({ caller }) func judge(reply : Text, rubric : Text) : async Result.Result<JudgeOutput, Text> {
    if (not isAllowed(caller)) {
      return #err("Access denied - request early access");
    };
    let sys = "You are a strict evaluator. Score how well the ANSWER satisfies the RUBRIC on a scale from 0 to 100, where 0 is total failure and 100 is perfect. Respond with ONLY a single integer between 0 and 100 - no words, no punctuation, no explanation.\nRUBRIC:\n" # Judge.truncateBytes(rubric, JUDGE_RUBRIC_CAP);
    let usr = "ANSWER:\n" # Judge.truncateBytes(reply, JUDGE_REPLY_CAP);
    var samples : [Nat] = [];
    var lastRaw : Text = "";
    var i = 0;
    while (i < JUDGE_SAMPLES) {
      let raw = try {
        let resp = await LLM.chat(JUDGE_MODEL).withMessages([
          #system_({ content = sys }),
          #user({ content = usr }),
        ]).send();
        switch (resp.message.content) { case (?t) { t }; case null { "" } };
      } catch (e) { return #err("LLM judge call failed: " # Error.message(e)) };
      lastRaw := raw;
      switch (Judge.parseScore(raw)) {
        case (?s) { samples := Array.append(samples, [Judge.clamp100(s)]) };
        case null {};
      };
      i += 1;
    };
    switch (Judge.average(samples)) {
      case (?avg) { #ok({ score = avg; samples = samples; note = lastRaw }) };
      case null {
        #err("judge produced no parseable score; last output: " # lastRaw);
      };
    };
  };

  // ----- admin: usage -------------------------------------------------------
  public query ({ caller }) func listUsage() : async [UsageInfo] {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) { return [] };
    Array.map<(Principal, UsageStat), UsageInfo>(
      usage,
      func((p, s)) {
        {
          principal = p;
          conversations = s.conversations;
          calls = s.calls;
          tokensOut = s.tokensOut;
          cyclesCost = s.cyclesCost;
          lastAt = s.lastAt;
        };
      },
    );
  };

  public query ({ caller }) func getEarlyAccessCallCap() : async Nat {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) { return 0 };
    earlyAccessCallCap;
  };
  public shared ({ caller }) func setEarlyAccessCallCap(n : Nat) : async () {
    requireAdmin(caller);
    earlyAccessCallCap := n;
  };

  // ----- monitoring log: review + client report -----------------------------
  /// Admins review recent failure events. `limit == 0` returns all (bounded to LOG_CAP);
  /// otherwise the most recent `limit`, newest last. Non-admins get an empty list.
  public query ({ caller }) func getLogs(limit : Nat) : async [LogStore.LogEntry] {
    if (Principal.isAnonymous(caller) or not isAdmin(caller)) { return [] };
    LogStore.lastN(logs, limit);
  };

  /// Any allowed (signed-in) user reports a client-side event the canister cannot otherwise see
  /// (e.g. a transient network error that exhausted the frontend's retries and never reached a
  /// method here). Bounded: the ring buffer caps total entries; kind/detail are truncated.
  public shared ({ caller }) func logClientEvent(kind : Text, detail : Text) : async () {
    if (not isAllowed(caller)) { return };
    logEvent("client:" # LogStore.truncate(kind, 64), "", caller, 0, detail);
  };

  // ----- Prompt Cost Lab: per-principal persisted state ---------------------
  // The Lab's run history + current report + editor setup, stored on-chain per caller as
  // one opaque JSON blob (the frontend owns the shape - see common/labState.js). Makes the
  // Lab durable across logout / reload / new device, keyed by principal (no cross-user leak).
  // Bounded per user (the frontend also caps the stored run history); linear array like the
  // other per-principal state above (whitelist/usage), stable in this persistent actor.
  let MAX_LAB_STATE_CHARS : Nat = 200_000;
  var labState : [(Principal, Text)] = []; // (principal, JSON blob)

  func findLabState(caller : Principal) : ?Text {
    for ((k, v) in labState.vals()) { if (k == caller) { return ?v } };
    null;
  };

  /// Save the caller's Lab state (opaque JSON). Allowed (signed-in early-access) users
  /// only - the same gate as running the Lab. Oversize returns a clean #err (never traps).
  public shared ({ caller }) func saveLabState(state : Text) : async Result.Result<(), Text> {
    if (not isAllowed(caller)) { return #err("Access denied - request early access") };
    if (Text.size(state) > MAX_LAB_STATE_CHARS) { return #err("lab state too large") };
    let without = Array.filter<(Principal, Text)>(labState, func((k, _)) { k != caller });
    labState := Array.append(without, [(caller, state)]);
    #ok;
  };

  /// The caller's saved Lab state, or null if none. Non-anonymous only (own state).
  public query ({ caller }) func getLabState() : async ?Text {
    if (Principal.isAnonymous(caller)) { return null };
    findLabState(caller);
  };

  /// Drop the caller's saved Lab state (the Compare-table "Clear" also clears the server copy).
  public shared ({ caller }) func clearLabState() : async () {
    if (Principal.isAnonymous(caller)) { return };
    labState := Array.filter<(Principal, Text)>(labState, func((k, _)) { k != caller });
  };
};
