"use client";

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { SITE_URL } from '../../../lib/site';

export function WidgetInstallCode({ merchantId }: { merchantId: string }) {
    const [copied, setCopied] = useState(false);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
    const widgetCode = `<script src="${baseUrl}/widget.js" data-emode-merchant="${merchantId || 'YOUR_MERCHANT_ID'}"></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-4xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-4">
                Deploy to your website
            </h3>
            <p className="text-sm text-charcoal/60 mb-6">
                Copy and paste this snippet into your HTML just before the closing <code>&lt;/body&gt;</code> tag. It will automatically detect your products and inject the "Try It On" buttons.
            </p>
            <div className="relative rounded-xl overflow-hidden shadow-inner border border-black/10">
                <SyntaxHighlighter
                    language="html"
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.875rem', borderRadius: '0.75rem' }}
                >
                    {widgetCode}
                </SyntaxHighlighter>
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 backdrop-blur-md"
                >
                    {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Snippet</>}
                </button>
            </div>
        </div>
    );
}
