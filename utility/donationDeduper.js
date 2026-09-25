import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const DEFAULT_CLAIMS_DIR = path.join("transaction", "claims");

function normalizeTransactionId(transactionId) {
  const normalized = String(transactionId ?? "").trim();
  if (!normalized) {
    throw new TypeError("Donation transaction ID is required");
  }
  return normalized;
}

function claimFileName(transactionId) {
  return `${crypto.createHash("sha256").update(transactionId).digest("hex")}.json`;
}

/**
 * Atomically claims a provider transaction before any external side effect.
 * `open(..., "wx")` lets only one concurrent poller create the durable claim.
 * The claims directory is inside the existing persistent transaction volume,
 * so a container restart cannot deliver the same donation again.
 */
export async function claimDonationTransaction(
  transactionId,
  { claimsDir = DEFAULT_CLAIMS_DIR, claimedAt = new Date() } = {},
) {
  const id = normalizeTransactionId(transactionId);
  await fs.mkdir(claimsDir, { recursive: true });

  const claimPath = path.join(claimsDir, claimFileName(id));
  let handle;

  try {
    handle = await fs.open(claimPath, "wx", 0o600);
    await handle.writeFile(
      `${JSON.stringify({ transactionId: id, claimedAt: claimedAt.toISOString() })}\n`,
      "utf8",
    );
    await handle.sync();
    return { claimed: true, claimPath };
  } catch (error) {
    if (error?.code === "EEXIST") {
      return { claimed: false, claimPath };
    }
    throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}
