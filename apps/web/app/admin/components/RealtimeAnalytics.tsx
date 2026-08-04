"use client";

import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase/browser';
import { BarChart3, TrendingUp, Calendar, Zap, Activity } from 'lucide-react';

export type UsageData = {
    id: string;
    subject_id: string;
    date: string;
    count: number;
};

export function RealtimeAnalytics({ initialData, merchantId }: { initialData: UsageData[], merchantId?: string }) {
    const [data, setData] = useState<UsageData[]>(initialData);
    const [isLive, setIsLive] = useState(false);

    // Format data for Recharts (fill in missing days, sort chronologically)
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return [...data]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                Generations: d.count,
            }));
    }, [data]);

    const totalGenerationsInPeriod = data.reduce((acc, curr) => acc + curr.count, 0);

    useEffect(() => {
        // Subscribe to real-time changes
        const filterStr = merchantId ? `subject_id=eq.${merchantId}` : undefined;
        const channel = supabase.channel('realtime-analytics')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'usage_counters',
                    filter: filterStr,
                },
                (payload) => {
                    const newRecord = payload.new as UsageData;
                    if (!newRecord || !newRecord.id) return;
                    
                    setData(prev => {
                        const existingIdx = prev.findIndex(r => r.id === newRecord.id);
                        if (existingIdx >= 0) {
                            const copy = [...prev];
                            copy[existingIdx] = newRecord;
                            return copy;
                        } else {
                            // Add new record and keep top 30
                            return [...prev, newRecord].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
                        }
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setIsLive(true);
                else setIsLive(false);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchantId]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-obsidian/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl text-white">
                    <p className="font-bold text-xs uppercase tracking-widest text-charcoal/60 mb-2">{label}</p>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(255,193,7,0.8)]"></div>
                        <p className="font-heading font-bold text-2xl">
                            {payload[0].value.toLocaleString()} <span className="text-sm font-medium text-charcoal/50">try-ons</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="p-8 bg-white rounded-2xl shadow-sm border border-black/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Activity className="w-32 h-32" />
                    </div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <TrendingUp className="w-5 h-5 text-accent-gold" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Last 30 Days</h3>
                        {isLive && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-bold tracking-widest uppercase text-green-600 ml-auto">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Live Sync
                            </span>
                        )}
                    </div>
                    <p className="text-5xl font-heading font-bold tracking-tighter relative z-10 text-obsidian">
                        {totalGenerationsInPeriod.toLocaleString()}
                    </p>
                    <p className="text-sm text-charcoal/50 mt-1 relative z-10 font-medium">Platform try-ons generated</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        GENERATION VELOCITY
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-accent-gold"></span> Try-Ons
                        </span>
                    </div>
                </div>

                {chartData.length === 0 ? (
                    <div className="text-center py-20 text-charcoal/40 border border-dashed border-black/10 rounded-2xl">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest mb-2">No usage data</p>
                        <p className="text-xs">Your generation velocity chart will appear here.</p>
                    </div>
                ) : (
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000000" strokeOpacity={0.05} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#8F939D', fontSize: 12, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#8F939D', fontSize: 12, fontWeight: 600 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8A2BE2', strokeWidth: 2, strokeDasharray: '5 5' }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="Generations" 
                                    stroke="#8A2BE2" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorGenerations)" 
                                    activeDot={{ r: 8, fill: '#FFC107', stroke: '#fff', strokeWidth: 3 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
