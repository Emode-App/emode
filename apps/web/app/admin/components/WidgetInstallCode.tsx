"use client";

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Code2, Sparkles, ShoppingBag } from 'lucide-react';
import { SITE_URL } from '../../../lib/site';

type Tab = 'ai' | 'snippet' | 'shopify';

export function WidgetInstallCode({ merchantId }: { merchantId: string }) {
    // The AI path is first and default. Most fashion founders are not the person
    // who knows where </body> lives in their codebase, and "paste this into your
    // coding assistant" is a far shorter path to installed than a snippet plus
    // a guess about their stack.
    const [tab, setTab] = useState<Tab>('ai');
    const [copied, setCopied] = useState<string | null>(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
    const id = merchantId || 'YOUR_MERCHANT_ID';
    const snippet = `<script src="${baseUrl}/widget.js" data-emode-merchant="${id}"></script>`;

    // Written as instructions to an agent, not to a person: names the exact
    // file locations per framework, states the verification step, and calls out
    // the two things an assistant would otherwise get wrong (putting it in
    // <head>, or "helpfully" adding selector attributes that suppress the
    // widget's own detection).
    const aiPrompt = `Add the emode virtual try-on widget to this website.

1. Insert this exact script tag so it loads on every page, immediately before the closing </body> tag:

${snippet}

Framework notes — use whichever applies to this project:
- Next.js App Router: add it to app/layout.tsx inside <body>, as the last child. Use the next/script component with strategy="afterInteractive" if you prefer, but a plain <script> tag also works.
- Next.js Pages Router: add it to pages/_document.tsx inside <body>, after <Main /> and <NextScript />.
- Plain React / Vite: add it to index.html before </body>.
- Static HTML: add it before </body> on every page, or in the shared footer include.
- WordPress: add it to the theme footer.php before </body>, or via a "insert headers and footers" plugin (footer section).

2. Do NOT add any data-product-selector, data-title-selector, data-image-selector or data-price-selector attributes. The widget detects products automatically using JSON-LD, OpenGraph tags, and the page's add-to-cart button. Adding selectors overrides that and usually makes detection worse.

3. Do not place the tag in <head>. It needs the DOM to exist.

4. If this site has an order confirmation / thank-you page, also call emode's purchase hook there so the merchant gets conversion analytics. Use the real order values from whatever the page already has in scope:

   window.emode?.trackOrder({
     orderId: "REPLACE_WITH_ORDER_ID",
     total: 0,          // order total as a number, e.g. 129.99
     currency: "USD",
     productIds: []     // optional: product ids in the order
   });

5. After making the change, tell me which file(s) you edited, and how to verify: I should open a product page, and see "Try This On" and "Dressing Room" buttons appear near the add to cart button.

Do not change anything else about the site's styling or layout.`;

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'ai', label: 'With AI', icon: <Sparkles className="w-4 h-4" /> },
        { key: 'snippet', label: 'Paste code', icon: <Code2 className="w-4 h-4" /> },
        { key: 'shopify', label: 'Shopify', icon: <ShoppingBag className="w-4 h-4" /> },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-4xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-6">
                Add emode to your store
            </h3>

            <div className="flex gap-2 mb-6">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                            tab === t.key
                                ? 'bg-obsidian text-white shadow-sm'
                                : 'bg-off-white text-charcoal/50 hover:text-charcoal'
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'ai' && (
                <>
                    <p className="text-sm text-charcoal/60 mb-2">
                        Easiest option, and you don&apos;t need to know how your site is built.
                        Open your project in an AI coding assistant —{' '}
                        <b>Claude Code</b>, Cursor, Copilot, Windsurf, Lovable, v0 — and paste this in.
                    </p>
                    <p className="text-xs text-charcoal/40 mb-6">
                        It already contains your store&apos;s key, so don&apos;t edit it. If someone
                        else maintains your site, send it to them instead — it works as instructions
                        for a person too.
                    </p>
                    <div className="relative rounded-xl overflow-hidden border border-black/10 bg-obsidian">
                        <pre className="p-6 pr-32 text-[13px] leading-relaxed text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                            {aiPrompt}
                        </pre>
                        <button
                            onClick={() => copy(aiPrompt, 'ai')}
                            className="absolute top-3 right-3 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-md"
                        >
                            {copied === 'ai' ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy prompt</>}
                        </button>
                    </div>
                </>
            )}

            {tab === 'snippet' && (
                <>
                    <p className="text-sm text-charcoal/60 mb-6">
                        Paste this just before the closing <code>&lt;/body&gt;</code> tag, on every
                        page. It detects your products automatically — no configuration.
                    </p>
                    <div className="relative rounded-xl overflow-hidden shadow-inner border border-black/10">
                        <SyntaxHighlighter
                            language="html"
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1.5rem', paddingRight: '9rem', fontSize: '0.875rem', borderRadius: '0.75rem' }}
                            wrapLongLines
                        >
                            {snippet}
                        </SyntaxHighlighter>
                        <button
                            onClick={() => copy(snippet, 'snippet')}
                            className="absolute top-3 right-3 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-md"
                        >
                            {copied === 'snippet' ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                        </button>
                    </div>
                </>
            )}

            {tab === 'shopify' && (
                <div className="text-sm text-charcoal/70 leading-relaxed">
                    <p className="mb-4">
                        <b>Don&apos;t use the snippet on Shopify.</b> Install the emode app instead —
                        it syncs your catalog automatically and tracks how try-ons affect sales,
                        which the script tag cannot do on its own.
                    </p>
                    <ol className="list-decimal ml-5 space-y-2 text-charcoal/60">
                        <li>Install <b>emodeAI</b> from the Shopify App Store.</li>
                        <li>In your Shopify admin, open <b>Online Store → Themes → Customize</b>.</li>
                        <li>Go to a product page, choose <b>Add block</b>, and pick <b>emodeAI Buttons</b>.</li>
                        <li>Save. The try-on buttons appear on every product page.</li>
                    </ol>
                </div>
            )}

            {merchantId && (
                <p className="mt-6 text-[11px] text-charcoal/30 font-mono break-all">
                    Store key: {merchantId}
                </p>
            )}
        </div>
    );
}
