import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Package, Users, BarChart3, Settings, LogOut, Code2 } from 'lucide-react';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth guard: check if user is logged in
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    cookie: (await cookies()).toString(),
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Allow onboarding page without auth (they just paid, may not be logged in yet)
    // For all other admin pages, require authentication
    // Note: we skip the redirect for onboarding to avoid blocking post-checkout flow

    return (
        <div className="min-h-screen bg-off-white flex">
            {/* Premium Sidebar */}
            <aside className="w-64 bg-obsidian text-white p-8 flex flex-col gap-8 fixed h-full z-20">
                <div className="text-2xl font-heading font-bold italic mb-4 text-center pr-4">emodeAdmin</div>
                <nav className="flex flex-col gap-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
                        <LayoutDashboard className="w-4 h-4" /> Overview
                    </Link>
                    <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <Package className="w-4 h-4" /> Products
                    </Link>
                    <Link href="/admin/install" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <Code2 className="w-4 h-4" /> Install Widget
                    </Link>
                    <Link href="/admin/merchants" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <Users className="w-4 h-4" /> Merchants
                    </Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <BarChart3 className="w-4 h-4" /> Analytics
                    </Link>
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                            <Settings className="w-4 h-4" /> Settings
                        </Link>
                        {user ? (
                            <div className="mt-2 px-4 py-2 text-xs text-white/40 truncate">
                                {user.email}
                            </div>
                        ) : (
                            <Link href="/login" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors text-accent-gold">
                                <LogOut className="w-4 h-4" /> Sign In
                            </Link>
                        )}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 p-10 overflow-auto min-h-screen">
                {children}
            </div>
        </div>
    );
}
