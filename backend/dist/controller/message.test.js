import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUsername, parseMessageInput } from "./message.js";
test("normalizes usernames and rejects invalid lengths or control characters", () => {
    assert.equal(normalizeUsername("  Alex  "), "Alex");
    assert.equal(normalizeUsername("   "), null);
    assert.equal(normalizeUsername("a".repeat(33)), null);
    assert.equal(normalizeUsername("al\nex"), null);
});
test("trims and validates chat message input", () => {
    assert.deepEqual(parseMessageInput({ username: " Alex ", message: " hello " }), {
        username: "Alex",
        message: "hello",
    });
    assert.equal(parseMessageInput({ username: "Alex", message: " " }), null);
    assert.equal(parseMessageInput({ username: "Alex", message: "x".repeat(2001) }), null);
    assert.equal(parseMessageInput(null), null);
});
//# sourceMappingURL=message.test.js.map