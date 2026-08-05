import Link from 'next/link';
import { Logo } from './Logo';

export const Footer = () => {
    return (
        <footer className="py-20 border-t border-black/5 bg-off-white">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <Logo imgClassName="h-10" />
                </Link>
                <div className="flex gap-10 text-sm font-medium text-charcoal/50">
                    <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
                    <Link href="/docs" className="hover:text-black transition-colors">API Docs</Link>
                    <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
                </div>
                <div className="text-sm text-charcoal/30 font-medium">
                    © 2026 emodeAI. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
