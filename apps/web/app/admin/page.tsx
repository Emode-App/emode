import { BarChart3, Users, Package, Zap, RefreshCw, Crown } from 'lucide-react';
import { getMerchantForUser, serviceClient } from './admin-util';
import { WidgetInstallCode } from './components/WidgetInstallCode';

async function getStats(merchantId?: string) {
    // Build queries — filter by merchant if available
    const genQuery = serviceClient.from('generations').select('*', { count: 'exact', head: true });
    const merchantQuery = serviceClient.from('merchants').select('*', { count: 'exact', head: true });
    const productQuery = serviceClient.from('products').select('*', { count: 'exact', head: true });
    const usageQuery = serviceClient.from('usage_counters')
        .select('*', { count: 'exact', head: true })
        .eq('date', new Date().toISOString().split('T')[0]);

    if (merchantId) {
        genQuery.eq('merchant_id', merchantId);
        productQuery.eq('merchant_id', merchantId);
        usageQuery.eq('subject_id', merchantId);
    }

    const [
        { count: totalGenerations },
        { count: activeMerchants },
        { count: totalProducts },
        { count: todayGenerations },
    ] = await Promise.all([genQuery, merchantQuery, productQuery, usageQuery]);

    return {
        totalGenerations: totalGenerations || 0,
        activeMerchants: activeMerchants || 0,
        totalProducts: totalProducts || 0,
        todayGenerations: todayGenerations || 0,
    };
}

async function getTopProducts(merchantId?: string) {
    const query = serviceClient
        .from('products')
        .select('id, title, primary_image_url, merchant_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (merchantId) {
        query.eq('merchant_id', merchantId);
    }

    const { data: products } = await query;

    if (!products || products.length === 0) return [];

    const productStats = await Promise.all(
        products.map(async (product) => {
            const genQ = serviceClient
                .from('generations')
                .select('*', { count: 'exact', head: true })
                .eq('product_id', product.id);
            const { count } = await genQ;
            return { ...product, tryOnCount: count || 0 };
        })
    );

    return productStats.sort((a, b) => b.tryOnCount - a.tryOnCount);
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const merchant = await getMerchantForUser();
    const stats = await getStats(merchant?.id);
    const topProducts = await getTopProducts(merchant?.id);

    const statCards = [
        {
            label: merchant ? 'Your Try-Ons' : 'Total Try-Ons',
            value: stats.totalGenerations.toLocaleString(),
            icon: <BarChart3 className="w-5 h-5" />,
        },
        {
            label: merchant ? 'Your Plan' : 'Active Merchants',
            value: merchant ? merchant.plan?.toUpperCase() || 'FREE' : stats.activeMerchants.toLocaleString(),
            icon: merchant ? <Crown className="w-5 h-5" /> : <Users className="w-5 h-5" />,
        },
        {
            label: merchant ? 'Your Products' : 'Total Products',
            value: stats.totalProducts.toLocaleString(),
            icon: <Package className="w-5 h-5" />,
        },
        {
            label: "Today's Generations",
            value: stats.todayGenerations.toLocaleString(),
            icon: <Zap className="w-5 h-5" />,
        },
    ];

    return (
        <>
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase">
                        {merchant ? `${merchant.brand_name || 'Your'} Dashboard` : 'Admin Analytics'}
                    </h1>
                    <p className="text-charcoal/50">
                        {merchant ? 'Your widget performance at a glance.' : 'Live data from your Supabase database.'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <a
                        href="/admin"
                        className="px-6 py-2 bg-obsidian text-white rounded-md font-bold text-sm shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> REFRESH
                    </a>
                </div>
            </header>

            {/* Merchant ID for widget install */}
            {merchant && (
                <div className="flex justify-center w-full mb-12">
                    <WidgetInstallCode merchantId={merchant.id} />
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="p-8 bg-white rounded-2xl shadow-sm border border-black/5">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-off-white rounded-lg text-charcoal">{stat.icon}</div>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-heading font-bold tracking-tighter">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Top Products Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                <h3 className="text-xl font-heading font-bold mb-6">
                    {merchant ? 'YOUR TOP PRODUCTS' : 'TOP PERFORMING PRODUCTS'}
                </h3>
                {topProducts.length === 0 ? (
                    <div className="text-center py-12 text-charcoal/40">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest">No products yet</p>
                        <p className="text-xs mt-2">
                            {merchant
                                ? 'Products will appear here once customers use your widget.'
                                : 'Products will appear here once merchants add them.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {topProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-4 border-b border-black/5 last:border-0 hover:bg-off-white transition-colors rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-black/5 overflow-hidden">
                                        {product.primary_image_url && (
                                            <img
                                                src={product.primary_image_url}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{product.title}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">
                                            ID: {product.id.slice(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{product.tryOnCount.toLocaleString()} Try‑ons</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
