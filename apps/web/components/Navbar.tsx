'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
    const pathname = usePathname();
    const isMarketplace = pathname === '/marketplace';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex items-center justify-center border-b border-black/5 shadow-md">
            <div className="relative flex items-center justify-between w-full max-w-7xl">
                {/* Left: Logo */}
                <div className="flex items-center z-10">
                    <Link href="/">
                        <span className="text-2xl font-heading font-bold bg-purple-gradient bg-clip-text text-transparent italic pr-4 hover:opacity-80 transition-opacity cursor-pointer block">
                            emodeAI
                        </span>
                    </Link>
                </div>

                {/* Center: Navigation Links - Absolutely Centered */}
                <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-8 font-medium pointer-events-auto">
                        <Link href="/marketplace" className="hover:text-accent-gold transition-colors">Marketplace</Link>
                        <Link href="/#extensions" className="hover:text-accent-gold transition-colors">Extensions</Link>
                        <Link href="/#pricing" className="hover:text-accent-gold transition-colors">Pricing</Link>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 z-10">
                    {isMarketplace && (
                        <button className="p-2 hover:bg-black/5 rounded-full transition-colors relative">
                            <ShoppingBag className="w-6 h-6" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full border-2 border-white"></span>
                        </button>
                    )}
                    <Link href="/login" className="btn-primary py-2 px-6 rounded-full text-sm font-semibold tracking-wide">
                        Join emode
                    </Link>
                </div>
            </div>
        </nav>
    );
};
