/**
 * Parse a fetch Response that is *expected* to be JSON, but might not be.
 *
 * Calling res.json() directly is a trap: platform-level failures (413 Request
 * Entity Too Large, 502/504 from a gateway, a Vercel error page) return plain
 * text or HTML. The resulting "Unexpected token 'R'... is not valid JSON" tells
 * the user nothing about what actually went wrong, and sends whoever is
 * debugging it looking at the client parser instead of the real failure.
 */
export async function readJson(res: Response): Promise<any> {
    const raw = await res.text();

    let data: any = null;
    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            // Not JSON — translate the ones we understand.
            if (res.status === 413) {
                throw new Error(
                    'That photo is too large to upload. Please try a smaller image.'
                );
            }
            if (res.status === 504 || res.status === 502) {
                throw new Error(
                    'The server took too long to respond. Please try again.'
                );
            }
            throw new Error(
                `Unexpected server response (${res.status}). ${raw.slice(0, 120)}`
            );
        }
    }

    if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status}).`);
    }

    return data;
}
