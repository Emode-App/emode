'use client';

import { useState } from 'react';

/** Consumer plan: attaches the entitlement to the user, not to a merchant. */
export function UpgradeButton({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <>
            <button
                onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                        const res = await fetch('/api/stripe/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ planId: 'chrome_unlimited', userId, platform: 'consumer' }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else throw new Error(data.error || 'Could not start checkout.');
                    } catch (err: any) {
                        setError(err.message || 'Something went wrong.');
                        setLoading(false);
                    }
                }}
                disabled={loading}
                className="w-full py-3 bg-accent-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
                {loading ? 'Starting checkout…' : 'Go unlimited'}
            </button>
            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        </>
    );
}
