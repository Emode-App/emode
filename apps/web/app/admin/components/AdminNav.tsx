'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Code2, BarChart3, Settings, Sparkles } from 'lucide-react';

/**
 * Sidebar navigation.
 *
 * The active state used to be a class hardcoded onto the Overview link, so
 * Overview was highlighted on every page in the admin — the one piece of the
 * interface whose entire job is telling you where you are was always wrong.
 */
const LINKS = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/studio', label: 'Studio', icon: Sparkles },
    { href: '/admin/install', label: 'Install Widget', icon: Code2 },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const SETTINGS = { href: '/admin/settings', label: 'Settings', icon: Settings };

function isActive(pathname: string, href: string, exact?: boolean) {
    // /admin matches only itself; every other page under it is a different
    // section, not a sub-page of the overview.
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, icon: Icon, exact }: typeof LINKS[number]) {
    const pathname = usePathname() || '';
    const active = isActive(pathname, href, exact);

    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
        >
            <Icon className="w-4 h-4" /> {label}
        </Link>
    );
}

/**
 * `signedIn` is not decoration.
 *
 * /admin/onboarding is the one route under /admin that renders without a
 * session, because a buyer arrives there straight from checkout and does not
 * have an account yet. The sidebar rendered its full set of links anyway, so
 * that buyer was shown Overview, Products, Studio, Analytics and Settings —
 * every one of which bounces to /login, since the layout guard exempts only
 * onboarding.
 *
 * Six doors, all locked, offered to someone who has just paid. Showing nothing
 * is better than showing a menu that punishes anyone who uses it.
 */
export function AdminNav({ signedIn = true }: { signedIn?: boolean }) {
    if (!signedIn) return null;
    return (
        <>
            {LINKS.map((link) => (
                <NavLink key={link.href} {...link} />
            ))}
        </>
    );
}

export function AdminSettingsLink({ signedIn = true }: { signedIn?: boolean }) {
    if (!signedIn) return null;
    return <NavLink {...SETTINGS} />;
}
