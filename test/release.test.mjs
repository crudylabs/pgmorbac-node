import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';
import { strToU8, zipSync } from 'fflate';
import { AUDIENCE, extractSql, verifyRelease } from '../scripts/release.mjs';

const version = '1.2.3';
const zip = Buffer.from(zipSync({
    'pgmorbac-1.2.3/pgmorbac.control': strToU8("default_version = '1.2.3'\n"),
    'pgmorbac-1.2.3/pgmorbac--1.2.3.sql': strToU8('CREATE SCHEMA morbac;\n'),
    'pgmorbac-1.2.3/pgmorbac--1.2.2--1.2.3.sql': strToU8('SELECT 1;\n'),
    'pgmorbac-1.2.3/Makefile': strToU8('EXTENSION = pgmorbac\n'),
}));

function keys() {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    return {
        privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    };
}

async function sign(privatePem, manifest, audience = AUDIENCE) {
    return new SignJWT({ manifest })
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
        .setAudience(audience)
        .sign(await importPKCS8(privatePem, 'EdDSA'));
}

const sha = (b) => createHash('sha256').update(b).digest('hex');
const good = (z = zip, v = version) => ({ name: 'pgmorbac', version: v, artifacts: [{ name: `pgmorbac-${v}.zip`, sha256: sha(z) }] });

test('a release signed by the pinned key verifies and yields its SQL', async () => {
    const k = keys();
    await verifyRelease({ zip, manifestJwt: await sign(k.privatePem, good()), publicKeyPem: k.publicKeyPem, version });
    assert.deepEqual(Object.keys(extractSql(zip, version)).sort(), ['pgmorbac--1.2.2--1.2.3.sql', 'pgmorbac--1.2.3.sql', 'pgmorbac.control']);
});

test('another key is refused', async () => {
    const signer = keys();
    const pinned = keys();
    await assert.rejects(verifyRelease({ zip, manifestJwt: await sign(signer.privatePem, good()), publicKeyPem: pinned.publicKeyPem, version }));
});

test('a zip that is not the signed one is refused', async () => {
    const k = keys();
    const tampered = Buffer.from(zipSync({ 'pgmorbac-1.2.3/pgmorbac--1.2.3.sql': strToU8('DROP SCHEMA public;\n') }));
    await assert.rejects(verifyRelease({ zip: tampered, manifestJwt: await sign(k.privatePem, good()), publicKeyPem: k.publicKeyPem, version }), /sha256/);
});

test('a manifest for another version or audience is refused', async () => {
    const k = keys();
    await assert.rejects(verifyRelease({ zip, manifestJwt: await sign(k.privatePem, good(zip, '1.2.4')), publicKeyPem: k.publicKeyPem, version }), /expected pgmorbac@1.2.3/);
    await assert.rejects(verifyRelease({ zip, manifestJwt: await sign(k.privatePem, good(), 'other'), publicKeyPem: k.publicKeyPem, version }));
});

test('a zip without the install script is refused', () => {
    const empty = Buffer.from(zipSync({ 'pgmorbac-1.2.3/README': strToU8('x') }));
    assert.throws(() => extractSql(empty, version), /lacks/);
});
