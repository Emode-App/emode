import { getMerchantForUser, serviceClient } from '../admin-util';
import { RealtimeAnalytics, UsageData } from '../components/RealtimeAnalytics';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
    const merchant = await getMerchantForUser();

    // Fetch the last 30 days of usage from usage_counters.
    // Bounded by date rather than just limit(30): the table holds one row per
    // subject per day, so a limit alone would start dropping recent days once
    // more than one subject type is present.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

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

    const { data: usage } = await query;
    const usageData = (usage as UsageData[]) || [];

    return (
        <div>
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase">
                        Generations Analytics
                    </h1>
                    <p className="text-charcoal/50">
                        {merchant
                            ? 'Monitor your daily virtual try-on usage.'
                            : 'Monitor platform-wide virtual try-on usage.'}
                    </p>
                </div>
            </header>

            <RealtimeAnalytics initialData={usageData} merchantId={merchant?.id} />
        </div>
    );
}
