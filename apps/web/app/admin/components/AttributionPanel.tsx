import { TrendingUp, ShoppingCart, Clock, RotateCcw, Info } from 'lucide-react';

export type TryOnStats = {
    tryon_visitors: number;
    control_visitors: number;
    tryon_conversions: number;
    control_conversions: number;
    tryon_revenue: string | number;
    tryon_avg_order_value: string | number;
    baseline_avg_order_value: string | number;
    median_hours_to_purchase: string | number;
    tryon_orders_refunded: number;
    tryon_refund_amount: string | number;
};

const money = (v: string | number) =>
    `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);

function formatPct(v: number | null) {
    return v === null ? '—' : `${v.toFixed(1)}%`;
}

function formatDuration(hours: number) {
    if (!hours) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
}

export function AttributionPanel({ stats }: { stats: TryOnStats | null }) {
    if (!stats) return null;

    const tryOnRate = pct(stats.tryon_conversions, stats.tryon_visitors);
    const controlRate = pct(stats.control_conversions, stats.control_visitors);

    // Only claim lift when there is a control group to compare against.
    // Reporting "conversion: 42%" with nothing beside it invites the merchant to
    // read it as lift, which it is not.
    const lift =
        tryOnRate !== null && controlRate !== null && controlRate > 0
            ? ((tryOnRate - controlRate) / controlRate) * 100
            : null;

    const aov = Number(stats.tryon_avg_order_value || 0);
    const baselineAov = Number(stats.baseline_avg_order_value || 0);
    const aovDelta = baselineAov > 0 ? ((aov - baselineAov) / baselineAov) * 100 : null;

    // Statistical honesty: with a handful of visitors these percentages swing
    // wildly, and a merchant quoting them in a meeting would be embarrassed.
    const thin = stats.tryon_visitors < 30 || stats.control_visitors < 30;

    const cards = [
        {
            label: 'Try-On Conversion',
            value: formatPct(tryOnRate),
            sub: controlRate !== null
                ? `vs ${formatPct(controlRate)} without try-on`
                : 'no control group yet',
            icon: <TrendingUp className="w-5 h-5" />,
            highlight: lift !== null && lift > 0 ? `+${lift.toFixed(0)}% lift` : null,
        },
        {
            label: 'Try-On Revenue',
            value: money(stats.tryon_revenue),
            sub: `${stats.tryon_conversions} attributed orders`,
            icon: <ShoppingCart className="w-5 h-5" />,
            highlight: null,
        },
        {
            label: 'Avg Order Value',
            value: money(aov),
            sub: baselineAov > 0 ? `store avg ${money(baselineAov)}` : 'no baseline yet',
            icon: <ShoppingCart className="w-5 h-5" />,
            highlight: aovDelta !== null && aovDelta > 0 ? `+${aovDelta.toFixed(0)}%` : null,
        },
        {
            label: 'Try-On → Purchase',
            value: formatDuration(Number(stats.median_hours_to_purchase || 0)),
            sub: 'median time to buy',
            icon: <Clock className="w-5 h-5" />,
            highlight: null,
        },
        {
            label: 'Returns',
            value: stats.tryon_orders_refunded.toString(),
            sub: `${money(stats.tryon_refund_amount)} refunded`,
            icon: <RotateCcw className="w-5 h-5" />,
            highlight: null,
        },
    ];

    return (
        <div className="mb-12">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h3 className="text-xl font-heading font-bold tracking-tight">TRY-ON IMPACT</h3>
                    <p className="text-xs text-charcoal/50">
                        Last 30 days. Orders are attributed when the shopper tried an item on before buying.
                    </p>
                </div>
            </div>

            {thin && (
                <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">
                        <b>Not yet statistically meaningful.</b> These rates are based on{' '}
                        {stats.tryon_visitors} try-on {stats.tryon_visitors === 1 ? 'shopper' : 'shoppers'} and{' '}
                        {stats.control_visitors} without. Percentages swing hard at this volume — treat them as
                        directional until both groups pass ~30.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {cards.map((c) => (
                    <div key={c.label} className="p-6 bg-white rounded-2xl shadow-sm border border-black/5">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-off-white rounded-lg text-charcoal">{c.icon}</div>
                            {c.highlight && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    {c.highlight}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 mb-1">
                            {c.label}
                        </p>
                        <h3 className="text-2xl font-heading font-bold tracking-tighter">{c.value}</h3>
                        <p className="text-[11px] text-charcoal/50 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
