import { getMerchantForUser, serviceClient } from '../admin-util';
import { RealtimeAnalytics, UsageData } from '../components/RealtimeAnalytics';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
    const merchant = await getMerchantForUser();

    // Fetch the last 30 days of usage from usage_counters
    const query = serviceClient
        .from('usage_counters')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

    if (merchant) {
        query.eq('subject_id', merchant.id);
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
