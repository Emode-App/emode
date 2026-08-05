'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';

/**
 * Manage billing — payment method, invoices, cancellation.
 *
 * Cancelling had no self-serve path: a merchant who wanted out had to email and
 * wait. Bad on its own, and in a growing number of places not lawful either — if
 * signing up takes two clicks, cancelling cannot take an email and a wait.
 *
 * Says "cancel" out loud rather than hiding it behind "manage". A cancel link
 * that is hard to find does not keep anyone; it just means they cancel angry, or
 * charge back, which costs more than the month you were trying to save.
 */
export function ManageBilling() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = async () => {
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
        <div className="p-8 bg-white rounded-2xl border border-black/5">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-off-white rounded-lg shrink-0">
                    <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold mb-1">Billing</h3>
                    <p className="text-sm text-charcoal/50 leading-relaxed mb-5">
                        Update your payment method, download invoices, change plan, or cancel.
                        Cancelling keeps your plan running until the end of the period
                        you&apos;ve already paid for.
                    </p>
                    <button
                        onClick={open}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                    >
                        {busy ? 'Opening…' : <>Manage billing <ExternalLink className="w-3.5 h-3.5" /></>}
                    </button>
                    {error && <p className="text-sm text-red-600 mt-3 leading-relaxed">{error}</p>}
                </div>
            </div>
        </div>
    );
}
