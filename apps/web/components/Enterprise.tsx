'use client';

import { useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';

/**
 * Enterprise, which is a conversation rather than a plan.
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

export function Enterprise() {
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

    return (
        <section className="py-20 bg-off-white">
            <div className="max-w-5xl mx-auto px-6">
                <div className="p-10 md:p-14 bg-white rounded-3xl border border-black/5 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-[10px] font-bold uppercase tracking-widest text-charcoal/60 mb-6">
                            <Calendar className="w-3 h-3" /> Enterprise
                        </div>
                        <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tighter mb-4">
                            Bigger catalogue, bigger questions.
                        </h2>
                        <p className="text-charcoal/50 leading-relaxed">
                            Thousands of SKUs, a stack that isn&apos;t off the shelf, a security
                            review to get through, or volumes the plans above don&apos;t cover.
                            Book a call and we&apos;ll work out what it takes.
                        </p>
                    </div>

                    <div>
                        {BOOKING_URL ? (
                            <a
                                href={BOOKING_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 py-5 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Book a call <ArrowRight className="w-4 h-4" />
                            </a>
                        ) : state === 'done' ? (
                            <div className="p-6 bg-off-white rounded-2xl text-center">
                                <p className="font-bold mb-1">Got it.</p>
                                <p className="text-sm text-charcoal/50">
                                    We&apos;ll be in touch to find a time.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={request} className="space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40">
                                    Work email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@yourbrand.com"
                                    className="w-full bg-off-white border border-black/10 rounded-xl py-4 px-5 focus:outline-none focus:border-accent-gold transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={state === 'sending'}
                                    className="w-full py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                >
                                    {state === 'sending' ? 'Sending…' : <>Book a call <ArrowRight className="w-4 h-4" /></>}
                                </button>
                                {error && <p className="text-xs text-red-600">{error}</p>}
                                <p className="text-[11px] text-charcoal/40 text-center pt-1">
                                    A person replies, usually same day.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
