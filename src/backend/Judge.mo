// Pure, testable logic for the LLM-as-judge (see `judge` in main.mo). Kept out of the
// actor so `mo:test` can unit-test truncation, score parsing, and averaging directly
// (the live LLM call itself is exercised end-to-end against the real DFINITY LLM
// canister, never mocked). No side effects, no actor state.
import Text "mo:base/Text";
import Char "mo:base/Char";
import Nat32 "mo:base/Nat32";

module Judge {
  // UTF-8 byte length of a single code point.
  func charBytes(c : Char) : Nat {
    let u = Char.toNat32(c);
    if (u < 0x80) { 1 } else if (u < 0x800) { 2 } else if (u < 0x10000) { 3 } else {
      4;
    };
  };

  /// Truncate `t` so its UTF-8 encoding is at most `maxBytes`, never splitting a code
  /// point. The DFINITY LLM canister caps a request at 10 KiB across all messages, so
  /// the judge trims the (untrusted, possibly long) reply + rubric before sending.
  public func truncateBytes(t : Text, maxBytes : Nat) : Text {
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

  /// Extract the first integer in [0,100] from arbitrary judge output; null if none.
  /// The model has no JSON mode, so its answer is free text ("85", "Score: 7",
  /// "85 out of 100", possibly wrapped in reasoning). We scan maximal digit runs and
  /// return the first whose value is a valid 0..100 score, skipping out-of-range runs
  /// like the "100" in "85 out of 100" or a stray "250".
  public func parseScore(t : Text) : ?Nat {
    var cur : ?Nat = null; // value of the current digit run, or null when not in a run
    for (c in t.chars()) {
      let u = Char.toNat32(c);
      if (u >= 48 and u <= 57) {
        let d = Nat32.toNat(u - 48);
        cur := ?(
          switch (cur) { case (?v) { v * 10 + d }; case null { d } }
        );
      } else {
        switch (cur) { case (?v) { if (v <= 100) { return ?v } }; case null {} };
        cur := null;
      };
    };
    switch (cur) { case (?v) { if (v <= 100) { return ?v } }; case null {} };
    null;
  };

  /// Clamp a raw score into the valid 0..100 range.
  public func clamp100(n : Nat) : Nat { if (n > 100) { 100 } else { n } };

  /// Round-half-up mean of the sample scores; null if there are no samples. The judge
  /// averages several runs because the model exposes no temperature/seed control, so a
  /// single score is noisy and the average is advisory.
  public func average(scores : [Nat]) : ?Nat {
    let n = scores.size();
    if (n == 0) { return null };
    var sum = 0;
    for (s in scores.vals()) { sum += s };
    ?((2 * sum + n) / (2 * n));
  };
};
