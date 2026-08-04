// Unit tests for the pure log-buffer logic (LogStore.mo). The live logging path (logEvent
// wired into new_chat/run_update, getLogs gating) is exercised by the local smoketest, not here.
import { test } "mo:test";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import LogStore "../src/backend/LogStore";

let p = Principal.fromText("2vxsx-fae"); // anonymous principal (any valid principal works)

func mk(kind : Text) : LogStore.LogEntry {
  { at = 0; kind; model = ""; principal = p; statusCode = 0; detail = "" };
};

test(
  "pushBounded: under cap keeps all, in insertion order",
  func() {
    let buf = LogStore.pushBounded(LogStore.pushBounded([], mk("a"), 5), mk("b"), 5);
    assert buf.size() == 2;
    assert buf[0].kind == "a";
    assert buf[1].kind == "b";
  },
);

test(
  "pushBounded: over cap evicts oldest (ring buffer)",
  func() {
    var buf : [LogStore.LogEntry] = [];
    buf := LogStore.pushBounded(buf, mk("a"), 2);
    buf := LogStore.pushBounded(buf, mk("b"), 2);
    buf := LogStore.pushBounded(buf, mk("c"), 2);
    assert buf.size() == 2;
    assert buf[0].kind == "b"; // "a" evicted
    assert buf[1].kind == "c";
  },
);

test(
  "pushBounded: cap 0 disables the log",
  func() {
    assert LogStore.pushBounded([mk("a")], mk("b"), 0).size() == 0;
  },
);

test(
  "lastN: most recent n, newest last; 0 or >=size = all",
  func() {
    var buf : [LogStore.LogEntry] = [];
    buf := LogStore.pushBounded(buf, mk("a"), 10);
    buf := LogStore.pushBounded(buf, mk("b"), 10);
    buf := LogStore.pushBounded(buf, mk("c"), 10);
    let last2 = LogStore.lastN(buf, 2);
    assert last2.size() == 2;
    assert last2[0].kind == "b";
    assert last2[1].kind == "c";
    assert LogStore.lastN(buf, 0).size() == 3;
    assert LogStore.lastN(buf, 99).size() == 3;
  },
);

test(
  "truncate: bounds UTF-8 bytes without splitting a code point",
  func() {
    assert LogStore.truncate("hello", 3) == "hel";
    assert LogStore.truncate("hello", 99) == "hello";
    // "é" is 2 UTF-8 bytes: a 1-byte budget must drop it entirely, never split it.
    assert LogStore.truncate("é", 1) == "";
    assert LogStore.truncate("aé", 2) == "a";
    assert Text.encodeUtf8(LogStore.truncate("héllo", 4)).size() <= 4;
  },
);
