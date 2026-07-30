// Unit tests for the pure LLM-as-judge logic (src/backend/Judge.mo). Run with
// `mops test`. The live LLM call in main.mo's `judge` is exercised separately against
// the real DFINITY LLM canister (never mocked); here we lock down the deterministic
// parsing / truncation / averaging that wrap it.
import { test } "mo:test";
import Text "mo:base/Text";
import Judge "../src/backend/Judge";

// ----- parseScore ----------------------------------------------------------
test(
  "parseScore: bare integer",
  func() { assert Judge.parseScore("85") == ?85 },
);
test(
  "parseScore: labelled score",
  func() { assert Judge.parseScore("Score: 7") == ?7 },
);
test(
  "parseScore: '85 out of 100' takes the first valid score, not 100",
  func() { assert Judge.parseScore("85 out of 100") == ?85 },
);
test(
  "parseScore: skips out-of-range runs",
  func() { assert Judge.parseScore("about 250, so I'd say 90") == ?90 },
);
test(
  "parseScore: 0 is valid",
  func() { assert Judge.parseScore("0") == ?0 },
);
test(
  "parseScore: 100 is valid",
  func() { assert Judge.parseScore("100") == ?100 },
);
test(
  "parseScore: leading zeros",
  func() { assert Judge.parseScore("07") == ?7 },
);
test(
  "parseScore: no digits -> null",
  func() { assert Judge.parseScore("N/A") == null },
);
test(
  "parseScore: empty -> null",
  func() { assert Judge.parseScore("") == null },
);
test(
  "parseScore: all runs out of range -> null",
  func() { assert Judge.parseScore("values 250 and 999") == null },
);
test(
  "parseScore: trailing number at end of text",
  func() { assert Judge.parseScore("final rating 42") == ?42 },
);

// ----- clamp100 ------------------------------------------------------------
test(
  "clamp100: in range unchanged",
  func() { assert Judge.clamp100(73) == 73 },
);
test(
  "clamp100: caps at 100",
  func() { assert Judge.clamp100(140) == 100 },
);
test(
  "clamp100: boundary",
  func() { assert Judge.clamp100(100) == 100 },
);

// ----- average -------------------------------------------------------------
test(
  "average: empty -> null",
  func() { assert Judge.average([]) == null },
);
test(
  "average: single",
  func() { assert Judge.average([80]) == ?80 },
);
test(
  "average: exact mean",
  func() { assert Judge.average([80, 90, 100]) == ?90 },
);
test(
  "average: rounds half up",
  func() { assert Judge.average([80, 81]) == ?81 }, // 80.5 -> 81
);
test(
  "average: rounds down below half",
  func() { assert Judge.average([80, 80, 81]) == ?80 }, // 80.33 -> 80
);

// ----- truncateBytes -------------------------------------------------------
test(
  "truncateBytes: short text unchanged",
  func() { assert Judge.truncateBytes("hello", 100) == "hello" },
);
test(
  "truncateBytes: caps ASCII at byte budget",
  func() { assert Judge.truncateBytes("abcdef", 3) == "abc" },
);
test(
  "truncateBytes: zero budget -> empty",
  func() { assert Judge.truncateBytes("abc", 0) == "" },
);
test(
  "truncateBytes: never splits a multi-byte code point",
  func() {
    // "é" is 2 UTF-8 bytes; with a 1-byte budget it must be dropped entirely.
    assert Judge.truncateBytes("é", 1) == "";
    // with a 2-byte budget it fits.
    assert Judge.truncateBytes("é", 2) == "é";
  },
);
test(
  "truncateBytes: result stays within the byte budget",
  func() {
    let s = "aéb"; // 1 + 2 + 1 = 4 bytes
    let out = Judge.truncateBytes(s, 3); // "aé" = 3 bytes, "b" would overflow
    assert out == "aé";
    assert Text.encodeUtf8(out).size() <= 3;
  },
);
