// Verifies a signed pgmorbac release and extracts its SQL. Pure functions, so
// the checks are tested without a network or the real signing key.
import { createHash } from 'node:crypto';
import { importSPKI, jwtVerify } from 'jose';
import { unzipSync } from 'fflate';

export const AUDIENCE = 'pgmorbac-release';

export function releaseFiles(version) {
    const stem = `pgmorbac-${version}`;
    return { zip: `${stem}.zip`, manifest: `${stem}.manifest.jwt` };
}

/**
 * Throws unless the manifest is signed by publicKeyPem for this audience and
 * version, and names the zip with its exact sha256.
 */
export async function verifyRelease({ zip, manifestJwt, publicKeyPem, version }) {
    const key = await importSPKI(publicKeyPem.trim(), 'EdDSA');
    const { payload } = await jwtVerify(manifestJwt.trim(), key, { algorithms: ['EdDSA'], audience: AUDIENCE });
    const manifest = payload.manifest;
    if (manifest?.name !== 'pgmorbac' || manifest.version !== version) {
        throw new Error(`manifest is for ${manifest?.name}@${manifest?.version}, expected pgmorbac@${version}`);
    }
    const expected = manifest.artifacts?.find((a) => a.name === releaseFiles(version).zip)?.sha256;
    const actual = createHash('sha256').update(zip).digest('hex');
    if (!expected || expected !== actual) throw new Error(`zip sha256 ${actual} does not match the signed manifest`);
}

/**
 * The control file, install script and upgrade scripts of a verified release
 * zip, as { name: bytes }.
 */
export function extractSql(zip, version) {
    const prefix = `pgmorbac-${version}/`;
    const wanted = new RegExp(`^(pgmorbac\\.control|pgmorbac--${version.replace(/\./g, '\\.')}\\.sql|pgmorbac--\\d+\\.\\d+\\.\\d+--\\d+\\.\\d+\\.\\d+\\.sql)$`);
    const out = {};
    for (const [path, bytes] of Object.entries(unzipSync(zip))) {
        if (!path.startsWith(prefix)) continue;
        const name = path.slice(prefix.length);
        if (wanted.test(name)) out[name] = bytes;
    }
    if (!out['pgmorbac.control'] || !out[`pgmorbac--${version}.sql`]) {
        throw new Error(`release zip lacks pgmorbac.control or pgmorbac--${version}.sql`);
    }
    return out;
}
