'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Download, Lock, AlertCircle, UserCheck, Trash2, X } from 'lucide-react';
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
 * One-click starting points for the model description.
 *
 * They fill the text field rather than replacing it, so they stay a shortcut
 * instead of a cage — a merchant can click the nearest one and then edit. That
 * also teaches what a useful description looks like, which a dropdown never
 * does.
 *
 * Deliberately not gated behind a higher plan. Presets are the EASIER path;
 * charging for the shortcut while leaving typing free would mean the cheaper
 * plan has more control, not less, and the merchant most likely to want a chip
 * to click is the least likely to pay extra for one.
 *
 * The list is a starting set and openly incomplete — which is the honest state
 * of any such list, and why the field underneath stays free text.
 */
const MODEL_PRESETS = [
    'a woman in her 20s, straight size',
    'a woman in her 30s, size 14',
    'a woman in her 50s, size 8',
    'a man in his 20s, slim build',
    'a man in his 30s, broad build',
    'a man in his 60s, average build',
    'a tall, androgynous adult',
    'a plus-size adult, size 20',
    'a petite adult, under 5ft 3',
    'a wheelchair user, seated',
];

/**
 * Studio — generate a model wearing one of your own products.
 *
 * The product is picked from the merchant's own catalogue rather than uploaded,
 * because emode already holds their product images and asking them to re-upload
 * one would be silly.
 */
export function StudioClient({
    products,
    initialAssets,
    canDescribeScene,
    isPremium,
    initialHouseModelUrl,
}: {
    products: StudioProduct[];
    initialAssets: StudioAsset[];
    canDescribeScene: boolean;
    isPremium: boolean;
    initialHouseModelUrl: string | null;
}) {
    const usable = products.filter((p) => p.primary_image_url);

    // Batch selection. A single product is the common case, so it starts as one
    // rather than making everyone opt in to a mode.
    const [selectedIds, setSelectedIds] = useState<string[]>(usable[0] ? [usable[0].id] : []);
    const [model, setModel] = useState('');
    const [scene, setScene] = useState('');
    const [variations, setVariations] = useState(1);
    const [useHouseModel, setUseHouseModel] = useState(false);
    const [houseModelUrl, setHouseModelUrl] = useState<string | null>(initialHouseModelUrl);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [assets, setAssets] = useState<StudioAsset[]>(initialAssets);
    /** The shot being viewed full size. Null when the lightbox is closed. */
    const [viewing, setViewing] = useState<StudioAsset | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Escape closes the lightbox. People expect it, and without it the only way
    // out of a full-screen image is hunting for the X.
    useEffect(() => {
        if (!viewing) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [viewing]);

    const deleteAsset = async (assetId: string) => {
        setDeleting(assetId);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/assets/model-shot', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id: assetId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not delete that shot.');

            setAssets((prev) => prev.filter((a) => a.id !== assetId));
            setViewing((v) => (v && v.id === assetId ? null : v));
            // The server clears the house model when its image is deleted; mirror
            // that here so the badge does not stay lit on a shot that is gone.
            if (data.clearedHouseModel) setHouseModelUrl(null);
        } catch (err: any) {
            setError(err.message || 'Could not delete that shot.');
        } finally {
            setDeleting(null);
        }
    };

    const toggleProduct = (id: string) => {
        if (!isPremium) return setSelectedIds([id]); // No batch below Growth.
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    const setHouseModel = async (assetId: string | null) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/assets/model-shot', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ assetId }),
            });
            const data = await res.json();
            if (res.ok) setHouseModelUrl(data.houseModelUrl);
            else setError(data.error);
        } catch {
            setError('Could not update the house model.');
        }
    };

    const generate = async () => {
        if (!selectedIds.length) return;
        setBusy(true);
        setError(null);
        setProgress({ done: 0, total: selectedIds.length });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Your session expired. Refresh and try again.');

            const failures: string[] = [];

            // One request per product, in sequence, rather than one request for
            // the batch. A serverless function has a wall-clock limit and fifty
            // products would blow through it; this also lets progress move and a
            // single failure not take the rest down.
            for (const productId of selectedIds) {
                const res = await fetch('/api/assets/model-shot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ productId, model, scene, variations, useHouseModel }),
                });
                const data = await res.json();

                if (!res.ok) {
                    failures.push(usable.find((p) => p.id === productId)?.title || 'a product');
                } else {
                    setAssets((prev) => [
                        ...(data.assets || []).map((a: { id: string; url: string }) => ({
                            id: a.id,
                            product_id: productId,
                            public_url: a.url,
                            options: { model: model || null, scene: scene || null },
                            created_at: new Date().toISOString(),
                        })),
                        ...prev,
                    ]);
                }

                setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
            }

            if (failures.length) {
                setError(
                    failures.length === selectedIds.length
                        ? 'None of those could be generated.'
                        : `Couldn’t generate: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? ` and ${failures.length - 3} more` : ''}.`
                );
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
            setProgress(null);
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

    const selectedCount = selectedIds.length;

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 mb-16">
                <div>
                    <div className="flex items-baseline justify-between mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40">
                            {isPremium ? 'Pick products' : 'Pick a product'}
                        </p>
                        {isPremium && (
                            <button
                                onClick={() =>
                                    setSelectedIds(
                                        selectedCount === usable.length ? [] : usable.map((p) => p.id)
                                    )
                                }
                                className="text-[11px] font-bold uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors"
                            >
                                {selectedCount === usable.length ? 'Clear' : `Select all ${usable.length}`}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {usable.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => toggleProduct(p.id)}
                                className={`text-left rounded-xl overflow-hidden border-2 transition-all bg-white ${
                                    selectedIds.includes(p.id)
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
                        {selectedCount === 0
                            ? 'Nothing selected'
                            : selectedCount === 1
                                ? usable.find((p) => p.id === selectedIds[0])?.title
                                : `${selectedCount} products`}
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
                        placeholder="Describe them, or pick a starting point below"
                        className="w-full bg-off-white border border-black/10 rounded-xl py-3 px-4 text-sm mb-3 focus:outline-none focus:border-accent-gold transition-colors"
                    />

                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {MODEL_PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setModel(preset)}
                                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                    model === preset
                                        ? 'bg-obsidian text-white border-obsidian'
                                        : 'bg-white border-black/10 text-charcoal/60 hover:border-black/30'
                                }`}
                            >
                                {preset}
                            </button>
                        ))}
                        {model && (
                            <button
                                type="button"
                                onClick={() => setModel('')}
                                className="px-2.5 py-1 rounded-full text-[11px] text-charcoal/40 hover:text-charcoal underline"
                            >
                                clear
                            </button>
                        )}
                    </div>

                    <p className="text-[11px] text-charcoal/40 mb-6 leading-relaxed">
                        Pick one and edit it, or write your own — describe whoever your
                        customer actually is. Blank means we won&apos;t choose for you beyond
                        &ldquo;an adult&rdquo;.
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

                    {/* House model. The reason a lookbook books one model for a
                        season is consistency, and it is exactly what a written
                        description cannot give you — the same words produce a
                        different face every time. */}
                    <div className="mb-6 pt-6 border-t border-black/5">
                        <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3 flex items-center gap-2">
                            House model
                            {!isPremium && <Lock className="w-3 h-3" />}
                        </label>

                        {houseModelUrl ? (
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={houseModelUrl}
                                    alt="Your house model"
                                    className="w-12 h-16 rounded-lg object-cover bg-off-white shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useHouseModel}
                                            onChange={(e) => setUseHouseModel(e.target.checked)}
                                            disabled={!isPremium}
                                            className="accent-black"
                                        />
                                        Use the same person
                                    </label>
                                    <button
                                        onClick={() => { setHouseModel(null); setUseHouseModel(false); }}
                                        className="text-[11px] text-charcoal/40 hover:text-charcoal underline mt-1"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[11px] text-charcoal/40 leading-relaxed">
                                {isPremium
                                    ? 'Generate a shot you like, then set it as your house model from the library below. Every shot after that uses the same person.'
                                    : 'One model across your whole catalogue, on Growth and Lifetime Founder.'}
                            </p>
                        )}
                    </div>

                    {/* Variations: each is a separate model call, which is why it
                        is capped and why it sits on the higher tier. */}
                    <div className="mb-6">
                        <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3 flex items-center gap-2">
                            Takes per product
                            {!isPremium && <Lock className="w-3 h-3" />}
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((n) => (
                                <button
                                    key={n}
                                    onClick={() => isPremium && setVariations(n)}
                                    disabled={!isPremium && n > 1}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                        variations === n
                                            ? 'bg-obsidian text-white border-obsidian'
                                            : 'bg-white border-black/10 text-charcoal/50 hover:border-black/30'
                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-charcoal/40 mt-2 leading-relaxed">
                            {isPremium
                                ? 'More takes, pick the best. Each one counts against your daily allowance.'
                                : 'Multiple takes are on Growth and Lifetime Founder.'}
                        </p>
                    </div>

                    <button
                        onClick={generate}
                        disabled={busy || !selectedCount}
                        className="w-full btn-generate py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4" />
                        {busy
                            ? 'Shooting…'
                            : selectedCount > 1
                                ? `Generate ${selectedCount * variations} shots`
                                : variations > 1
                                    ? `Generate ${variations} takes`
                                    : 'Generate model shot'}
                    </button>

                    {busy && (
                        <div className="mt-3">
                            {progress && progress.total > 1 && (
                                <div className="h-1 bg-black/5 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-obsidian transition-all duration-500"
                                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                                    />
                                </div>
                            )}
                            <p className="text-[11px] text-charcoal/40 text-center">
                                {progress && progress.total > 1
                                    ? `${progress.done} of ${progress.total} products`
                                    : 'Usually 10–20 seconds.'}
                            </p>
                        </div>
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
                                {/* A button, not a bare img: opening the full size is
                                    a real action and should be reachable by keyboard
                                    and announced as such. */}
                                <button
                                    type="button"
                                    onClick={() => setViewing(a)}
                                    className="block w-full cursor-zoom-in"
                                    aria-label="View this shot full size"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.public_url} alt="Generated model shot" className="w-full block" />
                                </button>
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isPremium && (
                                        <button
                                            onClick={() => { setHouseModel(a.id); setUseHouseModel(true); }}
                                            title="Use this person for every shot"
                                            aria-label="Set as house model"
                                            className={`w-9 h-9 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${
                                                houseModelUrl === a.public_url
                                                    ? 'bg-accent-gold text-black'
                                                    : 'bg-white/90 hover:bg-white'
                                            }`}
                                        >
                                            <UserCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    <a
                                        href={a.public_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                                        aria-label="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    {/* Confirmed, because a generated shot costs a real
                                        image generation and there is no undo — the row
                                        and the file both go. */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Delete this shot? This cannot be undone.')) deleteAsset(a.id);
                                        }}
                                        disabled={deleting === a.id}
                                        aria-label="Delete this shot"
                                        title="Delete"
                                        className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
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

            {/* Full size, in place. Opening a new tab to look at your own image
                loses the page you were working on, and a download just to see
                something is worse still. */}
            {viewing && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
                    onClick={() => setViewing(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Model shot, full size"
                >
                    <button
                        onClick={() => setViewing(null)}
                        aria-label="Close"
                        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Stop the backdrop handler firing when the image itself is
                        clicked, or the thing you are trying to look at closes. */}
                    <div className="max-w-5xl max-h-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={viewing.public_url}
                            alt="Generated model shot, full size"
                            className="max-h-[80vh] w-auto rounded-xl shadow-2xl"
                        />
                        <div className="flex items-center gap-3">
                            <a
                                href={viewing.public_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2.5 rounded-xl bg-white text-obsidian text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Download
                            </a>
                            <button
                                onClick={() => {
                                    if (window.confirm('Delete this shot? This cannot be undone.')) deleteAsset(viewing.id);
                                }}
                                disabled={deleting === viewing.id}
                                className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors inline-flex items-center gap-2 disabled:opacity-40"
                            >
                                <Trash2 className="w-4 h-4" /> {deleting === viewing.id ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                        {(viewing.options?.model || viewing.options?.scene) && (
                            <p className="text-xs text-white/50">
                                {[viewing.options.model, viewing.options.scene].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                </div>
            )}
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
