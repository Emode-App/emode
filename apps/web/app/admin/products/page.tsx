import { getMerchantForUser, serviceClient } from '../admin-util';
import { Package, Globe, EyeOff, MoreVertical } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
    const merchant = await getMerchantForUser();

    // Fetch products.
    //
    // This previously selected `variants(id, title, price)`. There is no `title`
    // column on variants, so PostgREST rejected the whole query and returned
    // null — and because only `data` was destructured, the error was swallowed
    // and the page rendered "No products found" while the dashboard listed the
    // same products fine. The join was never used in the markup anyway.
    const query = serviceClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (merchant) {
        query.eq('merchant_id', merchant.id);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
        // Surface it rather than showing an empty state that looks like
        // "you have no products".
        console.error('[admin/products] Failed to load products:', productsError);
    }

    // Try-on counts come from generation_products, not generations.product_id.
    //
    // generations holds one product_id — the page the modal was opened from — so
    // a garment that was only ever worn as part of an outfit reads zero here,
    // which is the same bug the overview and analytics pages had. Three pages
    // counted the same thing three separate ways; this is the third.
    let productStats = products || [];
    if (productStats.length > 0) {
        productStats = await Promise.all(
            productStats.map(async (product) => {
                const { count } = await serviceClient
                    .from('generation_products')
                    .select('*', { count: 'exact', head: true })
                    .eq('product_id', product.id);
                return { ...product, tryOnCount: count || 0 };
            })
        );
    }

    return (
        <div>
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase">
                        {merchant ? 'Your Products' : 'All Products'}
                    </h1>
                    <p className="text-charcoal/50">
                        {merchant
                            ? 'Manage your products and their marketplace visibility.'
                            : 'View all products across the platform.'}
                    </p>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-off-white border-b border-black/5">
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-charcoal/40">Product</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-charcoal/40">Category</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-charcoal/40">Try-Ons</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-charcoal/40">Marketplace</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-charcoal/40 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productStats.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-charcoal/40">
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p className="text-sm font-bold uppercase tracking-widest mb-2">No products found</p>
                                        <p className="text-xs">
                                            {merchant
                                                ? "When customers try on your items using the widget, they'll appear here."
                                                : "No products exist in the database."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                productStats.map((product) => (
                                    <tr key={product.id} className="border-b border-black/5 hover:bg-off-white/50 transition-colors">
                                        <td className="p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-black/5 overflow-hidden shrink-0">
                                                {product.primary_image_url && (
                                                    <img
                                                        src={product.primary_image_url}
                                                        alt={product.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm line-clamp-1">{product.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">
                                                        ID: {product.id.slice(0, 8)}...
                                                    </span>
                                                    {!merchant && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-black/5 rounded-full uppercase tracking-wider font-bold">
                                                            {product.merchant_id?.slice(0, 8)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs px-2.5 py-1 bg-black/5 rounded-md font-medium capitalize">
                                                {product.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-sm">
                                            {product.tryOnCount.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            {product.marketplace_visible ? (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md inline-flex">
                                                    <Globe className="w-3.5 h-3.5" /> Visible
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal/40 bg-black/5 px-2.5 py-1 rounded-md inline-flex">
                                                    <EyeOff className="w-3.5 h-3.5" /> Hidden
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={product.buy_url || `https://${merchant?.shop_domain}`}
                                                target="_blank"
                                                className="text-xs font-bold text-accent-gold hover:underline mr-4"
                                            >
                                                View Store
                                            </Link>
                                            <button className="text-charcoal/40 hover:text-charcoal p-1 rounded-md transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
