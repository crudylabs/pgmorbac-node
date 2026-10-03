#!/usr/bin/env node
// prepack: fills sql/ from the signed pgmorbac release whose version matches
// package.json. The release comes from the crudylabs/pgmorbac GitHub releases, or
// from a local directory of release files (PGMORBAC_DIST_DIR, the dist/ that
// the extension's build-dist.mjs writes). Either way it must verify against the
// pinned release-key.pub.pem before anything is written.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSql, releaseFiles, verifyRelease } from './release.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASES = 'https://github.com/crudylabs/pgmorbac/releases/download';

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const files = releaseFiles(version);

async function load(name) {
    const dir = process.env.PGMORBAC_DIST_DIR;
    if (dir) return readFileSync(join(dir, name));
    const res = await fetch(`${RELEASES}/v${version}/${name}`);
    if (!res.ok) throw new Error(`${name}: release v${version} answered ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

const zip = await load(files.zip);
const manifestJwt = (await load(files.manifest)).toString('utf8');
await verifyRelease({ zip, manifestJwt, publicKeyPem: readFileSync(join(root, 'release-key.pub.pem'), 'utf8'), version });

const sqlDir = join(root, 'sql');
rmSync(sqlDir, { recursive: true, force: true });
mkdirSync(sqlDir);
for (const [name, bytes] of Object.entries(extractSql(zip, version))) writeFileSync(join(sqlDir, name), bytes);
console.log(`[pgmorbac] sql/ filled from the verified v${version} release`);
