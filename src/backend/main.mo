import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Bootstrap "Bootstrap";

// ICGPT admin & access-control canister.
//
// Powers a gated early-access period: while `earlyAccess` is true, only admins +
// whitelisted principals are `allowed`; everyone else can submit an email request
// that an admin approves onto the whitelist. Flipping `earlyAccess` off opens it to
// all. The frontend enforces the gate on this canister's answer (myAccess); admin
// methods are gated in-canister (requireAdmin) so they can't be called by non-admins.
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
};
