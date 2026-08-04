// Pure, testable logic for the icgpt_admin monitoring log (see `logs`/`logEvent`/`getLogs`
// in main.mo). Kept out of the actor so `mo:test` can unit-test the ring-buffer bounding and
// the UTF-8-safe truncation directly. No side effects, no actor state.
import Array "mo:base/Array";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Nat32 "mo:base/Nat32";

module LogStore {
  // One monitoring event. `kind` classifies it ("llm_err", "call_failed", "client:<x>"), `model`
  // is the model key (or "" for client events), `statusCode` is the llama HTTP-ish status (0 when
  // n/a), `detail` is the (truncated) error message, `at` is Time.now() nanoseconds.
  public type LogEntry = {
    at : Int;
    kind : Text;
    model : Text;
    principal : Principal;
    statusCode : Nat16;
    detail : Text;
  };

  /// Append `e` to `buf`, keeping only the most recent `cap` entries (a bounded ring buffer,
  /// oldest evicted first). `cap == 0` disables the log (returns empty).
  public func pushBounded(buf : [LogEntry], e : LogEntry, cap : Nat) : [LogEntry] {
    if (cap == 0) { return [] };
    let appended = Array.append(buf, [e]);
    let n = appended.size();
    if (n <= cap) { appended } else { Array.subArray(appended, n - cap, cap) };
  };

  /// The last `n` entries of `buf` (all of them when `n == 0` or `n >= size`). Newest last,
  /// preserving insertion order.
  public func lastN(buf : [LogEntry], n : Nat) : [LogEntry] {
    let sz = buf.size();
    if (n == 0 or n >= sz) { buf } else { Array.subArray(buf, sz - n, n) };
  };

  // UTF-8 byte length of a single code point.
  func charBytes(c : Char) : Nat {
    let u = Char.toNat32(c);
    if (u < 0x80) { 1 } else if (u < 0x800) { 2 } else if (u < 0x10000) { 3 } else {
      4;
    };
  };

  /// Truncate `t` so its UTF-8 encoding is at most `maxBytes`, never splitting a code point.
  /// Detail strings come from untrusted/arbitrary error text, so they are bounded before storage.
  public func truncate(t : Text, maxBytes : Nat) : Text {
    var used = 0;
    var out = "";
    for (c in t.chars()) {
      let b = charBytes(c);
      if (used + b > maxBytes) { return out };
      out #= Text.fromChar(c);
      used += b;
    };
    out;
  };
};
