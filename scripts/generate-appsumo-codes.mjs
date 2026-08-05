#!/usr/bin/env node
/**
 * Generate a batch of AppSumo codes and write the CSV to hand to AppSumo.
 *
 *   node scripts/generate-appsumo-codes.mjs --count 1000 --batch launch-2026-08
 *
 * Codes are crypto-random over Crockford base32 (no I, L, O or U), so a code
 * misread off a screen cannot become a different valid code. 12 characters of
 * that alphabet is ~2^60 — guessing one is not an attack worth defending
 * against, which is why redemption needs no rate limiter beyond requiring a
 * signed-in user.
 *
 * Inserted with ON CONFLICT DO NOTHING and re-checked after, so a collision or a
 * partial run cannot silently hand AppSumo a code that was never stored — the
 * failure mode being a buyer who paid and cannot redeem.
 */

import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const BODY_LENGTH = 12;

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function mintCode() {
    let body = '';
    // randomInt, not Math.random: these are bearer tokens for a paid product.
    for (let i = 0; i < BODY_LENGTH; i++) body += ALPHABET[randomInt(ALPHABET.length)];
    return `EMODE${body}`;
}

function pretty(code) {
    const body = code.replace(/^EMODE/, '');
    return ['EMODE', ...(body.match(/.{1,4}/g) || [])].join('-');
}

const count = parseInt(arg('count', '100'), 10);
const batch = arg('batch', `batch-${new Date().toISOString().slice(0, 10)}`);
const out = arg('out', `appsumo-${batch}.csv`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    console.error('Run from apps/web so .env.local is picked up, or export them first.');
    process.exit(1);
}

const supabase = createClient(url, key);

const codes = new Set();
while (codes.size < count) codes.add(mintCode());
const rows = [...codes].map((code) => ({ code, batch }));

console.log(`Minting ${count} codes for batch "${batch}"...`);

for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from('appsumo_codes').upsert(chunk, {
        onConflict: 'code',
        ignoreDuplicates: true,
    });
    if (error) {
        console.error('Insert failed:', error.message);
        process.exit(1);
    }
    console.log(`  stored ${Math.min(i + 500, rows.length)}/${rows.length}`);
}

// Only export what is definitely in the database. Handing AppSumo a code that
// was not stored means a buyer who paid and cannot redeem.
const { data: stored, error: verifyError } = await supabase
    .from('appsumo_codes')
    .select('code')
    .eq('batch', batch);

if (verifyError) {
    console.error('Verification failed:', verifyError.message);
    process.exit(1);
}

const storedSet = new Set(stored.map((r) => r.code));
const missing = [...codes].filter((c) => !storedSet.has(c));
if (missing.length) {
    console.error(`${missing.length} codes did not store. Aborting rather than exporting them.`);
    process.exit(1);
}

writeFileSync(out, ['code', ...[...codes].map(pretty)].join('\n') + '\n');
console.log(`\n${storedSet.size} codes in batch "${batch}".`);
console.log(`CSV written to ${out} — this is the file AppSumo needs.`);
console.log('Redemption page: https://www.emode.style/redeem');
