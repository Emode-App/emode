import { AlertTriangle, Sparkles, Code2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { getMerchantForUser } from '../admin-util';
import { WidgetInstallCode } from '../components/WidgetInstallCode';
import { SITE_URL } from '../../../lib/site';

export const dynamic = 'force-dynamic';

export default async function InstallPage() {
    const merchant = await getMerchantForUser();
    const merchantId = merchant?.id || '';

    return (
        <>
            <header className="mb-12">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase flex items-center gap-3">
                    <Code2 className="w-8 h-8" /> Install Widget
                </h1>
                <p className="text-charcoal/50 mt-2">Copy your embed code and add it to your website.</p>
            </header>

            {!merchantId && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-900 mb-1">No merchant account linked yet</p>
                        <p className="text-xs text-amber-800">
                            Your embed code needs your merchant ID, which is created when you subscribe.
                            {' '}<Link href="/#pricing" className="underline font-bold">Choose a plan</Link> to activate your widget,
                            or contact support if you've already subscribed with a different email.
                        </p>
                    </div>
                </div>
            )}

            {/* Widget Code */}
            <div className="mb-8">
                <WidgetInstallCode merchantId={merchantId} />
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
  src="${SITE_URL}/widget.js"
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
