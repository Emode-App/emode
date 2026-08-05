'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';

/**
 * There was no way out of the admin area. Signing out lived only in the
 * marketing site's navbar, so a merchant already inside their dashboard had to
 * find their way back to the landing page to leave — and anyone testing with
 * more than one account had no way to switch at all.
 */
export function SignOutButton() {
    const [busy, setBusy] = useState(false);

    return (
        <button
            onClick={async () => {
                setBusy(true);
                await supabase.auth.signOut();
                // Full navigation, not router.push: the layout's auth check runs on
                // the server, and a client-side transition can serve it from cache
                // and render the dashboard for a user who no longer has a session.
                window.location.href = '/';
            }}
            disabled={busy}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors w-full text-left disabled:opacity-50"
        >
            <LogOut className="w-4 h-4" /> {busy ? 'Signing out…' : 'Sign Out'}
        </button>
    );
}
