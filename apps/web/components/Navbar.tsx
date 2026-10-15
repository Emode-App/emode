'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, LayoutDashboard } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/browser';
import { Logo } from './Logo';

export const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const isMarketplace = pathname === '/marketplace';

    // The nav previously hardcoded "Join emode", so a signed-in user saw the
    // same call to action as a stranger — and there was no way to tell from the
    // UI whether sign-in had actually worked.
    const [signedIn, setSignedIn] = useState<boolean | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));

        // Also covers the magic-link case: when Supabase redirects to a page
        // other than /auth/callback, the browser client exchanges the code
        // client-side and fires SIGNED_IN after this component has mounted.
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setSignedIn(Boolean(session?.user));
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex items-center justify-center border-b border-black/5 shadow-md">
            <div className="relative flex items-center justify-between w-full max-w-7xl">
                {/* Left: Logo */}
                <div className="flex items-center z-10">
                    <Link href="/">
                        <Logo className="hover:opacity-80 transition-opacity cursor-pointer" imgClassName="h-9" />
                    </Link>
                </div>

                {/* Center: Navigation Links - Absolutely Centered */}
                <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-8 font-medium pointer-events-auto">
                        <Link href="/how-it-works" className="hover:text-accent-gold transition-colors">How it works</Link>
                        <Link href="/marketplace" className="hover:text-accent-gold transition-colors inline-flex items-center gap-1.5">
                            Marketplace
                            <span className="text-[9px] font-bold uppercase tracking-widest text-charcoal/30 border border-black/10 rounded-full px-1.5 py-0.5">
                                Soon
                            </span>
                        </Link>
                        <Link href="/#extensions" className="hover:text-accent-gold transition-colors">Extensions</Link>
                        <Link href="/#pricing" className="hover:text-accent-gold transition-colors">Pricing</Link>
                        {/* The app is a different product for a different person;
                            it needs a way in that is not scrolling past the plans. */}
                        <Link href="/#app" className="hover:text-accent-gold transition-colors">The App</Link>
                        <Link href="/mirror" className="hover:text-accent-gold transition-colors">Mirror</Link>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 z-10">
                    {/* The centre links are hidden below md and there is no
                        mobile menu, so on a phone this is the only way to the
                        mirror from the header. */}
                    <Link href="/mirror" className="md:hidden text-sm font-semibold text-accent-gold">
                        Mirror
                    </Link>
                    {isMarketplace && (
                        <button className="p-2 hover:bg-black/5 rounded-full transition-colors relative">
                            <ShoppingBag className="w-6 h-6" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full border-2 border-white"></span>
                        </button>
                    )}
                    {/* null while the session is still resolving — rendering
                        "Join emode" first would flash a signed-out state at a
                        user who is actually logged in. */}
                    {signedIn === null ? (
                        <span className="py-2 px-6 text-sm opacity-0 select-none" aria-hidden>&nbsp;</span>
                    ) : signedIn ? (
                        <>
                            <Link
                                href="/admin"
                                className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold hover:text-accent-gold transition-colors"
                            >
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="btn-primary py-2 px-6 rounded-full text-sm font-semibold tracking-wide"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="btn-primary py-2 px-6 rounded-full text-sm font-semibold tracking-wide">
                            Join emode
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};
