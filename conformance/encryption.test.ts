import test from "ava";
import { randomBytes, randomUUID } from "node:crypto";
import { connect } from "@tursodatabase/serverless";
import { resolve } from "../src/index.ts";
import { deleteDb, hasCredentials } from "./utils.ts";

// Encryption conformance tests. Skipped automatically unless
// TURSO_API_TOKEN, TURSO_ORG, and TURSO_GROUP are set (see .env.example).
const encryptionTest = hasCredentials ? test : test.skip;

// A fresh 32-byte key (aes256gcm, the default cipher), base64-encoded.
const newKey = () => randomBytes(32).toString("base64");

encryptionTest("encrypts a database at rest and reads it back with the correct key", async (t) => {
  const name = `conformance-enc-${randomUUID().slice(0, 8)}`;
  const key = newKey();
  t.teardown(() => deleteDb(name));

  // Provision the database as encrypted, write some data, then disconnect.
  const first = connect(await resolve(name, { encryption: { key } }));
  await first.exec(`
    CREATE TABLE secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    )
  `);
  await first.run("INSERT INTO secrets (value) VALUES (?)", "classified");
  await first.close();

  // Reconnecting with the same key decrypts the data we wrote.
  const second = connect(await resolve(name, { encryption: { key } }));
  const secrets = await second.all("SELECT value FROM secrets");
  await second.close();

  t.deepEqual(secrets, [{ value: "classified" }]);
});

encryptionTest("rejects access to an encrypted database with the wrong key", async (t) => {
  const name = `conformance-enc-${randomUUID().slice(0, 8)}`;
  const key = newKey();
  t.teardown(() => deleteDb(name));

  // Provision the database as encrypted and write some data.
  const first = connect(await resolve(name, { encryption: { key } }));
  await first.exec(`
    CREATE TABLE secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    )
  `);
  await first.run("INSERT INTO secrets (value) VALUES (?)", "classified");
  await first.close();

  // Reconnecting with a different key must not be able to read the data.
  const wrong = connect(await resolve(name, { encryption: { key: newKey() } }));
  try {
    await t.throwsAsync(() => wrong.all("SELECT value FROM secrets"));
  } finally {
    await wrong.close().catch(() => {});
  }
});
