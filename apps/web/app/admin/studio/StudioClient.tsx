'use client';

import { useState } from 'react';
import { Sparkles, Download, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';

export type StudioProduct = {
    id: string;
    title: string;
    primary_image_url: string | null;
};

export type StudioAsset = {
    id: string;
    product_id: string | null;
    public_url: string;
    options: { model?: string | null; scene?: string | null } | null;
    created_at: string;
};

/**
 * Studio — generate a model wearing one of your own products.
 *
 * The product is picked from the merchant's own catalogue rather than uploaded,
 * because emode already has their products and asking them to re-upload an image
 * it is holding would be silly.
 *
 * Model description is free text with suggestions rather than a fixed list.
 * Any list of body types and skin tones is a list of the ones we thought to
 * include, which on a product about seeing clothes on bodies like yours is the
 * wrong shape of control.
 */
export function StudioClient({
    products,
    initialAssets,
    canDescribeScene,
}: {
    products: StudioProduct[];
    initialAssets: StudioAsset[];
    canDescribeScene: boolean;
}) {
    const usable = products.filter((p) => p.primary_image_url);

    const [selected, setSelected] = useState<string>(usable[0]?.id || '');
    const [model, setModel] = useState('');
    const [scene, setScene] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assets, setAssets] = useState<StudioAsset[]>(initialAssets);

    const generate = async () => {
        if (!selected) return;
        setBusy(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Your session expired. Refresh and try again.');

            const res = await fetch('/api/assets/model-shot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ productId: selected, model, scene }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not generate that.');

            setAssets((prev) => [
                {
                    id: data.assetId || crypto.randomUUID(),
                    product_id: selected,
                    public_url: data.url,
                    options: { model: model || null, scene: scene || null },
                    created_at: new Date().toISOString(),
                },
                ...prev,
            ]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    if (!usable.length) {
        return (
            <div className="p-10 bg-white rounded-2xl border border-black/5 text-center">
                <Package />
                <h2 className="font-bold mb-2">Nothing to shoot yet</h2>
                <p className="text-sm text-charcoal/50 max-w-md mx-auto leading-relaxed">
                    Model shots are generated from your own product images. Products appear
                    here once shoppers start visiting their pages, or as soon as your Shopify
                    catalogue syncs.
                </p>
            </div>
        );
    }

    const current = usable.find((p) => p.id === selected);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 mb-16">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-4">
                        Pick a product
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {usable.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setSelected(p.id)}
                                className={`text-left rounded-xl overflow-hidden border-2 transition-all bg-white ${
                                    selected === p.id
                                        ? 'border-accent-gold ring-4 ring-accent-gold/10'
                                        : 'border-transparent hover:border-black/10'
                                }`}
                            >
                                <div className="aspect-square bg-off-white p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={p.primary_image_url!}
                                        alt={p.title}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <p className="p-3 text-xs font-bold truncate">{p.title}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl border border-black/5 h-fit">
                    <h2 className="font-bold mb-1">
                        {current ? current.title : 'Select a product'}
                    </h2>
                    <p className="text-xs text-charcoal/40 mb-6">
                        Studio shot on white unless you say otherwise.
                    </p>

                    <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                        The model
                    </label>
                    <input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. a woman in her 30s, size 14"
                        className="w-full bg-off-white border border-black/10 rounded-xl py-3 px-4 text-sm mb-2 focus:outline-none focus:border-accent-gold transition-colors"
                    />
                    <p className="text-[11px] text-charcoal/40 mb-6 leading-relaxed">
                        Describe whoever your customer is. Leave it blank and we won&apos;t
                        choose for you beyond &ldquo;an adult&rdquo;.
                    </p>

                    <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2 flex items-center gap-2">
                        The scene
                        {!canDescribeScene && <Lock className="w-3 h-3" />}
                    </label>
                    <input
                        value={scene}
                        onChange={(e) => setScene(e.target.value)}
                        disabled={!canDescribeScene}
                        placeholder={canDescribeScene ? 'e.g. a sunlit loft, concrete floor' : 'White studio'}
                        className="w-full bg-off-white border border-black/10 rounded-xl py-3 px-4 text-sm mb-2 focus:outline-none focus:border-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[11px] text-charcoal/40 mb-6 leading-relaxed">
                        {canDescribeScene
                            ? 'Leave blank for a plain white studio, which is what most product pages want.'
                            : 'Custom scenes are on Growth and Lifetime Founder. Shots are on white until then.'}
                    </p>

                    <button
                        onClick={generate}
                        disabled={busy || !selected}
                        className="w-full btn-generate py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4" />
                        {busy ? 'Shooting…' : 'Generate model shot'}
                    </button>

                    {busy && (
                        <p className="text-[11px] text-charcoal/40 mt-3 text-center">
                            Usually 10–20 seconds.
                        </p>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-heading font-bold mb-1">YOUR ASSETS</h2>
                <p className="text-sm text-charcoal/50 mb-6">
                    Yours to use — product pages, lookbooks, ads, wherever.
                </p>

                {assets.length === 0 ? (
                    <div className="p-12 bg-white rounded-2xl border border-black/5 text-center text-charcoal/40">
                        Nothing generated yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {assets.map((a) => (
                            <div key={a.id} className="group relative bg-white rounded-2xl overflow-hidden border border-black/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.public_url} alt="Generated model shot" className="w-full block" />
                                <a
                                    href={a.public_url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                {(a.options?.model || a.options?.scene) && (
                                    <p className="p-3 text-[11px] text-charcoal/50 truncate">
                                        {[a.options.model, a.options.scene].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

function Package() {
    return (
        <div className="w-12 h-12 rounded-full bg-off-white flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-5 h-5 text-charcoal/30" />
        </div>
    );
}
