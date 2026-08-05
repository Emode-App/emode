import Link from 'next/link';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Package, Users, BarChart3, Settings, LogOut, Code2 } from 'lucide-react';
import { SignOutButton } from './components/SignOutButton';
import { AdminNav, AdminSettingsLink } from './components/AdminNav';
import { Logo } from '../../components/Logo';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth guard. This previously forwarded a raw `cookie` header into
    // createClient() and called getUser() — which never resolves a user, so the
    // guard redirected every visitor to /login including signed-in ones. Same
    // bug as admin-util.ts had; the session lives in cookies read by the SSR
    // client.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow onboarding without auth (they just paid and may not be signed in).
    // The pathname comes from middleware: Next's old `x-invoke-path` header no
    // longer exists, so the previous check always read '' and the exemption
    // silently never applied.
    const headersList = await headers();
    const currentPath = headersList.get('x-pathname') || '';

    if (!user && !currentPath.startsWith('/admin/onboarding')) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-off-white flex">
            {/* Premium Sidebar */}
            <aside className="w-64 bg-obsidian text-white p-8 flex flex-col gap-8 fixed h-full z-20">
                {/* Mark only: the sidebar is 256px wide and dark, so the full
                    lockup would be illegible at the size that fits. */}
                <div className="mb-4 flex flex-col items-center gap-2">
                    <Logo variant="mark" imgClassName="h-10 invert" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Admin</span>
                </div>
                <nav className="flex flex-col gap-2">
                    <AdminNav />

                    <div className="mt-8 pt-8 border-t border-white/10">
                        <AdminSettingsLink />
                        {user ? (
                            <>
                                <div className="mt-2 px-4 py-2 text-xs text-white/40 truncate">
                                    {user.email}
                                </div>
                                <SignOutButton />
                            </>
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
