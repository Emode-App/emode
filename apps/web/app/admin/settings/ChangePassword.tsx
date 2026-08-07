'use client';

import { useEffect, useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';
import { checkPassword } from '../../../lib/password-breach';

/**
 * Change your password, from inside the app.
 *
 * This existed already but only by URL. /auth/set-password takes any session
 * and updates the password on it, so a signed-in merchant could always change
 * theirs — nothing linked there. The only discoverable route was to sign out,
 * click "Forgot?", and wait for an email, which is a strange thing to ask of
 * someone who is already signed in, and impossible for the accounts created
 * automatically on Shopify install if that shop's contact address does not
 * reach a real inbox.
 *
 * Re-authenticates before changing anything. Supabase's updateUser({password})
 * does not ask for the current one, so with an active session a borrowed or
 * unattended browser is enough to take the account over — change the password,
 * and the real owner is locked out of their own store. Requiring the current
 * password costs one field and closes that.
 *
 * Accounts that have never had a password cannot answer that challenge, so
 * there is a second path that emails a link instead. Both end in the same
 * place. See [[auth-set-password]] for the emailed one.
 */
export function ChangePassword() {
    const [email, setEmail] = useState<string | null>(null);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email) {
            setError('Could not read your account. Reload and try again.');
            return;
        }

        // Length, match, and a breach lookup, from the same helper the reset
        // page uses so the two cannot disagree about what is acceptable.
        setBusy(true);
        const problem = await checkPassword(next, confirm);
        if (problem) {
            setError(problem);
            setBusy(false);
            return;
        }

        try {
            // Proof of the current password. Signing in again returns a session
            // for the same user, so this costs nothing beyond the round trip.
            const { error: reauthError } = await supabase.auth.signInWithPassword({
                email,
                password: current,
            });
            if (reauthError) {
                setError('That current password is not right.');
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({ password: next });
            if (updateError) throw updateError;

            setDone(true);
            setCurrent('');
            setNext('');
            setConfirm('');
        } catch (err: any) {
            // Supabase rejects known-breached passwords when leaked password
            // protection is on. Its wording is about the check; this is about
            // the person.
            const raw = err?.message || '';
            setError(
                /pwned|leaked|compromise/i.test(raw)
                    ? 'That password has appeared in a known data breach. Pick a different one.'
                    : raw || 'Could not change that password.'
            );
        } finally {
            setBusy(false);
        }
    };

    // For accounts that have never had a password to prove.
    const emailALink = async () => {
        if (!email) return;
        setBusy(true);
        setError(null);
        try {
            const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            });
            if (sendError) throw sendError;
            setSent(true);
        } catch (err: any) {
            setError(err?.message || 'Could not send that email.');
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full bg-off-white border border-black/10 rounded-lg py-3 px-4 outline-none focus:border-accent-gold transition-colors';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
            <h3 className="text-xl font-heading font-bold mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5" /> PASSWORD
            </h3>
            <p className="text-sm text-charcoal/50 mb-6 leading-relaxed">
                {email
                    ? <>Signed in as <b className="text-charcoal">{email}</b>.</>
                    : 'Change the password you sign in with.'}
            </p>

            {done && (
                <div className="mb-6 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                    <Check className="w-4 h-4 shrink-0" /> Password changed. Use it next time you sign in.
                </div>
            )}

            {sent && (
                <div className="mb-6 text-sm text-charcoal/70 bg-off-white rounded-lg px-4 py-3">
                    Check {email} for a link to set a new password.
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="current-password" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                        Current password
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className={field}
                    />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                            New password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            placeholder="At least 8 characters"
                            className={field}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                            Confirm new password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className={field}
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 leading-relaxed">{error}</p>}

                <div className="pt-4 border-t border-black/5 flex items-center justify-between gap-4 flex-wrap">
                    <button
                        type="button"
                        onClick={emailALink}
                        disabled={busy || !email}
                        className="text-xs text-charcoal/40 underline hover:text-charcoal disabled:opacity-50"
                    >
                        Never set one? Email me a link instead
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="px-6 py-3 bg-obsidian text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                        {busy ? 'Saving…' : 'Change password'}
                    </button>
                </div>
            </form>
        </div>
    );
}
