import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';
import { Sparkles, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

async function getBrand(slug: string) {
    const { data } = await supabase
        .from('merchants')
        .select('id, brand_name, brand_slug, shop_domain, plan')
        .eq('brand_slug', slug)
        .single();

    return data;
}

async function getBrandProducts(merchantId: string) {
    const { data: products } = await supabase
        .from('products')
        .select('id, title, primary_image_url, category, buy_url, merchant_id')
        .eq('merchant_id', merchantId)
        .eq('marketplace_visible', true)
        .order('created_at', { ascending: false });

    if (!products || products.length === 0) return [];

    // Get prices
    const productIds = products.map(p => p.id);
    const { data: variants } = await supabase
        .from('variants')
        .select('product_id, price, buy_url')
        .in('product_id', productIds)
        .order('price', { ascending: true });

    const priceMap = new Map<string, { price: number; buyUrl: string | null }>();
    variants?.forEach(v => {
        if (v.product_id && !priceMap.has(v.product_id)) {
            priceMap.set(v.product_id, { price: v.price || 0, buyUrl: v.buy_url });
        }
    });

    return products.map(p => ({
        ...p,
        price: priceMap.get(p.id)?.price || 0,
        variantBuyUrl: priceMap.get(p.id)?.buyUrl,
    }));
}

export const dynamic = 'force-dynamic';

export default async function BrandStorefront({
    params,
}: {
    params: Promise<{ brand: string }>;
}) {
    const { brand: brandSlug } = await params;
    const brand = await getBrand(brandSlug);

    if (!brand) {
        notFound();
    }

    const products = await getBrandProducts(brand.id);

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-[1400px] mx-auto">
            {/* Back Link */}
            <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 text-sm font-bold text-charcoal/40 hover:text-charcoal transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>

            {/* Brand Header */}
            <header className="mb-16 pb-10 border-b border-black/5">
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-[0.3em] font-bold text-accent-gold block mb-3">Brand</span>
                        <h1 className="text-5xl font-heading font-bold tracking-tighter mb-3">
                            {brand.brand_name || brandSlug}
                        </h1>
                        <p className="text-charcoal/50">
                            {products.length} product{products.length !== 1 ? 's' : ''} available for virtual try-on
                        </p>
                    </div>
                    {brand.shop_domain && !brand.shop_domain.includes('@') && (
                        <a
                            href={brand.shop_domain.startsWith('http') ? brand.shop_domain : `https://${brand.shop_domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-full text-sm font-bold hover:bg-charcoal transition-colors"
                        >
                            Visit Store <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </header>

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-32">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-charcoal/20" />
                    <h3 className="text-xl font-heading font-bold mb-2 text-charcoal/40">No Products Yet</h3>
                    <p className="text-charcoal/30">
                        This brand hasn't added any products to the marketplace yet.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="group relative bg-white overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-black/5">
                            <div className="relative aspect-[3/4] overflow-hidden">
                                {product.primary_image_url ? (
                                    <img
                                        src={product.primary_image_url}
                                        alt={product.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-charcoal/20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center gap-3 p-6">
                                    <Link
                                        href={`/modal?title=${encodeURIComponent(product.title)}&image=${encodeURIComponent(product.primary_image_url || '')}&price=${encodeURIComponent('$' + product.price)}&merchant=${product.merchant_id || ''}&source=marketplace`}
                                        className="w-full py-3 bg-white text-black font-bold rounded-full text-center text-sm scale-90 group-hover:scale-100 transition-transform duration-500 hover:bg-accent-gold hover:text-white"
                                    >
                                        ✨ QUICK TRY-ON
                                    </Link>
                                    {(product.buy_url || product.variantBuyUrl) && (
                                        <a
                                            href={product.buy_url || product.variantBuyUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-transparent border-2 border-white text-white font-bold rounded-full text-center text-sm scale-90 group-hover:scale-100 transition-transform duration-500 hover:bg-white hover:text-black"
                                        >
                                            BUY NOW →
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="p-6">
                                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-charcoal/30 mb-1 block">
                                    {product.category || 'Uncategorized'}
                                </span>
                                <h3 className="text-lg font-heading font-bold mb-1 truncate">{product.title}</h3>
                                <p className="text-base font-medium text-charcoal/80">
                                    {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Price TBD'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
