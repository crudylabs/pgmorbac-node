# @crudy/pgmorbac

The [pgmorbac](https://pgmorbac.crudy.fr) PostgreSQL extension (Multi-OrBAC access
control) for Node.js projects that apply SQL through a migration runner instead of
`CREATE EXTENSION`.

```bash
npm install @crudy/pgmorbac
```

```js
import { extensionSql, upgradeScripts, version } from '@crudy/pgmorbac';

await client.query(extensionSql());          // pgmorbac--<version>.sql
for (const u of upgradeScripts()) {          // pgmorbac--<from>--<to>.sql, in order
    await client.query(u.sql);
}
```

| Export | |
|---|---|
| `extensionSql()` | the install script, as `CREATE EXTENSION` would run it |
| `upgradeScripts()` | `{ from, to, filename, sql }` per upgrade script, in version order |
| `version` | the extension version |
| `sqlDir`, `controlFile` | paths to the shipped files, for tools that read them directly |

For Fastify applications, [`@crudy/pgmorbac-fastify`](https://www.npmjs.com/package/@crudy/pgmorbac-fastify)
adds permission checks, the RLS session context and management routes.

## Where the SQL comes from

The package version is the extension version. Building the package downloads
that version's release from
[crudylabs/pgmorbac](https://github.com/crudylabs/pgmorbac/releases), checks the
Ed25519-signed manifest against the pinned `release-key.pub.pem` and the zip
against the manifest's sha256, and only then extracts the SQL. The extension
source lives in [pgmorbac](https://github.com/crudylabs/pgmorbac); this repository
holds no SQL.

## Releasing

After pgmorbac `vX.Y.Z` is released on Gitea, set `version` to `X.Y.Z` here, then
`npm publish`. To build from a local release (the extension's `dist/`), set
`PGMORBAC_DIST_DIR`; it is verified the same way.

## License

MIT, like the extension. See [LICENSE](LICENSE).
