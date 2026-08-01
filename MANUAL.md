# Manual

## API Reference

### `resolve(name, options?)`

Resolve a database name to its location and credentials, provisioning the database in the configured group if it doesn't already exist. Returns a config object you can pass directly to a driver &mdash; for example `connect()` from [`@tursodatabase/serverless`](https://www.npmjs.com/package/@tursodatabase/serverless).

```ts
import { resolve } from "@tursodatabase/sdk-experimental";
import { connect } from "@tursodatabase/serverless";

const db = connect(await resolve(`tenant-${tenantId}`));

// Resolve an existing database, without provisioning a new one
const config = await resolve(`tenant-${tenantId}`, { create: false });
```

**Options**

- `create` (default `true`) &mdash; Provision the database if it does not already exist. Pass `false` to require that it already exists (throws otherwise).
- `encryption` &mdash; Encrypt the database at rest with a key you control. See [Encryption](#encryption) below.

**Returns**

```ts
interface DatabaseConfig {
  url: string;                   // libsql://<hostname>
  authToken: string;             // token scoped to the configured group
  remoteEncryptionKey?: string;  // present when encryption was requested
}
```

> **Important:** Derive database names from a trusted, authenticated identifier &mdash; such as the session's user or tenant ID &mdash; never from raw client input. All access is scoped to the configured group, so a leaked or injected name can at most reach other databases within that same group.

#### Encryption

Pass an `encryption` key to store the database encrypted at rest. The database is provisioned as encrypted on first use, and the key is included in the resolved config as `remoteEncryptionKey`, which drivers supply on every query.

```ts
const db = connect(await resolve(`tenant-${tenantId}`, {
  encryption: { key: process.env.TENANT_KEY },
}));
```

- `key` &mdash; Base64-encoded encryption key. Key size depends on the cipher: 32 bytes for `aes256gcm`, `chacha20poly1305`, and `aegis256` variants; 16 bytes for `aes128gcm` and `aegis128l` variants.
- `cipher` (default `"aes256gcm"`) &mdash; One of `aes256gcm`, `aes128gcm`, `chacha20poly1305`, `aegis128l`, `aegis128x2`, `aegis128x4`, `aegis256`, `aegis256x2`, `aegis256x4`.

> **Important:** Bring your own key &mdash; derive it from a trusted secret store such as a KMS, never from client input. The key is set when the database is provisioned and must be supplied on every resolve afterwards; querying an existing encrypted database without the matching key fails. Encryption cannot be added to a database that was already provisioned without it.
