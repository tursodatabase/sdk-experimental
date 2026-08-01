# Manual

## API Reference

### `openDb(name, options?)`

Get a database by name, provisioning it in the configured group if it doesn't already exist. Returns the same instance for repeated calls with the same name.

```ts
const db = await openDb(`tenant-${tenantId}`);

// Connect to an existing database, without provisioning a new one
const db = await openDb(`tenant-${tenantId}`, { create: false });
```

**Options**

- `create` (default `true`) &mdash; Provision the database if it does not already exist. Pass `false` to require that it already exists (throws otherwise).
- `encryption` &mdash; Encrypt the database at rest with a key you control. See [Encryption](#encryption) below.

> **Important:** Derive database names from a trusted, authenticated identifier &mdash; such as the session's user or tenant ID &mdash; never from raw client input. All access is scoped to the configured group, so a leaked or injected name can at most reach other databases within that same group.

#### Encryption

Pass an `encryption` key to store the database encrypted at rest. The database is provisioned as encrypted on first use, and the key is supplied on every query thereafter.

```ts
const db = await openDb(`tenant-${tenantId}`, {
  encryption: { key: process.env.TENANT_KEY },
});
```

- `key` &mdash; Base64-encoded encryption key. Key size depends on the cipher: 32 bytes for `aes256gcm`, `chacha20poly1305`, and `aegis256` variants; 16 bytes for `aes128gcm` and `aegis128l` variants.
- `cipher` (default `"aes256gcm"`) &mdash; One of `aes256gcm`, `aes128gcm`, `chacha20poly1305`, `aegis128l`, `aegis128x2`, `aegis128x4`, `aegis256`, `aegis256x2`, `aegis256x4`.

> **Important:** Bring your own key &mdash; derive it from a trusted secret store such as a KMS, never from client input. The key is set when the database is provisioned and must be supplied on every open afterwards; opening an existing encrypted database without the matching key fails. Encryption cannot be added to a database that was already provisioned without it.

### `db.query(sql, params?)`

Execute a SELECT query and return results.

```ts
const result = await db.query(
  "SELECT * FROM users WHERE id = ?",
  [1]
);

console.log(result.columns); // ["id", "name", "email"]
console.log(result.rows);    // [[1, "Alice", "alice@example.com"]]
```

### `db.execute(sql, params?)`

Execute an INSERT, UPDATE, DELETE, or DDL statement.

```ts
await db.execute(
  "UPDATE users SET name = ? WHERE id = ?",
  ["Bob", 1]
);
```

### `db.close()`

Close the connection to the remote Turso database, releasing the server-side stream.

```ts
await db.close();
```
