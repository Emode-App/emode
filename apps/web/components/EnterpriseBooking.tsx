'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * The enterprise booking control.
 *
 * A brand with a large catalogue, a bespoke stack or a legal review has
 * questions no pricing card answers, and self-serve checkout is the wrong first
 * step for them. So this asks for a call rather than a card.
 *
 * The booking link does not exist yet. Rather than a dead button or a fake one,
 * it collects an email and says a person will reach out — which is the same
 * outcome a calendar link produces, minus the calendar. Swap BOOKING_URL in when
 * there is one and the button becomes a direct link.
 */
const BOOKING_URL = '';

export function EnterpriseBooking() {
    const [email, setEmail] = useState('');
    const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const request = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('sending');
        setError(null);
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Same store, different source, so enterprise interest is
                // separable from consumer waitlist signups rather than mixed in.
                body: JSON.stringify({ email, source: 'enterprise' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not send that.');
            setState('done');
        } catch (err: any) {
            setError(err.message);
            setState('idle');
        }
    };

    // Just the control. The surrounding card, heading and copy belong to
    // whatever page embeds this - on the contact page that section already
    // existed, and duplicating it there would have been two enterprise pitches
    // stacked on top of each other.
    if (BOOKING_URL) {
        return (
            <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 py-3 px-8 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
            >
                Book a call <ArrowRight className="w-4 h-4" />
            </a>
        );
    }

    if (state === 'done') {
        return (
            <p className="text-white/80 text-sm">
                <b className="text-white">Got it.</b> We&apos;ll be in touch to find a time.
            </p>
        );
    }

    return (
        <form onSubmit={request} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbrand.com"
                aria-label="Work email"
                className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-6 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-gold transition-colors"
            />
            <button
                type="submit"
                disabled={state === 'sending'}
                className="py-3 px-8 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50 whitespace-nowrap inline-flex items-center justify-center gap-2"
            >
                {state === 'sending' ? 'Sending…' : <>Book a call <ArrowRight className="w-4 h-4" /></>}
            </button>
            {error && <p className="text-xs text-red-300 sm:hidden">{error}</p>}
        </form>
    );
}
