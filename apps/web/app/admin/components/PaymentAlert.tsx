'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';

/**
 * "Your last payment did not go through."
 *
 * A failed payment used to be invisible to everyone. The webhook wrote a console
 * line, so the merchant found out when their widget stopped working — at the end
 * of a retry window they never knew had started, having lost try-ons for their
 * customers in the meantime.
 *
 * Almost every one of these is an expired card, and almost every one is fixed in
 * thirty seconds by the person seeing this banner. Which is the entire argument
 * for showing it: this is not a dunning notice, it is the cheapest revenue
 * recovery available, and it costs a merchant nothing to act on.
 *
 * Deliberately not a modal and not dismissible. Service is still running, so
 * blocking the dashboard would be a punishment for something Stripe has not
 * finished deciding; but a banner that can be dismissed is a banner that gets
 * dismissed and then forgotten until the widget goes dark.
 */
export function PaymentAlert({ since }: { since?: string | null }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const days = since
        ? Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000)
        : 0;

    const openPortal = async () => {
        setBusy(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Your session expired. Refresh and try again.');

            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not open billing.');

            window.location.href = data.url;
        } catch (err: any) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-amber-900 mb-1">
                        Your last payment didn&apos;t go through
                    </h3>
                    <p className="text-sm text-amber-900/70 leading-relaxed mb-4">
                        We&apos;ll retry automatically over the next couple of weeks
                        {days > 0 && <> &mdash; this started {days === 1 ? 'yesterday' : `${days} days ago`}</>}.
                        Your try-ons are still running in the meantime. It&apos;s usually
                        an expired card, and updating it takes about thirty seconds.
                    </p>
                    <button
                        onClick={openPortal}
                        disabled={busy}
                        className="px-6 py-3 bg-amber-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-950 transition-colors disabled:opacity-50"
                    >
                        {busy ? 'Opening…' : 'Update payment method'}
                    </button>
                    {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
                </div>
            </div>
        </div>
    );
}
