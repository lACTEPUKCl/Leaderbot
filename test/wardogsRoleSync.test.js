import assert from "node:assert/strict";
import test from "node:test";
import { syncWardogsRole, startWardogsRoleSync, WARDOGS } from "../utility/wardogsRoleSync.js";

const logger = { log() {}, error() {} };
function fixture({ reactions = [{ emoji: { id: "77", name: "wardogs" } }], pages = [[{ id: "1" }]], failMembers = false } = {}) {
  const changes = [];
  const requests = [];
  const members = new Map([...["1", "2", "3"]].map(id => [id, {
    id,
    roles: {
      cache: new Map(id === "2" ? [[WARDOGS.roleId, {}]] : []),
      async add(role) { changes.push(["add", id, role]); this.cache.set(role, {}); },
      async remove(role) { changes.push(["remove", id, role]); this.cache.delete(role); },
    },
  }]));
  const guild = {
    roles: { fetch: async () => ({ editable: true }) },
    members: { fetch: async () => {
      if (failMembers) throw new Error("members timeout");
      return members;
    } },
  };
  const client = {
    channels: { fetch: async () => ({ guild }) },
    rest: { get: async (route, options) => {
      if (!options) return { reactions };
      requests.push(Object.fromEntries(options.query));
      const page = pages.shift();
      if (page instanceof Error) throw page;
      return page ?? [];
    } },
  };
  return { client, changes, requests, members };
}

test("adds missing role and preserves existing roles without reactions", async () => {
  const f = fixture();
  assert.deepEqual(await syncWardogsRole(f.client, logger), { added: 1, removed: 0, failed: 0 });
  assert.deepEqual(f.changes, [["add", "1", WARDOGS.roleId]]);
});

test("all reaction pages are read, including Super Reactions", async () => {
  const f = fixture({
    reactions: [{ emoji: { id: "77", name: "wardogs" }, count_details: { burst: 1 } }],
    pages: [Array.from({ length: 100 }, (_, i) => ({ id: String(i + 10) })), [{ id: "1" }], [{ id: "2" }]],
  });
  await syncWardogsRole(f.client, logger);
  assert.deepEqual(f.requests, [
    { limit: "100", type: "0" },
    { limit: "100", type: "0", after: "109" },
    { limit: "100", type: "1" },
  ]);
  assert.deepEqual(f.changes, [["add", "1", WARDOGS.roleId]]);
});

test("absent wardogs reaction preserves existing roles", async () => {
  const f = fixture({ reactions: [{ emoji: { id: "88", name: "other" } }] });
  await syncWardogsRole(f.client, logger);
  assert.deepEqual(f.changes, []);
  assert.equal(f.requests.length, 0);
});

test("failed reaction or member fetch never changes roles", async () => {
  for (const options of [{ pages: [new Error("Discord unavailable")] }, { failMembers: true }]) {
    const f = fixture(options);
    await assert.rejects(syncWardogsRole(f.client, logger));
    assert.deepEqual(f.changes, []);
  }
});

test("member failure is reported without removing existing roles", async () => {
  const f = fixture();
  f.members.get("1").roles.add = async () => { throw new Error("forbidden"); };
  assert.deepEqual(await syncWardogsRole(f.client, logger), { added: 0, removed: 0, failed: 1 });
});

test("startup is immediate and repeated ready events reuse the minute timer", async () => {
  const f = fixture();
  const timer = startWardogsRoleSync(f.client, logger);
  try {
    assert.equal(startWardogsRoleSync(f.client, logger), timer);
    assert.equal(timer._idleTimeout, 60_000);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.changes.length, 1);
  } finally {
    clearInterval(timer);
  }
});
