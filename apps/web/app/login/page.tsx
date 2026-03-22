'use client';

import { useState } from 'react';
import { supabase } from '@emode/database';
import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
            setMessage({ type: 'error', text: error.message || 'An error occurred. Please try again.' });
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
