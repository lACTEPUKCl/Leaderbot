import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";

import { claimDonationTransaction } from "../utility/donationDeduper.js";

async function withClaimsDir(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "leaderbot-dedupe-"));
  try {
    await run(path.join(root, "claims"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("one provider transaction notifies exactly once across repeated polls", async () => {
  await withClaimsDir(async (claimsDir) => {
    const notifications = [];
    const poll = async () => {
      const result = await claimDonationTransaction("35853647", { claimsDir });
      if (result.claimed) notifications.push("35853647");
    };

    await poll();
    await poll();
    await poll();

    assert.deepEqual(notifications, ["35853647"]);
  });
});

test("atomic claim permits only one parallel poller", async () => {
  await withClaimsDir(async (claimsDir) => {
    const attempts = await Promise.all(
      Array.from({ length: 16 }, () =>
        claimDonationTransaction("35853647", { claimsDir }),
      ),
    );

    assert.equal(attempts.filter((attempt) => attempt.claimed).length, 1);
  });
});

test("claim survives a restart and a new transaction still passes", async () => {
  await withClaimsDir(async (claimsDir) => {
    assert.equal(
      (await claimDonationTransaction("35853647", { claimsDir })).claimed,
      true,
    );

    // A new call has no in-memory state, just like a freshly started process.
    assert.equal(
      (await claimDonationTransaction("35853647", { claimsDir })).claimed,
      false,
    );
    assert.equal(
      (await claimDonationTransaction("35853648", { claimsDir })).claimed,
      true,
    );
  });
});

test("different real transactions are never collapsed by donor or amount", async () => {
  await withClaimsDir(async (claimsDir) => {
    const first = await claimDonationTransaction("provider-a", { claimsDir });
    const second = await claimDonationTransaction("provider-b", { claimsDir });

    assert.equal(first.claimed, true);
    assert.equal(second.claimed, true);
  });
});
