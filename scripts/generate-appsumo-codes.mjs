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

// Re-export an existing batch without minting more of it. Without this, the
// only way to regenerate a lost CSV was to run the script again, which mints a
// whole new set and quietly doubles the batch.
const exportOnly = process.argv.includes('--export-only');

const codes = new Set();
if (!exportOnly) {
    while (codes.size < count) codes.add(mintCode());
}
const rows = [...codes].map((code) => ({ code, batch }));

if (exportOnly) console.log(`Exporting existing batch "${batch}"...`);
else console.log(`Minting ${count} codes for batch "${batch}"...`);

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
//
// Paginated, because PostgREST caps a select at 1000 rows by default. Read in
// one go it returned the first 1000 and the check then declared everything past
// that missing and aborted. AppSumo's minimum batch is 1000, so the cap bit at
// exactly the size every real batch starts at: this worked on test runs of 100
// and could never once have produced a usable CSV.
const PAGE = 1000;
const storedSet = new Set();
for (let from = 0; ; from += PAGE) {
    const { data, error: verifyError } = await supabase
        .from('appsumo_codes')
        .select('code')
        .eq('batch', batch)
        .range(from, from + PAGE - 1);

    if (verifyError) {
        console.error('Verification failed:', verifyError.message);
        process.exit(1);
    }
    for (const row of data) storedSet.add(row.code);
    if (data.length < PAGE) break;
}
const missing = [...codes].filter((c) => !storedSet.has(c));
if (missing.length) {
    console.error(`${missing.length} codes did not store. Aborting rather than exporting them.`);
    process.exit(1);
}

if (!storedSet.size) {
    console.error(`No codes found in batch "${batch}".`);
    process.exit(1);
}

// Export the whole batch, not only what this run minted, so --export-only
// reproduces the same file the original run produced.
writeFileSync(out, ['code', ...[...storedSet].map(pretty)].join('\n') + '\n');
console.log(`\n${storedSet.size} codes in batch "${batch}".`);
console.log(`CSV written to ${out} — this is the file AppSumo needs.`);
console.log('Redemption page: https://www.emode.style/redeem');
