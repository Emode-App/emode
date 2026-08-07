'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';
import { Logo } from '../../../components/Logo';

/**
 * Choose a password.
 *
 * Reached two ways: from a "forgot password" email, and from an account that
 * has only ever signed in by magic link and now wants a password. Both land
 * here holding a session, so the only thing this page does is set one.
 *
 * Both routes matter. Every account created before passwords existed - which is
 * all of them - has no password, and a merchant who is told "sign in with your
 * password" and has never set one is stuck with no way forward.
 */
export default function SetPasswordPage() {
    const [ready, setReady] = useState<boolean | null>(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A recovery link establishes a session before this renders. Without one
    // there is nothing to update, and saying so beats a failure on submit.
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setReady(Boolean(session)));
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Use at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Those two passwords do not match.');
            return;
        }

        setBusy(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            setDone(true);
        } catch (err: any) {
            // Supabase rejects known-breached passwords when leaked password
            // protection is on. Its wording is about the check; this is about
            // the person.
            const raw = err?.message || '';
            setError(
                /pwned|leaked|compromise/i.test(raw)
                    ? 'That password has appeared in a known data breach. Pick a different one.'
                    : raw || 'Could not set that password.'
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-off-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6">
                        <Logo imgClassName="h-14 mx-auto" />
                    </Link>
                    <h1 className="text-3xl font-heading font-bold tracking-tight mb-3">
                        {done ? 'Password set' : 'Choose a password'}
                    </h1>
                    <p className="text-charcoal/50">
                        {done
                            ? 'You can now sign in with your email and password.'
                            : 'You will be able to sign in with this instead of waiting for an email.'}
                    </p>
                </div>

                <div className="p-8 bg-white rounded-2xl border border-black/5 shadow-sm">
                    {ready === false && !done && (
                        <div className="text-center">
                            <p className="text-sm text-charcoal/60 leading-relaxed mb-6">
                                This page needs a valid link. Ask for a new one and open it from
                                the email.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                                Back to sign in <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}

                    {done && (
                        <Link
                            href="/login"
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest"
                        >
                            Sign in <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}

                    {ready && !done && (
                        <form onSubmit={save} className="space-y-5">
                            <div>
                                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                                    New password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        className="w-full bg-off-white border border-black/10 rounded-xl py-4 pl-11 pr-4 outline-none focus:border-accent-gold transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                                    Confirm password
                                </label>
                                <input
                                    id="confirm"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className="w-full bg-off-white border border-black/10 rounded-xl py-4 px-4 outline-none focus:border-accent-gold transition-colors"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600 leading-relaxed">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                            >
                                {busy ? 'Saving…' : 'Save password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
