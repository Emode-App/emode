'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase/browser';

/**
 * Broadcasts the current Supabase session to the emodeAI Chrome extension via
 * window.postMessage. The extension's auth-bridge.js content script (matched
 * only on this origin) relays it into extension storage — a chrome-extension://
 * page has no access to this origin's localStorage/cookies, so this is the only
 * way it can learn who's signed in.
 */
export function ExtensionAuthBridge() {
    useEffect(() => {
        const broadcast = (accessToken: string | null, userId: string | null, expiresAt: number | null) => {
            window.postMessage(
                { source: 'emode-web', type: 'EMODE_AUTH_STATE', accessToken, userId, expiresAt },
                window.location.origin
            );
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            broadcast(session?.access_token || null, session?.user?.id || null, session?.expires_at || null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            broadcast(session?.access_token || null, session?.user?.id || null, session?.expires_at || null);
        });

        const onRequest = (event: MessageEvent) => {
            if (event.source !== window || event.origin !== window.location.origin) return;
            if (event.data?.source !== 'emode-extension' || event.data?.type !== 'REQUEST_AUTH_STATE') return;
            supabase.auth.getSession().then(({ data: { session } }) => {
                broadcast(session?.access_token || null, session?.user?.id || null, session?.expires_at || null);
            });
        };
        window.addEventListener('message', onRequest);

        return () => {
            listener.subscription.unsubscribe();
            window.removeEventListener('message', onRequest);
        };
    }, []);

    return null;
}
