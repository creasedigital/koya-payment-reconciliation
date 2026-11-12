// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts can be numbers or strings with thousands separators, e.g. "4,804.15".
function parseAmount(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, "").trim());
}

// Keep only the latest attempt (by timestamp) for each txn_id.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (const line of lines) {
  if (line.trim().length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line
  }

  if (event === null || typeof event !== "object" || !event.txn_id) continue;

  const time = Date.parse(event.ts);
  if (Number.isNaN(time)) continue;

  const current = latest.get(event.txn_id);
  if (!current || time > current.time) {
    latest.set(event.txn_id, { time, event });
  }
}

let total = 0;
let count = 0;

for (const { event } of latest.values()) {
  if (event.status === "success") {
    total += parseAmount(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
