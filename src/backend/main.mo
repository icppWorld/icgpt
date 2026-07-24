import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Bootstrap "Bootstrap";
import LlmTypes "LlmTypes";

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

  /// A signed-in, not-yet-allowed caller requests access with a contact email. An
  /// admin later approves it onto the whitelist. Bounded to protect stable memory.
  public shared ({ caller }) func requestAccess(email : Text) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) { return #err("sign in first") };
    if (isAdmin(caller) or hasKey(whitelist, caller)) {
      return #err("you already have access");
    };
    if (Text.size(email) > 200) { return #err("email too long (max 200 chars)") };
    if (not hasKey(requests, caller) and requests.size() >= 5000) {
      return #err("the request list is full - please contact the team directly");
    };
    requests := upsertEntry(requests, caller, { email; note = ""; at = Time.now() });
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

  // Registered LLM canister ids (stable). Actor refs are created on demand -
  // cheap, and avoids a transient Buffer + upgrade hooks.
  var llmCanisterIds : [Text] = [];
  var roundRobinIndex : Nat = 0;
  // A conversation must stay on ONE LLM (its prompt cache lives there), so pin each
  // caller to the LLM chosen at new_chat; run_update reuses it. (1 LLM => always 0.)
  var callerLlm : [(Principal, Nat)] = [];

  func llmActor(idx : Nat) : LlmTypes.LLMCanister {
    actor (llmCanisterIds[idx]);
  };
  func getCallerLlm(caller : Principal) : Nat {
    for ((k, v) in callerLlm.vals()) { if (k == caller) { return v } };
    0;
  };
  func setCallerLlm(caller : Principal, idx : Nat) {
    let without = Array.filter<(Principal, Nat)>(callerLlm, func((k, _)) { k != caller });
    callerLlm := Array.append(without, [(caller, idx)]);
  };
  func pickLlmForNewChat(caller : Principal) : Nat {
    let n = llmCanisterIds.size();
    let idx = if (n == 0) { 0 } else { roundRobinIndex % n };
    roundRobinIndex += 1;
    setCallerLlm(caller, idx);
    idx;
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

  func errOut(msg : Text) : LlmTypes.OutputRecordResult {
    #Err({
      status_code = 403;
      output = "";
      conversation = "";
      error = msg;
      prompt_remaining = "";
      generated_eog = true;
    });
  };

  // ----- usage metering -----------------------------------------------------
  type UsageStat = {
    conversations : Nat;
    calls : Nat;
    tokensOut : Nat;
    lastAt : Int;
  };
  type UsageInfo = {
    principal : Principal;
    conversations : Nat;
    calls : Nat;
    tokensOut : Nat;
    lastAt : Int;
  };
  var usage : [(Principal, UsageStat)] = [];
  var earlyAccessCallCap : Nat = 0; // 0 = unlimited

  func getUsage(caller : Principal) : UsageStat {
    for ((k, v) in usage.vals()) { if (k == caller) { return v } };
    { conversations = 0; calls = 0; tokensOut = 0; lastAt = 0 };
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

  // ----- admin: LLM registry ------------------------------------------------
  public shared ({ caller }) func add_llm_canister(canisterId : Text) : async Result.Result<(), Text> {
    requireOps(caller);
    if (Array.find<Text>(llmCanisterIds, func(id) { id == canisterId }) != null) {
      return #err("already registered");
    };
    llmCanisterIds := Array.append(llmCanisterIds, [canisterId]);
    #ok;
  };
  public shared ({ caller }) func remove_llm_canister(canisterId : Text) : async () {
    requireOps(caller);
    llmCanisterIds := Array.filter<Text>(llmCanisterIds, func(id) { id != canisterId });
  };
  public query ({ caller }) func get_llm_canisters() : async [Text] {
    if (Principal.isAnonymous(caller) or not (isAdmin(caller) or Principal.isController(caller))) {
      return [];
    };
    llmCanisterIds;
  };

  /// Verify the controller can reach every registered LLM (it is a controller of
  /// each, so check_access should return Ok). Admin-only.
  public shared ({ caller }) func checkAccessToLLMs() : async Result.Result<(), Text> {
    requireOps(caller);
    var i = 0;
    while (i < llmCanisterIds.size()) {
      try {
        switch (await llmActor(i).check_access()) {
          case (#Ok(_)) {};
          case (#Err(_)) { return #err("no access to " # llmCanisterIds[i]) };
        };
      } catch (_) { return #err("call failed to " # llmCanisterIds[i]) };
      i += 1;
    };
    #ok;
  };

  // ----- inference proxy (streaming preserved: one proxy call per LLM call) --
  public query func health() : async LlmTypes.StatusCodeRecordResult {
    if (llmCanisterIds.size() > 0) { #Ok({ status_code = 200 }) } else {
      #Err(#Other("no LLM configured"));
    };
  };

  public shared ({ caller }) func new_chat(input : LlmTypes.InputRecord) : async LlmTypes.OutputRecordResult {
    if (not isAllowed(caller)) {
      return errOut("Access denied - request early access");
    };
    if (llmCanisterIds.size() == 0) { return errOut("no LLM configured") };
    // Quota: block STARTING a new conversation once over the call budget (a reply
    // in progress is never cut off, since run_update is not quota-checked).
    if (earlyAccess and not isAdmin(caller) and earlyAccessCallCap > 0 and getUsage(caller).calls >= earlyAccessCallCap) {
      return errOut("You have reached your early-access usage limit.");
    };
    let idx = pickLlmForNewChat(caller);
    let u = getUsage(caller);
    setUsage(caller, { u with conversations = u.conversations + 1; lastAt = Time.now() });
    try {
      await llmActor(idx).new_chat({ args = rewriteCachePath(input.args, caller) });
    } catch (e) { errOut("LLM call failed: " # Error.message(e)) };
  };

  public shared ({ caller }) func run_update(input : LlmTypes.InputRecord) : async LlmTypes.OutputRecordResult {
    if (not isAllowed(caller)) {
      return errOut("Access denied - request early access");
    };
    let idx = getCallerLlm(caller);
    if (idx >= llmCanisterIds.size()) {
      return errOut("session LLM unavailable - start a new chat");
    };
    let result = try {
      await llmActor(idx).run_update({ args = rewriteCachePath(input.args, caller) });
    } catch (e) { return errOut("LLM call failed: " # Error.message(e)) };
    // Meter: count the call + estimate generated tokens from the output text.
    let u = getUsage(caller);
    let tok = switch (result) {
      case (#Ok(o)) { estTokens(o.output) };
      case (#Err(_)) { 0 };
    };
    setUsage(caller, { u with calls = u.calls + 1; tokensOut = u.tokensOut + tok; lastAt = Time.now() });
    result;
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
};
