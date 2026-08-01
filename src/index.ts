import { createClient } from "@tursodatabase/api";

// ============================================================================
// Types
// ============================================================================

/** Cipher used to encrypt the database at rest. */
export type EncryptionCipher =
  | "aes256gcm"
  | "aes128gcm"
  | "chacha20poly1305"
  | "aegis128l"
  | "aegis128x2"
  | "aegis128x4"
  | "aegis256"
  | "aegis256x2"
  | "aegis256x4";

export interface EncryptionOptions {
  /**
   * Base64-encoded encryption key. Key size depends on the cipher: 32 bytes
   * for aes256gcm, chacha20poly1305 and aegis256 variants; 16 bytes for
   * aes128gcm and aegis128l variants.
   *
   * Bring your own key: derive it from a trusted secret store (e.g. a KMS),
   * never from client input. The key is set when the database is provisioned
   * and must be supplied on every open thereafter.
   */
  key: string;
  /** Cipher to encrypt the database with. Default: "aes256gcm". */
  cipher?: EncryptionCipher;
}

export interface ResolveOptions {
  /** Provision the database if it does not already exist. Default: true. */
  create?: boolean;
  /**
   * Encrypt the database at rest with a key you control. Provisions the
   * database as encrypted on first use. The key is included in the resolved
   * config as `remoteEncryptionKey` so drivers supply it on every query;
   * opening an existing encrypted database without the matching key fails.
   */
  encryption?: EncryptionOptions;
}

/**
 * Where a database lives and how to talk to it. Shaped so it can be passed
 * directly to a driver, e.g. `connect()` from `@tursodatabase/serverless`.
 */
export interface DatabaseConfig {
  url: string;
  authToken: string;
  /** Present when the database is encrypted at rest. */
  remoteEncryptionKey?: string;
}

const DEFAULT_CIPHER: EncryptionCipher = "aes256gcm";

/** Database creation options. Mirrors `@tursodatabase/api` (>= 2.0). */
interface CreateOptions {
  group: string;
  remote_encryption?: {
    encryption_key: string;
    encryption_cipher: EncryptionCipher;
  };
}

// ============================================================================
// State
// ============================================================================

let apiClient: ReturnType<typeof createClient> | null = null;
let apiClientOrg: string | null = null;
let cachedGroupToken: { group: string; jwt: string } | null = null;

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve a database name to its location and credentials, provisioning the
 * database in the configured group if it does not already exist.
 */
export async function resolve(
  name: string,
  options: ResolveOptions = {},
): Promise<DatabaseConfig> {
  const client = getClient();
  const group = requireEnv("TURSO_GROUP");
  let db: { hostname?: string } | undefined;

  try {
    db = await client.databases.get(name);
  } catch (err) {
    if (!isStatus(err, 404)) throw err;
    if (options.create === false) {
      throw new Error(`Database "${name}" does not exist`);
    }
    const createOptions: CreateOptions = { group };
    if (options.encryption) {
      createOptions.remote_encryption = {
        encryption_key: options.encryption.key,
        encryption_cipher: options.encryption.cipher ?? DEFAULT_CIPHER,
      };
    }
    try {
      db = await client.databases.create(name, createOptions);
    } catch (err) {
      // Lost a creation race; the database exists now.
      if (!isStatus(err, 409)) throw err;
      db = await client.databases.get(name);
    }
  }

  if (!db?.hostname) {
    throw new Error(`Failed to get hostname for database: ${name}`);
  }

  if (!cachedGroupToken || cachedGroupToken.group !== group) {
    const token = await client.groups.createToken(group, { authorization: "full-access" });
    cachedGroupToken = { group, jwt: token.jwt };
  }

  const config: DatabaseConfig = {
    url: `libsql://${db.hostname}`,
    authToken: cachedGroupToken.jwt,
  };
  if (options.encryption) {
    config.remoteEncryptionKey = options.encryption.key;
  }

  return config;
}

// ============================================================================
// Internals
// ============================================================================

function getClient(): ReturnType<typeof createClient> {
  const org = requireEnv("TURSO_ORG");

  if (!apiClient || apiClientOrg !== org) {
    apiClient = createClient({ org, token: requireEnv("TURSO_API_TOKEN") });
    apiClientOrg = org;
  }

  return apiClient;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

function isStatus(err: unknown, status: number): boolean {
  return err instanceof Error && "status" in err && (err as { status: number }).status === status;
}
