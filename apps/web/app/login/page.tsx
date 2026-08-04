'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/browser';
import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    // /auth/callback redirects back here with ?error=... when a magic link is
    // expired, already used, or arrives without a code. Read it off the URL
    // directly rather than via useSearchParams, which would force this
    // otherwise-static page into a Suspense boundary.
    useEffect(() => {
        const err = new URLSearchParams(window.location.search).get('error');
        if (err) {
            setMessage({ type: 'error', text: err });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // OAuth is the primary path, not a nicety. Supabase's built-in email sender
    // is rate limited to a few messages per hour and is not intended for
    // production, so a magic-link-only sign-in caps how fast merchants can
    // onboard — and locks you out entirely once the limit is hit.
    const handleOAuth = async (provider: 'google') => {
        setOauthLoading(provider);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    // No query string: Supabase matches redirect URLs against the
                    // allowlist literally, and `?next=` made it fall through to the
                    // Site URL (the landing page). /auth/callback already sends
                    // users to /admin by default.
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
            // On success the browser navigates away; nothing more to do here.
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message?.includes('provider is not enabled')
                    ? 'Google sign-in is not enabled yet on this project.'
                    : error.message || 'Could not start Google sign-in.',
            });
            setOauthLoading(null);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Check your email for the magic link!' });
        } catch (error: any) {
            // Supabase returns a terse "email rate limit exceeded" that reads as
            // a bug rather than a quota — say what it means and offer the way out.
            const raw = error.message || '';
            setMessage({
                type: 'error',
                text: /rate limit/i.test(raw)
                    ? 'Too many sign-in emails sent recently. Use "Continue with Google" above, or try again in about an hour.'
                    : raw || 'An error occurred. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-off-white flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-50 via-white to-orange-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6">
                        <span className="text-4xl font-heading font-bold bg-purple-gradient bg-clip-text text-transparent italic pr-4">
                            emodeAI
                        </span>
                    </Link>
                    <h1 className="text-3xl font-heading font-bold tracking-tight mb-3">Welcome to your Closet</h1>
                    <p className="text-charcoal/50">Enter your email to sign in or create an account.</p>
                </div>

                <div className="glass p-8 rounded-[2.5rem] shadow-2xl border border-white/40">
                    <button
                        type="button"
                        onClick={() => handleOAuth('google')}
                        disabled={Boolean(oauthLoading)}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-black/10 rounded-2xl py-4 font-bold text-sm hover:bg-black/[0.03] hover:shadow-md transition-all disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.55l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z" />
                        </svg>
                        {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
                    </button>

                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px flex-1 bg-black/10" />
                        <span className="text-[10px] uppercase tracking-widest text-charcoal/30 font-bold">or</span>
                        <div className="h-px flex-1 bg-black/10" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full bg-white/50 border border-black/5 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-generate py-4 flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-sm group disabled:opacity-50"
                        >
                            {loading ? 'Sending link...' : (
                                <>
                                    Send Magic Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {message.text}
                            </div>
                        )}
                    </form>

                    <div className="mt-8 pt-8 border-t border-black/5 text-center">
                        <p className="text-xs text-charcoal/30 font-medium flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent-gold" />
                            No passwords, just magic.
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-charcoal/30">
                    By signing in, you agree to our <Link href="/terms" className="underline hover:text-charcoal">Terms</Link> and <Link href="/privacy" className="underline hover:text-charcoal">Privacy Policy</Link>.
                </p>
            </div>
        </div>
    );
}
