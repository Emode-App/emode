'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase/browser';
import { Logo } from '../../components/Logo';
import { formatCode, normaliseCode } from '../../lib/appsumo';

/**
 * AppSumo redemption.
 *
 * The whole point of the page is that an AppSumo buyer arrives having already
 * paid, somewhere else, and knows nothing about emode. So it explains stacking
 * before they wonder why nothing upgraded, and it never shows a plan picker —
 * being asked to choose a plan after buying one is the fastest way to make
 * someone think they were charged twice.
 */

const TIERS = [
    { codes: 1, name: 'Lifetime Starter', detail: '50 try-ons a day' },
    { codes: 2, name: 'Lifetime Pro', detail: '200 a day, marketplace listing' },
    { codes: 3, name: 'Lifetime Founder', detail: 'Unlimited, everything' },
];

export default function RedeemPage() {
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [code, setCode] = useState('');
    const [codeCount, setCodeCount] = useState(0);
    const [planName, setPlanName] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justRedeemed, setJustRedeemed] = useState(false);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [linkSent, setLinkSent] = useState(false);

    // The code the buyer pasted before they had an account.
    //
    // They arrive from AppSumo holding a code and no emode account, so signing
    // in is unavoidable. What is avoidable is losing the code across it. This
    // used to hide the input entirely until signed in, which meant a buyer
    // pasted nothing, went away to sign in, and came back to an empty form with
    // the code still sitting in a tab they had closed.
    const PENDING_KEY = 'emode_pending_appsumo_code';

    const loadStatus = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSignedIn(Boolean(session));
        if (!session) return;

        // Signed in now, so anything they typed before is theirs to redeem.
        try {
            const pending = localStorage.getItem(PENDING_KEY);
            if (pending) {
                localStorage.removeItem(PENDING_KEY);
                setCode(pending);
            }
        } catch { /* private browsing: they retype it, which is the old behaviour */ }

        const res = await fetch('/api/redeem', {
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setCodeCount(data.codeCount || 0);
        setPlanName(data.planName || null);
    };

    useEffect(() => {
        loadStatus();
        const { data: listener } = supabase.auth.onAuthStateChange(() => loadStatus());
        return () => listener.subscription.unsubscribe();
    }, []);

    /**
     * Sign in without leaving.
     *
     * The old card linked to /login, and /auth/callback sends people to
     * /auth/home afterwards, so a buyer mid-redemption was deposited on a
     * dashboard with nothing on screen about the code they came to use. The
     * Supabase redirect URL cannot carry ?next= either: it is matched against
     * the allowlist literally, and a query string makes it fall through to the
     * site root.
     *
     * So do not navigate at all. This page already listens for auth changes, so
     * the buyer stays here, clicks the link in another tab, and this tab wakes
     * up holding the code they already pasted.
     */
    const sendLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        try {
            // Hold the code now: the link may well be opened in another browser,
            // and this tab is the one that has it.
            try { if (code.trim()) localStorage.setItem(PENDING_KEY, code.trim()); } catch { /* ignore */ }

            const { error: signInError } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });
            if (signInError) throw signInError;
            setLinkSent(true);
        } catch (err: any) {
            setError(err.message || 'Could not send that link.');
        } finally {
            setSending(false);
        }
    };

    const redeem = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setJustRedeemed(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sign in to redeem a code.');

            const res = await fetch('/api/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not redeem that code.');

            setCodeCount(data.codeCount);
            setPlanName(data.planName);
            setCode('');
            try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
            setJustRedeemed(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-off-white">
            <div className="max-w-2xl mx-auto px-6 py-16">
                <Link href="/" className="inline-block mb-12">
                    <Logo imgClassName="h-12" />
                </Link>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold/15 text-[10px] font-bold uppercase tracking-widest text-charcoal mb-6">
                    <Ticket className="w-3 h-3" /> AppSumo
                </div>

                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4">
                    Redeem your code
                </h1>
                <p className="text-charcoal/50 leading-relaxed mb-10 max-w-lg">
                    Paste the code from your AppSumo purchase. Bought more than one? Redeem
                    them one at a time — each one stacks and moves you up a tier.
                </p>

                {signedIn === false && (
                    <div className="p-8 bg-white rounded-2xl border border-black/5 shadow-sm mb-8">
                        {linkSent ? (
                            <>
                                <h2 className="font-bold mb-2">Check your email</h2>
                                <p className="text-sm text-charcoal/50 leading-relaxed">
                                    We sent a sign-in link to <b>{email}</b>. Leave this tab open.
                                    Your code is saved here and will be waiting when you come back.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="font-bold mb-2">Paste your code, then sign in</h2>
                                <p className="text-sm text-charcoal/50 mb-6 leading-relaxed">
                                    Your code has to attach to an account, and we will make one for
                                    you. Use the email you bought with on AppSumo if you can, it
                                    keeps everything in one place.
                                </p>

                                <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                                    Your code
                                </label>
                                <input
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value);
                                        try { localStorage.setItem(PENDING_KEY, e.target.value); } catch { /* ignore */ }
                                    }}
                                    onBlur={() => code && setCode(formatCode(normaliseCode(code)))}
                                    placeholder="EMODE-XXXX-XXXX-XXXX"
                                    aria-label="AppSumo code"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="w-full bg-off-white border border-black/10 rounded-xl py-4 px-5 font-mono tracking-wider uppercase focus:outline-none focus:border-accent-gold transition-colors mb-5"
                                />

                                <form onSubmit={sendLink}>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                                        Your email
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@yourbrand.com"
                                            aria-label="Email address"
                                            autoComplete="email"
                                            className="flex-1 bg-off-white border border-black/10 rounded-xl py-4 px-5 focus:outline-none focus:border-accent-gold transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !email.trim()}
                                            className="px-8 py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40 whitespace-nowrap"
                                        >
                                            {sending ? 'Sending' : 'Send sign-in link'}
                                        </button>
                                    </div>
                                </form>

                                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                                <p className="text-xs text-charcoal/40 mt-5">
                                    Already have an account?{' '}
                                    <Link href="/login" className="underline">Sign in another way</Link>
                                </p>
                            </>
                        )}
                    </div>
                )}

                {signedIn && (
                    <>
                        {codeCount > 0 && (
                            <div className="p-6 bg-white rounded-2xl border border-black/5 shadow-sm mb-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-accent-gold text-black flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold">
                                        {justRedeemed ? 'Code redeemed.' : 'You’re on'} {planName}
                                    </p>
                                    <p className="text-sm text-charcoal/50">
                                        {codeCount} code{codeCount === 1 ? '' : 's'} redeemed
                                        {codeCount < 3 && ' — redeem another to move up a tier.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={redeem} className="mb-10">
                            <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                                Your code
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value);
                                        try { localStorage.setItem(PENDING_KEY, e.target.value); } catch { /* ignore */ }
                                    }}
                                    onBlur={() => code && setCode(formatCode(normaliseCode(code)))}
                                    placeholder="EMODE-XXXX-XXXX-XXXX"
                                    aria-label="AppSumo code"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="flex-1 bg-white border border-black/10 rounded-xl py-4 px-5 font-mono tracking-wider uppercase focus:outline-none focus:border-accent-gold transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={busy || !code.trim()}
                                    className="px-8 py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40"
                                >
                                    {busy ? 'Redeeming…' : 'Redeem'}
                                </button>
                            </div>
                            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
                        </form>

                        {codeCount > 0 && (
                            <Link
                                href="/admin"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-accent-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform mb-12"
                            >
                                Go to your dashboard <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </>
                )}

                {/* Shown regardless of sign-in state: a buyer deciding whether to
                    stack a second code needs this before they commit, not after. */}
                <div className="border-t border-black/5 pt-10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-6">
                        How stacking works
                    </h3>
                    <div className="space-y-3">
                        {TIERS.map((t) => {
                            const reached = codeCount >= t.codes;
                            return (
                                <div
                                    key={t.codes}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                                        reached ? 'bg-white border-accent-gold/40' : 'bg-white/50 border-black/5'
                                    }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                            reached ? 'bg-accent-gold text-black' : 'bg-black/5 text-charcoal/40'
                                        }`}
                                    >
                                        {reached ? <Check className="w-4 h-4" /> : t.codes}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{t.name}</p>
                                        <p className="text-xs text-charcoal/50">{t.detail}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
