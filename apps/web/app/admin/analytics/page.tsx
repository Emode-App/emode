import { getMerchantForUser, serviceClient } from '../admin-util';
import { RealtimeAnalytics, UsageData } from '../components/RealtimeAnalytics';
import { AttributionPanel, TryOnStats } from '../components/AttributionPanel';
import { Funnel, ConversionUnavailable, FunnelStats, ProductRow } from './Funnel';

export const dynamic = 'force-dynamic';

/**
 * Everything measurable from impressions and generations alone.
 *
 * Distinct visitor counts are done in JS over the ids rather than in SQL:
 * PostgREST cannot express COUNT(DISTINCT), and a merchant's impression volume
 * is far below the point where pulling ids back matters. Move to an RPC if it
 * ever is.
 */
async function getFunnelStats(merchantId: string): Promise<FunnelStats> {
    const [{ data: impressions }, { data: generations }, { data: rooms }] = await Promise.all([
        serviceClient.from('tryon_impressions').select('visitor_id').eq('merchant_id', merchantId),
        serviceClient.from('generations').select('visitor_id').eq('merchant_id', merchantId),
        serviceClient.from('dressing_rooms').select('id').eq('merchant_id', merchantId),
    ]);

    const roomIds = (rooms || []).map((r: any) => r.id);
    const { count: adds } = roomIds.length
        ? await serviceClient
            .from('dressing_room_items')
            .select('*', { count: 'exact', head: true })
            .in('dressing_room_id', roomIds)
        : { count: 0 };

    const distinct = (rows: any[] | null) =>
        new Set((rows || []).map((r) => r.visitor_id).filter(Boolean)).size;

    return {
        impressions: impressions?.length || 0,
        impressionVisitors: distinct(impressions),
        tryOns: generations?.length || 0,
        tryOnVisitors: distinct(generations),
        dressingRoomAdds: adds || 0,
    };
}

async function getProductRows(merchantId: string): Promise<ProductRow[]> {
    const { data: products } = await serviceClient
        .from('products')
        .select('id, title, primary_image_url')
        .eq('merchant_id', merchantId)
        .limit(50);

    if (!products?.length) return [];

    const rows = await Promise.all(
        products.map(async (p: any) => {
            /**
             * Both sides of the rate have to be the same unit.
             *
             * tryon_impressions holds one row per visitor per product, forever —
             * the upsert dedupes on (merchant, visitor, product). So it is a
             * count of SHOPPERS, not of page views. This used to be divided into
             * a raw count of generations, which is a count of EVENTS, and one
             * shopper trying a jacket five times produced "5 try-ons, 1 view" and
             * a conversion rate of 500%.
             *
             * So the numerator is distinct shoppers too. Raw try-ons stay as
             * their own column, because repeat use is worth seeing — it just is
             * not a conversion rate.
             */
            const [{ count: viewers }, { count: tryOns }, { data: tryOnRows }] = await Promise.all([
                serviceClient
                    .from('tryon_impressions')
                    .select('*', { count: 'exact', head: true })
                    .eq('product_id', p.id),
                serviceClient
                    .from('generation_products')
                    .select('*', { count: 'exact', head: true })
                    .eq('product_id', p.id),
                // Embedded rather than two round trips per product. Distinct is
                // counted in JS for the reason given at the top of this file:
                // PostgREST cannot express COUNT(DISTINCT).
                serviceClient
                    .from('generation_products')
                    .select('generations(visitor_id)')
                    .eq('product_id', p.id),
            ]);

            const tryOnShoppers = new Set(
                (tryOnRows || [])
                    .map((r: any) => r.generations?.visitor_id)
                    .filter(Boolean)
            ).size;

            return {
                id: p.id,
                title: p.title,
                image: p.primary_image_url,
                viewers: viewers || 0,
                tryOns: tryOns || 0,
                tryOnShoppers,
            };
        })
    );

    return rows.sort((a, b) => b.tryOns - a.tryOns || b.viewers - a.viewers);
}

async function getTryOnStats(merchantId: string): Promise<TryOnStats | null> {
    const { data, error } = await serviceClient.rpc('merchant_tryon_stats', {
        p_merchant_id: merchantId,
    });
    if (error) {
        console.error('[analytics] merchant_tryon_stats failed:', error.message);
        return null;
    }
    return (Array.isArray(data) ? data[0] : data) || null;
}

export default async function AdminAnalyticsPage() {
    const merchant = await getMerchantForUser();

    // Bounded by date rather than just limit(30): the table holds one row per
    // subject per day, so a limit alone would start dropping recent days once
    // more than one subject type is present.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const query = serviceClient
        .from('usage_counters')
        .select('*')
        .gte('date', since)
        .order('date', { ascending: false });

    if (merchant) {
        // subject_type matters: 'ip' rows share this table and would otherwise
        // inflate a merchant's numbers.
        query.eq('subject_id', merchant.id).eq('subject_type', 'merchant');
    }

    const [{ data: usage }, funnel, products, tryOnStats] = await Promise.all([
        query,
        merchant ? getFunnelStats(merchant.id) : null,
        merchant ? getProductRows(merchant.id) : [],
        merchant ? getTryOnStats(merchant.id) : null,
    ]);

    // A row of zeros is not the same as having data. Without this the conversion
    // panel renders "0.0%" conversion and "$0" order value as though they were
    // findings rather than an absence of orders.
    const hasOrderData = Boolean(
        tryOnStats &&
        (Number(tryOnStats.tryon_conversions) > 0 || Number(tryOnStats.control_conversions) > 0)
    );

    return (
        <div>
            <header className="mb-12">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase">Analytics</h1>
                <p className="text-charcoal/50">
                    {merchant
                        ? 'How shoppers use try-on in your store.'
                        : 'Monitor platform-wide virtual try-on usage.'}
                </p>
            </header>

            {merchant && funnel && <Funnel stats={funnel} products={products || []} />}

            {hasOrderData
                ? <AttributionPanel stats={tryOnStats} />
                : merchant && <ConversionUnavailable isShopify={merchant.platform === 'shopify'} />}

            <RealtimeAnalytics initialData={(usage as UsageData[]) || []} merchantId={merchant?.id} />
        </div>
    );
}
