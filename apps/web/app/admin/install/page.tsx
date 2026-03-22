'use client';

import { useState } from 'react';
import { Check, Copy, Sparkles, ArrowRight, Code2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function InstallPage() {
    const [merchantId] = useState(''); // Will be loaded from auth context
    const [copied, setCopied] = useState(false);

    const widgetCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://emode.app'}/widget.js" data-emode-merchant="${merchantId || 'YOUR_MERCHANT_ID'}"></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <header className="mb-12">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase flex items-center gap-3">
                    <Code2 className="w-8 h-8" /> Install Widget
                </h1>
                <p className="text-charcoal/50 mt-2">Copy your embed code and add it to your website.</p>
            </header>

            {/* Widget Code */}
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-4">
                    Your Embed Code
                </h3>
                <div className="relative bg-obsidian rounded-xl p-6">
                    <pre className="text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        {widgetCode}
                    </pre>
                    <button
                        onClick={handleCopy}
                        className="absolute top-3 right-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-6">
                    How It Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                            <Code2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <h4 className="font-bold text-sm mb-2">1. Paste the Code</h4>
                        <p className="text-xs text-charcoal/50">
                            Add the script tag to your website before the closing &lt;/body&gt; tag.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-5 h-5 text-amber-600" />
                        </div>
                        <h4 className="font-bold text-sm mb-2">2. Buttons Appear</h4>
                        <p className="text-xs text-charcoal/50">
                            "Try On" and "Dressing Room" buttons automatically appear on your product pages.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-bold text-sm mb-2">3. Customers Try On</h4>
                        <p className="text-xs text-charcoal/50">
                            Shoppers upload a photo and see how your products look on them in real-time.
                        </p>
                    </div>
                </div>
            </div>

            {/* Advanced Config */}
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-4">
                    Advanced: Custom Selectors
                </h3>
                <p className="text-xs text-charcoal/50 mb-4">
                    If the widget can't find your products automatically, you can specify custom CSS selectors:
                </p>
                <div className="bg-obsidian rounded-xl p-4">
                    <pre className="text-gray-400 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`<script
  src="https://emode.app/widget.js"
  data-emode-merchant="${merchantId || 'YOUR_MERCHANT_ID'}"
  data-product-selector=".my-product-card"
  data-title-selector=".my-product-title"
  data-image-selector=".my-product-image"
  data-price-selector=".my-product-price"
></script>`}</pre>
                </div>
            </div>
        </>
    );
}
