import { Metadata } from 'next';
import { Terminal, Code2, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'API Documentation | emodeAI',
    description: 'Official API documentation for integrating emodeAI virtual try-on technology.',
};

export default function DocsPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">Developer API Docs</h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">v1.0.0 • Current Release</p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <Terminal className="w-6 h-6 text-accent-gold" />
                        1. Embedded Widget (Recommended)
                    </h2>
                    <p className="mb-4">
                        The easiest way to integrate emodeAI is via the Drop-In Embedded Widget. Once you subscribe via the <Link href="/login" className="underline font-bold">Dashboard</Link>, you will be granted a unique Merchant ID tag.
                    </p>
                    <div className="p-4 bg-obsidian text-green-400 font-mono text-sm rounded-xl overflow-x-auto shadow-inner mb-4 flex flex-col gap-2">
                        <span><span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src=</span><span className="text-yellow-300">"https://emode.app/widget.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span></span>
                        <span><span className="text-blue-400">&lt;div</span> <span className="text-purple-400">id=</span><span className="text-yellow-300">"emode-widget-root"</span> <span className="text-purple-400">data-merchant-id=</span><span className="text-yellow-300">"[YOUR_MERCHANT_ID]"</span><span className="text-blue-400">&gt;&lt;/div&gt;</span></span>
                    </div>
                    <p className="text-sm">
                        Place these tags directly on your Shopify Product Liquid templates or React product pages. The widget automatically scrapes the `src` of your main product image if `data-product-image` is omitted.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <Zap className="w-6 h-6 text-accent-gold" />
                        2. Direct REST API (Headless)
                    </h2>
                    <p className="mb-4">
                        If you want to bypass the widget UI entirely and build your own app, you can POST directly to the generation engine endpoint.
                    </p>
                    <div className="p-4 bg-off-white border border-black/10 rounded-xl mb-4">
                        <div className="flex items-center gap-3 mb-3 border-b border-black/5 pb-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-md">POST</span>
                            <code className="text-sm font-bold">https://emode.app/api/generate</code>
                        </div>
                        <p className="text-sm font-bold mb-2">Request Body (JSON):</p>
                        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
                            <li><code>targetPhotoUrl</code>: <span className="text-charcoal/60">The user's headshot/body photo URL.</span></li>
                            <li><code>garmentPhotoUrl</code>: <span className="text-charcoal/60">The clothing item URL.</span></li>
                            <li><code>merchantId</code>: <span className="text-charcoal/60">Your API identification key for billing.</span></li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <Code2 className="w-6 h-6 text-accent-gold" />
                        3. Rate Limits & Errors
                    </h2>
                    <p className="mb-4">
                        API requests are strictly evaluated against your monthly plan entitlement. If you exceed your limit, the API will reject standard generations:
                    </p>
                    <ul className="list-disc pl-6 text-sm space-y-1">
                        <li><strong>429 Too Many Requests</strong>: You have exhausted your plan quota. Please upgrade your tier via the Admin dashboard.</li>
                        <li><strong>400 Bad Request</strong>: Malformed URL pathways for imagery. Ensure your photos are publicly resolvable.</li>
                        <li><strong>401 Unauthorized</strong>: Missing or inactive merchant ID.</li>
                    </ul>
                </section>
            </div>
        </article>
    );
}
