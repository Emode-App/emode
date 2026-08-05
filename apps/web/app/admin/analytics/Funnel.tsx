import { Eye, Sparkles, Users, Percent } from 'lucide-react';

export type FunnelStats = {
    impressions: number;
    impressionVisitors: number;
    tryOns: number;
    tryOnVisitors: number;
    dressingRoomAdds: number;
};

export type ProductRow = {
    id: string;
    title: string;
    image: string | null;
    impressions: number;
    tryOns: number;
};

const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—');

/**
 * What can be measured without order data.
 *
 * Conversion, revenue and returns need orders, which arrive either from the
 * Shopify webhook or from a merchant calling window.emode.trackOrder() on their
 * confirmation page. Plenty of merchants will have neither on day one, and the
 * dashboard was rendering nothing at all for them — AttributionPanel returns
 * null without stats, so the analytics page was a single usage number and a
 * chart. Everything here comes from impressions and generations, which every
 * install produces from the first page view.
 */
export function Funnel({ stats, products }: { stats: FunnelStats; products: ProductRow[] }) {
    const cards = [
        {
            label: 'Product views',
            value: stats.impressions.toLocaleString(),
            sub: `${stats.impressionVisitors.toLocaleString()} shopper${stats.impressionVisitors === 1 ? '' : 's'}`,
            icon: <Eye className="w-5 h-5" />,
        },
        {
            label: 'Try-ons',
            value: stats.tryOns.toLocaleString(),
            sub: `${stats.tryOnVisitors.toLocaleString()} shopper${stats.tryOnVisitors === 1 ? '' : 's'}`,
            icon: <Sparkles className="w-5 h-5" />,
        },
        {
            label: 'Try-on rate',
            value: pct(stats.tryOnVisitors, stats.impressionVisitors),
            sub: 'shoppers who tried something on',
            icon: <Percent className="w-5 h-5" />,
        },
        {
            label: 'Dressing room adds',
            value: stats.dressingRoomAdds.toLocaleString(),
            sub: 'pieces saved to try together',
            icon: <Users className="w-5 h-5" />,
        },
    ];

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {cards.map((c) => (
                    <div key={c.label} className="p-8 bg-white rounded-2xl shadow-sm border border-black/5">
                        <div className="p-2 bg-off-white rounded-lg text-charcoal w-fit mb-4">{c.icon}</div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">{c.label}</p>
                        <h3 className="text-3xl font-heading font-bold tracking-tighter">{c.value}</h3>
                        <p className="text-xs text-charcoal/40 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-10">
                <h3 className="text-xl font-heading font-bold mb-1">BY PRODUCT</h3>
                <p className="text-sm text-charcoal/50 mb-6">
                    Which pieces shoppers want to see on themselves. A high view count with a low
                    try-on rate usually means the photography is already doing the job.
                </p>

                {products.length === 0 ? (
                    <p className="text-charcoal/40 py-8 text-center">
                        Nothing yet. Products appear here as shoppers visit their pages.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-widest text-charcoal/40 border-b border-black/5">
                                    <th className="pb-3 font-bold">Product</th>
                                    <th className="pb-3 font-bold text-right">Views</th>
                                    <th className="pb-3 font-bold text-right">Try-ons</th>
                                    <th className="pb-3 font-bold text-right">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id} className="border-b border-black/[0.03] last:border-0">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-12 rounded bg-off-white overflow-hidden shrink-0">
                                                    {p.image && (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={p.image} alt="" className="w-full h-full object-contain" />
                                                    )}
                                                </div>
                                                <span className="font-bold truncate">{p.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right tabular-nums">{p.impressions.toLocaleString()}</td>
                                        <td className="py-4 text-right tabular-nums">{p.tryOns.toLocaleString()}</td>
                                        <td className="py-4 text-right tabular-nums font-bold">
                                            {pct(p.tryOns, p.impressions)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Shown in place of the conversion panel when there is no order data.
 *
 * Rendering nothing was worse than saying nothing: the merchant is told on the
 * pricing page that emode measures revenue impact, then finds a dashboard with
 * no mention of it and no way to tell whether it is broken, still loading, or
 * waiting on them.
 */
export function ConversionUnavailable({ isShopify }: { isShopify: boolean }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-10">
            <h3 className="text-xl font-heading font-bold mb-2">REVENUE IMPACT</h3>
            <p className="text-sm text-charcoal/50 mb-6 max-w-2xl leading-relaxed">
                Conversion rate, order value, time from try-on to purchase, and return rates —
                for shoppers who tried something on, against those who didn&apos;t. This needs
                order data, which emode doesn&apos;t have yet.
            </p>

            <div className="p-6 bg-off-white rounded-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                    To turn it on
                </p>
                {isShopify ? (
                    <p className="text-sm text-charcoal/70 leading-relaxed">
                        Orders arrive automatically once Shopify approves emode&apos;s protected
                        customer data request. Nothing for you to do.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-charcoal/70 leading-relaxed mb-4">
                            Call this on your order confirmation page, with the real values from
                            the order:
                        </p>
                        <pre className="p-4 bg-obsidian text-gray-300 rounded-lg text-xs overflow-x-auto font-mono">
{`window.emode?.trackOrder({
  orderId: "1234",
  total: 129.99,
  currency: "USD"
});`}
                        </pre>
                    </>
                )}
            </div>
        </div>
    );
}
