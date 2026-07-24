import Principal "mo:base/Principal";
import Array "mo:base/Array";

module {
  // Hardcoded founding admins for the ICGPT early-access gate.
  //
  // Internet Identity principals are derived per origin, so the principal you get
  // logging into THIS app's frontend differs from a CLI identity, and the local
  // and mainnet principals differ too. To grant admin: log in, copy the principal
  // shown on the access screen (or the browser console), add it below as
  // (principal-text, who), and redeploy.
  //
  // Stored as text and parsed lazily inside isBootstrap: Principal.fromText is a
  // non-static expression, so it must NOT run at module/actor init time.
  let BOOTSTRAP : [(Text, Text)] = [
    // Local dev: anchor 10000 on the localhost:8081 frontend origin.
    ("w2swp-bl5fj-ay66d-joixu-igewj-vyll3-wquab-sardq-v4j73-tucsm-7qe", "icpp local anchor 10000 (localhost:8081)"),
    // Mainnet: add the icgpt.onicai.com II principal here at deploy time.
  ];

  // A hardcoded entry that is not yet a real principal (placeholder). We skip it in
  // isBootstrap/list so an unfilled slot can't trap Principal.fromText.
  func isFilled(t : Text) : Bool {
    t.size() > 0 and t.chars().next() != ?'_';
  };

  public func isBootstrap(p : Principal) : Bool {
    for ((t, _) in BOOTSTRAP.vals()) {
      if (isFilled(t) and Principal.fromText(t) == p) { return true };
    };
    false;
  };

  public func list() : [(Principal, Text)] {
    let filled = Array.filter<(Text, Text)>(BOOTSTRAP, func((t, _)) { isFilled(t) });
    Array.map<(Text, Text), (Principal, Text)>(filled, func((t, w)) { (Principal.fromText(t), w) });
  };
};
