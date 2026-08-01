import test from "ava";
import { randomUUID } from "node:crypto";
import { connect } from "@tursodatabase/serverless";
import { resolve } from "../src/index.ts";
import { deleteDb, hasCredentials } from "./utils.ts";

// Conformance test against the real Turso API. Skipped automatically
// unless TURSO_API_TOKEN, TURSO_ORG, and TURSO_GROUP are set (see .env.example).
const conformanceTest = hasCredentials ? test : test.skip;

conformanceTest("provisions a database lazily and reuses it on reopen", async (t) => {
  const name = `conformance-${randomUUID().slice(0, 8)}`;
  t.teardown(() => deleteDb(name));

  // The first resolve provisions the database; write some data through the
  // serverless driver, then drop the connection.
  const first = connect(await resolve(name));
  await first.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE
    )
  `);
  await first.run("INSERT INTO users (name, email) VALUES (?, ?)", "Alice", "alice@example.com");
  await first.close();

  // Resolving again must point at the same database, not provision a fresh
  // one: the data written above is still there.
  const second = connect(await resolve(name));
  const users = await second.all("SELECT id, name, email FROM users");
  await second.close();

  t.deepEqual(users, [{ id: 1, name: "Alice", email: "alice@example.com" }]);
});
