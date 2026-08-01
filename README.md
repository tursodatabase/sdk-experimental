<p align="center">
  <a href="https://turso.tech/">
    <picture>
      <img src="/.github/assets/cover.png" alt="Turso" />
    </picture>
  </a>
  <h1 align="center">Millions of databases. Zero config.</h1>
</p>

<p align="center">
  Spin up a Turso database for every user, agent, and tenant &mdash; provisioned on demand, no dashboards. On Turso Cloud or your own infrastructure (BYOC).
</p>

<p align="center">
  <a href="https://turso.tech"><strong>Turso</strong></a> ·
  <a href="https://docs.turso.tech"><strong>Docs</strong></a> ·
  <a href="https://turso.tech/blog"><strong>Blog &amp; Tutorials</strong></a>
</p>

<p align="center">
  <a href="LICENSE">
    <picture>
      <img src="https://img.shields.io/github/license/tursodatabase/turso-vercel?color=0F624B" alt="MIT License" />
    </picture>
  </a>
  <a href="https://tur.so/discord-ts">
    <picture>
      <img src="https://img.shields.io/discord/933071162680958986?color=0F624B" alt="Discord" />
    </picture>
  </a>
  <a href="https://www.npmjs.com/package/@tursodatabase/sdk-experimental">
    <picture>
      <img src="https://img.shields.io/npm/v/@tursodatabase/sdk-experimental?color=0F624B" alt="npm version" />
    </picture>
  </a>
</p>

Name a database and start querying &mdash; it's provisioned the first time you touch it:

```ts
import { resolve } from "@tursodatabase/sdk-experimental";
import { connect } from "@tursodatabase/serverless";

// One database per agent — provisioned on first use.
const db = connect(await resolve(`agent-${agentId}`));

await db.exec("CREATE TABLE IF NOT EXISTS memories (content TEXT NOT NULL)");
await db.run("INSERT INTO memories (content) VALUES (?)", "User prefers concise answers.");
```

## Features

- **Zero-config provisioning** &mdash; Databases are created on first use. No dashboards, no setup steps.
- **A database for everyone** &mdash; Give every user, agent, or tenant their own database. Lightweight enough to multiply into millions.
- **Bring your own driver** &mdash; `resolve()` returns a config you pass straight to `connect()` from [`@tursodatabase/serverless`](https://www.npmjs.com/package/@tursodatabase/serverless), an ORM, or any libsql-compatible client.
- **Cloud or BYOC** &mdash; Works against Turso Cloud or your own infrastructure (Bring Your Own Cloud).

## Install

```bash
npm install @tursodatabase/sdk-experimental @tursodatabase/serverless
```

## Setup

1. Get your Turso API token:
   ```bash
   turso auth api-tokens mint my-app-token
   ```

2. Get your organization slug:
   ```bash
   turso org list
   ```

3. Create a database group for your app (or use an existing one):
   ```bash
   turso group create my-project
   ```

4. Set these environment variables for your app:
   ```
   TURSO_API_TOKEN=your-api-token
   TURSO_ORG=your-org-slug
   TURSO_GROUP=my-project
   ```

All databases are scoped to the configured group. You can create as many databases as you like within it, and they can only be created in and accessed from that group.

## Quickstart

```ts
import { resolve } from "@tursodatabase/sdk-experimental";
import { connect } from "@tursodatabase/serverless";

// One database per tenant — provisioned automatically on first use.
const db = connect(await resolve(`tenant-${tenantId}`));

// Create tables
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert data
await db.run(
  "INSERT INTO users (name, email) VALUES (?, ?)",
  "Alice", "alice@example.com"
);

// Query data
const users = await db.all("SELECT * FROM users");
console.log(users);
```

Everything after `connect()` is the [`@tursodatabase/serverless`](https://www.npmjs.com/package/@tursodatabase/serverless) SDK &mdash; prepared statements, batches, and transactions all work as documented there.

## API Reference

See the [Manual](MANUAL.md) for the full API reference &mdash; `resolve` and its options, including encryption.

## Documentation

Visit our [official documentation](https://docs.turso.tech) for more details.

## Support

Join us [on Discord](https://tur.so/discord-ts) to get help using this SDK. Report security issues [via email](mailto:security@turso.tech).
