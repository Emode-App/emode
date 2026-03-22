import { createClient } from '@supabase/supabase-js';
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { ModalContent } from '../modal/ModalContent';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIES = [
    { label: 'All', value: 'all' },
    { label: 'Tops', value: 'tops' },
    { label: 'Bottoms', value: 'bottoms' },
    { label: 'Dresses', value: 'dresses' },
    { label: 'Outerwear', value: 'outerwear' },
    { label: 'Accessories', value: 'accessories' },
    { label: 'Shoes', value: 'shoes' },
];

async function getMarketplaceProducts(category?: string, search?: string, brand?: string) {
    let query = supabase
        .from('products')
        .select(`
            id,
            title,
            primary_image_url,
            category,
            buy_url,
            merchant_id,
            merchants!inner(id, brand_name, brand_slug, shop_domain)
        `)
        .eq('marketplace_visible', true)
        .order('created_at', { ascending: false })
        .limit(24);

    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    if (search) {
        query = query.ilike('title', `%${search}%`);
    }

    if (brand) {
        query = query.eq('merchants.brand_slug', brand);
    }

    const { data: products } = await query;

    // Get prices for each product
    if (products && products.length > 0) {
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
            brand: (p as any).merchants?.brand_name || 'Unknown',
            brandSlug: (p as any).merchants?.brand_slug || '',
        }));
    }

    return [];
}

async function getBrands() {
    const { data } = await supabase
        .from('merchants')
        .select('brand_name, brand_slug')
        .not('brand_slug', 'is', null)
        .order('brand_name');

    return data || [];
}

export const dynamic = 'force-dynamic';

export default async function MarketplacePage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; search?: string; brand?: string }>;
}) {
    const params = await searchParams;
    const products = await getMarketplaceProducts(params.category, params.search, params.brand);
    const brands = await getBrands();
    const activeCategory = params.category || 'all';
    const activeBrand = params.brand || '';

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-heading font-bold mb-4 tracking-tighter">THE MARKETPLACE</h1>
                <p className="text-charcoal/60 text-lg max-w-2xl mx-auto">
                    Discover and virtually try on fashion from the world's most innovative brands.
                </p>
            </header>

            {/* Search & Filters */}
            <div className="mb-10 space-y-6">
                {/* Search */}
                <form className="max-w-xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/30" />
                        <input
                            type="text"
                            name="search"
                            defaultValue={params.search || ''}
                            placeholder="Search products..."
                            className="w-full bg-white border border-black/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                        />
                    </div>
                </form>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-3 justify-center">
                    {CATEGORIES.map(cat => (
                        <Link
                            key={cat.value}
                            href={`/marketplace?category=${cat.value}${params.search ? `&search=${params.search}` : ''}${activeBrand ? `&brand=${activeBrand}` : ''}`}
                            className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                                activeCategory === cat.value
                                    ? 'bg-obsidian text-white shadow-lg'
                                    : 'bg-white text-charcoal/60 hover:bg-black/5 border border-black/10'
                            }`}
                        >
                            {cat.label}
                        </Link>
                    ))}
                </div>

                {/* Brand Pills (if any brands exist) */}
                {brands.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                        <SlidersHorizontal className="w-4 h-4 text-charcoal/30 mt-1" />
                        <Link
                            href={`/marketplace?category=${activeCategory}${params.search ? `&search=${params.search}` : ''}`}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                !activeBrand
                                    ? 'bg-accent-gold text-white'
                                    : 'bg-white text-charcoal/40 hover:bg-black/5 border border-black/5'
                            }`}
                        >
                            All Brands
                        </Link>
                        {brands.map(b => (
                            <Link
                                key={b.brand_slug}
                                href={`/marketplace?category=${activeCategory}&brand=${b.brand_slug}${params.search ? `&search=${params.search}` : ''}`}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                    activeBrand === b.brand_slug
                                        ? 'bg-accent-gold text-white'
                                        : 'bg-white text-charcoal/40 hover:bg-black/5 border border-black/5'
                                }`}
                            >
                                {b.brand_name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Grid */}
            {products.length === 0 ? (
                <div className="text-center py-32">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-charcoal/20" />
                    <h3 className="text-xl font-heading font-bold mb-2 text-charcoal/40">No Products Yet</h3>
                    <p className="text-charcoal/30 max-w-md mx-auto">
                        Products from merchants will appear here as they activate their virtual try-on widgets.
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
                                {/* Hover Overlay */}
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
                                            VISIT STORE →
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="p-6">
                                <Link href={`/marketplace/${product.brandSlug}`}>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-gold mb-2 block hover:text-amber-600 transition-colors">
                                        {product.brand}
                                    </span>
                                </Link>
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
