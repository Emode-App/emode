/**
 * Reject passwords that already appear in known breaches.
 *
 * Supabase can do this natively against HaveIBeenPwned, but only on Pro plans
 * and up, and this project is not on one. The error branches for it were
 * already written in set-password and ChangePassword and simply never fired.
 * This makes them fire.
 *
 * ## The password never leaves the browser
 *
 * This uses HIBP's range API, which is built on k-anonymity. We SHA-1 the
 * password locally and send only the **first five hex characters** of that
 * hash. HIBP answers with every breached hash that shares that prefix —
 * usually 400 to 800 of them — and the comparison happens here. HIBP learns
 * five characters of a hash, which matches hundreds of thousands of passwords,
 * and cannot tell which one was being asked about. Nothing identifying is sent
 * and no password or full hash goes over the wire.
 *
 * SHA-1 is not a security choice here. It is the digest HIBP's corpus is keyed
 * on, so it is the only one that can be looked up. It is being used as a lookup
 * key, never to protect anything.
 *
 * ## It fails open, deliberately
 *
 * If HIBP is unreachable, slow, or returns something unexpected, this reports
 * "not breached" rather than throwing. A third-party outage must never become
 * an outage of our own signup and password-reset flows. The floor — a length
 * minimum — is enforced by the callers regardless, so a failed check degrades
 * to the protection that existed before rather than to nothing.
 */

/** How long to wait on HIBP before giving up and letting the password through. */
const TIMEOUT_MS = 3000;

async function sha1Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-1', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

/**
 * How many known breaches this password appears in. 0 means not found, which
 * is also what a failed lookup returns — see the note on failing open above.
 */
export async function timesPwned(password: string): Promise<number> {
    // crypto.subtle exists only in secure contexts. https and localhost both
    // qualify, so this is really a guard for odd embedded webviews.
    if (typeof crypto === 'undefined' || !crypto.subtle) return 0;

    let hash: string;
    try {
        hash = await sha1Hex(password);
    } catch {
        return 0;
    }

    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            // Padding makes HIBP return a constant number of results, so the
            // response size cannot be used to narrow down which prefix was
            // requested. Free, so there is no reason not to.
            headers: { 'Add-Padding': 'true' },
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) return 0;

        const body = await res.text();
        for (const line of body.split('\n')) {
            const [candidate, count] = line.trim().split(':');
            if (candidate === suffix) {
                // Padded entries are real hashes with a count of 0. A match on
                // one of those is not a real breach.
                const n = parseInt(count ?? '0', 10);
                return Number.isFinite(n) ? n : 0;
            }
        }
        return 0;
    } catch {
        return 0;
    }
}

/**
 * The one place the rules live, so three call sites cannot drift apart.
 * Returns a message to show, or null if the password is acceptable.
 */
export async function checkPassword(password: string, confirm?: string): Promise<string | null> {
    if (password.length < 8) return 'Use at least 8 characters.';
    if (confirm !== undefined && password !== confirm) return 'Those two passwords do not match.';

    if (await timesPwned(password) > 0) {
        // Deliberately not showing the count. "Found in 47,000 breaches" invites
        // people to hunt for one that scores lower rather than pick a better
        // password, and the number is not the point.
        return 'That password has appeared in a known data breach. Pick a different one.';
    }

    return null;
}
