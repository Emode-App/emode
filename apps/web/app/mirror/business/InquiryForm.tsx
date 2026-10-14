'use client';

import { useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { mirrorSupabase } from '../../../lib/supabase/mirror';

const INDUSTRIES = ['Clothing retail', 'Luxury', 'Department store', 'Events & pop-ups', 'Hospitality', 'Other'];
const HARDWARE = ['We don’t have one yet', 'Proto Luma', 'Proto Epic', 'Proto M / M2', 'Other display'];

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * The store inquiry form.
 *
 * Writes straight to `mirror_inquiries` in the Emode project, which accepts
 * inserts from anyone and returns nothing -- so there is deliberately no
 * .select() after the insert; asking for the row back would be refused.
 *
 * Two light guards against bots, neither of which a person notices: a hidden
 * field only a script fills in, and a minimum time on the page.
 */
export function InquiryForm() {
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const openedAt = useRef(Date.now());

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const text = (k: string) => String(f.get(k) ?? '').trim();

        // A filled honeypot or a sub-three-second submit is a script. Tell it
        // it worked and send nothing.
        if (text('website') || Date.now() - openedAt.current < 3000) {
            setStatus('sent');
            return;
        }

        const email = text('email');
        if (!text('business_name') || !text('contact_name') || !email.includes('@')) {
            setError('Please fill in your store, your name and a valid email.');
            return;
        }

        setStatus('sending');
        setError(null);
        const count = Number(text('device_count'));
        const { error: insertError } = await mirrorSupabase.from('mirror_inquiries').insert({
            business_name: text('business_name').slice(0, 200),
            contact_name: text('contact_name').slice(0, 200),
            email: email.slice(0, 320),
            phone: text('phone').slice(0, 40) || null,
            industry: text('industry') || null,
            device_count: Number.isFinite(count) && count > 0 ? Math.min(Math.round(count), 100000) : null,
            proto_model: text('proto_model') || null,
            use_case: text('use_case').slice(0, 4000) || null,
            wants_demo: f.get('wants_demo') === 'on',
            source: 'website/mirror/business',
        });

        if (insertError) {
            setStatus('error');
            setError('That didn’t go through. Try again, or email support@emode.style.');
            return;
        }
        setStatus('sent');
    };

    if (status === 'sent') {
        return (
            <div className="flex items-start gap-4 py-4">
                <CheckCircle2 className="w-7 h-7 text-accent-gold shrink-0" />
                <div>
                    <p className="text-xl font-heading font-semibold">Thanks — we&apos;ll be in touch.</p>
                    <p className="text-charcoal/60 mt-1">Expect a reply within two business days.</p>
                </div>
            </div>
        );
    }

    const input = 'w-full rounded-xl border border-black/10 bg-off-white/60 px-4 py-3 outline-none focus:border-black/40 transition-colors';
    const label = 'block text-sm font-medium mb-1.5';

    return (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {/* Honeypot: hidden from people, irresistible to scripts. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
                <div>
                    <label className={label} htmlFor="business_name">Store or brand *</label>
                    <input id="business_name" name="business_name" required maxLength={200} className={input} />
                </div>
                <div>
                    <label className={label} htmlFor="contact_name">Your name *</label>
                    <input id="contact_name" name="contact_name" required maxLength={200} autoComplete="name" className={input} />
                </div>
                <div>
                    <label className={label} htmlFor="email">Work email *</label>
                    <input id="email" name="email" type="email" required maxLength={320} autoComplete="email" className={input} />
                </div>
                <div>
                    <label className={label} htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className={input} />
                </div>
                <div>
                    <label className={label} htmlFor="industry">What kind of business?</label>
                    <select id="industry" name="industry" defaultValue="" className={input}>
                        <option value="">Choose one</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <div>
                    <label className={label} htmlFor="device_count">How many stores?</label>
                    <input id="device_count" name="device_count" type="number" min={1} max={100000} inputMode="numeric" className={input} />
                </div>
                <div className="sm:col-span-2">
                    <label className={label} htmlFor="proto_model">Do you have a holographic display already?</label>
                    <select id="proto_model" name="proto_model" defaultValue="" className={input}>
                        <option value="">Choose one</option>
                        {HARDWARE.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label className={label} htmlFor="use_case">What would you want it to do?</label>
                    <textarea id="use_case" name="use_case" rows={4} maxLength={4000} className={input}
                        placeholder="Where it would go, what you'd want shoppers to try, anything else." />
                </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="wants_demo" className="w-4 h-4 accent-black" />
                I&apos;d like a demo
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={status === 'sending'}
                className="btn-primary w-full sm:w-auto py-3 px-8 rounded-full font-semibold disabled:opacity-50">
                {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
        </form>
    );
}
