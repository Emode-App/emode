'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Upload, ShoppingCart, RefreshCw, LayoutGrid, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/browser';
import { toDownscaledDataUrl } from '../../lib/image';
import { readJson } from '../../lib/http';

interface DressingItem {
    id: string;
    title: string;
    image: string;
    price: string;
}

export interface ModalContentProps {
    initialProduct?: {
        title: string;
        image: string;
        price: string;
    };
    onClose?: () => void;
}

export function ModalContent({ initialProduct, onClose }: ModalContentProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Initial State Setup
    const defaultTab = (searchParams.get('tab') as 'try-on' | 'dressing-room') || 'try-on';
    const [activeTab, setActiveTab] = useState<'try-on' | 'dressing-room'>(defaultTab);
    const [image, setImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [converting, setConverting] = useState(false);

    // Dressing Room State
    const [dressingRoomItems, setDressingRoomItems] = useState<DressingItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    // Current Product Context - use props if provided, otherwise searchParams
    const product = initialProduct || {
        title: searchParams.get('title') || 'Midnight Blazer',
        image: searchParams.get('image') || 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&h=600&auto=format&fit=crop',
        price: searchParams.get('price') || '$299.00',
    };
    // Shopify's theme extension identifies the store by domain (?shop=), the widget
    // by merchant UUID (?merchant=). Resolve shop → merchant so Shopify try-ons hit
    // the merchant's paid entitlement instead of the shopper's personal free tier.
    const shopDomain = searchParams.get('shop') || '';
    const variantId = searchParams.get('variant') || '';
    // The Shopify theme extension passes Liquid's product.id here; the server
    // resolves it to our products.id so per-product try-on counts work.
    const platformProductId = searchParams.get('product') || '';
    // Minted by the theme extension on the merchant's domain; travels with the
    // generation so an order carrying the same id can be attributed to it.
    const visitorId = searchParams.get('vid') || '';
    const originHost = searchParams.get('origin') || '';
    const [merchantId, setMerchantId] = useState(searchParams.get('merchant') || '');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    useEffect(() => {
        if (merchantId || !shopDomain) return;
        supabase
            .from('merchants')
            .select('id')
            .eq('shop_domain', shopDomain)
            .single()
            .then(({ data }) => {
                if (data?.id) setMerchantId(data.id);
            });
    }, [shopDomain, merchantId]);

    // Anonymous shoppers get a persistent guest ID so the free tier (5/day) works
    // without an account; the server treats it like a user-scoped usage counter.
    const getGuestId = () => {
        try {
            let id = localStorage.getItem('emode_guest_id');
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem('emode_guest_id', id);
            }
            return id;
        } catch {
            return null;
        }
    };

    // Auto-add logic from Widget and Fetch persistence
    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'add') {
            handleAddToDressingRoom();
        }

        // Fetch persisted items
        const fetchDressingRoom = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('dressing_room_items')
                .select(`
                    id,
                    product:products(title, primary_image_url),
                    variant:variants(price)
                `)
                .order('created_at', { ascending: false });

            if (data && !error) {
                const formattedItems = data.map((item: any) => ({
                    id: item.id,
                    title: item.product.title,
                    image: item.product.primary_image_url,
                    price: item.variant.price.toString()
                }));
                setDressingRoomItems(formattedItems);
            }
        };

        fetchDressingRoom();
    }, [searchParams]); // Re-run if URL changes

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setConverting(true);
        setError(null);

        let processedFile = file;

        // Check for HEIC/HEIF
        const isHeic = file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif') ||
            file.type === 'image/heic';

        if (isHeic) {
            try {
                // @ts-ignore
                const heic2any = (await import('heic2any')).default;
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });
                processedFile = new File([Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob],
                    file.name.replace(/\.[^/.]+$/, ".jpg"),
                    { type: 'image/jpeg' }
                );
            } catch (err) {
                console.error('HEIC conversion failed:', err);
                setError('Failed to convert HEIC image. Please try a JPG or PNG.');
                setConverting(false);
                return;
            }
        }

        // Downscale rather than reading the file as-is: a raw phone photo blows
        // past Vercel's 4.5 MB request body cap once base64-encoded, and the 413
        // comes back as plain text, so the client's res.json() failed with an
        // opaque parse error instead of anything actionable.
        try {
            setImage(await toDownscaledDataUrl(processedFile));
            setResult(null); // Clear previous result if swapping
        } catch (err: any) {
            setError(err.message || 'Failed to read file.');
        } finally {
            setConverting(false);
        }
    };

    const handleGenerate = async () => {
        if (!image) return;
        setGenerating(true);
        setError(null);
        setShowUpgrade(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    userImage: image,
                    productImages: selectedIds.length > 0
                        ? dressingRoomItems.filter(i => selectedIds.includes(i.id)).map(i => i.image)
                        : [product.image],
                    title: product.title,
                    merchantId,
                    productId: platformProductId || undefined,
                    visitorId: visitorId || undefined,
                    guestId: session ? undefined : getGuestId(),
                })
            });

            if (response.status === 429) setShowUpgrade(true);
            const data = await readJson(response);

            setResult(data.resultUrl);

            // Generations are recorded server-side in /api/generate. Doing it
            // here only ever worked for signed-in users — never the anonymous
            // storefront shoppers who are almost all of the traffic — and RLS
            // blocked the insert anyway.
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Nano Banana Pro encountered a fabric drape error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleUpgrade = async () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setUpgrading(true);
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: 'chrome_unlimited', userId: user.id, platform: 'consumer' })
            });
            const data = await response.json();
            if (data.url) window.open(data.url, '_blank');
        } catch (err) {
            console.error('Upgrade checkout failed:', err);
        } finally {
            setUpgrading(false);
        }
    };

    const handleAddToDressingRoom = async () => {
        // Optimistic UI update
        setDressingRoomItems(prev => {
            if (prev.some(item => item.image === product.image)) return prev;
            return [...prev, { ...product, id: crypto.randomUUID() }];
        });
        setActiveTab('dressing-room');

        // Persist via the API route (service role) — direct client-side writes to
        // products/variants are blocked by RLS for consumers. Guests keep a
        // session-local dressing room only.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            await fetch('/api/dressing-room/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    title: product.title,
                    image: product.image,
                    price: product.price,
                    url: originHost ? `https://${originHost}` : undefined,
                    merchantId: merchantId || undefined,
                }),
            });
        } catch (err) {
            console.error('Error persisting to Cloud Closet:', err);
        }
    };

    const handleAddToCart = () => {
        const inIframe = window.parent !== window;
        if (inIframe) {
            // The embedding host completes the purchase: the Shopify theme extension
            // posts to /cart/add.js, the widget re-dispatches as an emode:cart-add
            // CustomEvent for the host site. Target '*' — the parent is the
            // retailer's origin, unknowable here, and the payload has no secrets.
            window.parent.postMessage({
                type: 'emode:add-to-cart',
                variantId,
                title: product.title,
                image: product.image,
                price: product.price,
            }, '*');
        } else if (originHost) {
            // Popup context (Chrome extension side panel) — outbound purchase link.
            window.open(`https://${originHost}`, '_blank');
        } else {
            console.warn('[emode] No cart target available in this context.');
        }
    };

    const removeItem = async (id: string) => {
        setDressingRoomItems(prev => prev.filter(item => item.id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        await supabase.from('dressing_room_items').delete().eq('id', id);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex flex-col h-full bg-off-white overflow-hidden">
            {/* Header with Close option for Overlay mode */}
            <div className="flex items-center justify-between px-8 border-b border-black/5 bg-white z-20">
                <nav className="flex items-center gap-10">
                    <button
                        onClick={() => setActiveTab('try-on')}
                        className={`py-5 text-sm font-bold tracking-widest uppercase transition-all ${activeTab === 'try-on' ? 'border-b-2 border-black text-black' : 'text-charcoal/30 hover:text-charcoal'}`}
                    >
                        Try This On
                    </button>
                    <button
                        onClick={() => setActiveTab('dressing-room')}
                        className={`py-5 text-sm font-bold tracking-widest uppercase transition-all ${activeTab === 'dressing-room' ? 'border-b-2 border-black text-black' : 'text-charcoal/30 hover:text-charcoal'}`}
                    >
                        Dressing Room
                        {dressingRoomItems.length > 0 && (
                            <span className="ml-2 bg-black text-white text-[10px] px-2 py-0.5 rounded-full">{dressingRoomItems.length}</span>
                        )}
                    </button>
                </nav>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-off-white rounded-full transition-colors">
                        <X className="w-6 h-6 text-charcoal/40" />
                    </button>
                )}
            </div>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-off-white">
                {activeTab === 'try-on' ? (
                    <>
                        {/* Generation Canvas */}
                        <div className="flex-1 bg-off-white p-4 sm:p-2 flex items-center justify-center relative overflow-hidden min-h-0">
                            <div className="w-full h-full max-w-lg flex items-center justify-center">
                                <div className="w-full relative bg-white rounded-3xl shadow-2xl overflow-hidden group aspect-[3/4] max-h-full">
                                    {result ? (
                                        <div className="w-full h-full relative">
                                            <img src={result} className="w-full h-full object-cover" alt="Generation result" />
                                            <div className="absolute top-4 left-4 flex gap-2">
                                                <button
                                                    onClick={() => setResult(null)}
                                                    className="bg-white/90 backdrop-blur-sm text-black px-4 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                                >
                                                    Back to Photo
                                                </button>
                                                <label className="bg-white/90 backdrop-blur-sm text-black px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all border border-black/5 flex items-center gap-2">
                                                    <RefreshCw className="w-3 h-3" /> Change Photo
                                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    ) : image ? (
                                        <div className="w-full h-full relative">
                                            <img src={image} className="w-full h-full object-cover" alt="User upload" />
                                            {!generating && !converting && (
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <label className="bg-white/90 backdrop-blur-sm text-black px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all border border-black/5 flex items-center gap-2">
                                                        <RefreshCw className="w-3 h-3" /> Change Photo
                                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer border-4 border-dashed border-black/5 hover:border-black/10 transition-colors">
                                            {converting ? (
                                                <RefreshCw className="w-12 h-12 text-accent-gold animate-spin mb-4" />
                                            ) : (
                                                <Upload className="w-12 h-12 text-charcoal/20 mb-4" />
                                            )}
                                            <p className="text-charcoal/40 font-bold text-[10px] sm:text-sm tracking-widest uppercase text-center px-4 sm:px-10">
                                                {converting ? 'Converting Style...' : 'Upload your high-res photo for studio generation'}
                                            </p>
                                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={converting} />
                                        </label>
                                    )}

                                    {(generating || converting) && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-10 text-center z-10">
                                            <RefreshCw className="w-12 h-12 animate-spin mb-6 text-accent-gold" />
                                            <h2 className="text-2xl font-heading font-bold mb-2 tracking-tighter">
                                                {converting ? 'PREPARING IMAGE' : 'GENERATING STYLE'}
                                            </h2>
                                            <p className="text-white/50 text-sm italic font-medium">
                                                {converting ? 'Converting high-fidelity format...' : 'Nano Banana Pro is processing your fabric drape...'}
                                            </p>
                                        </div>
                                    )}

                                    {error && !generating && !converting && (
                                        <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-2 flex flex-col gap-2">
                                            <div className="bg-red-500 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg">
                                                <span>{error}</span>
                                                <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                                            </div>
                                            {showUpgrade && (
                                                <button
                                                    onClick={handleUpgrade}
                                                    disabled={upgrading}
                                                    className="bg-accent-gold text-black px-4 py-3 rounded-xl text-xs font-black tracking-widest uppercase shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                                                >
                                                    {upgrading ? 'Loading...' : 'Upgrade — $5/mo Unlimited'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Controls */}
                        <aside className="w-full md:w-[400px] border-l border-black/5 p-8 flex flex-col gap-8 bg-white overflow-y-auto">
                            <div>
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-gold mb-3 block">Viewing Product</span>
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="w-20 h-24 rounded-lg bg-off-white overflow-hidden shadow-sm">
                                        <img src={product.image} className="w-full h-full object-cover" alt={product.title} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-heading font-bold tracking-tight">{product.title}</h3>
                                        <p className="text-lg font-medium text-charcoal/60">{product.price}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!image || generating}
                                    className="btn-generate py-5 flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-sm disabled:opacity-50"
                                >
                                    {generating ? 'Processing...' : 'Try This On'}
                                </button>
                                <button
                                    onClick={handleAddToDressingRoom}
                                    className="px-8 py-5 border border-black/5 rounded-md font-bold tracking-widest uppercase text-sm hover:bg-off-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add to Dressing Room
                                </button>
                                <button
                                    onClick={handleAddToCart}
                                    className="bg-obsidian text-white py-5 flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-sm rounded-md hover:bg-black transition-all"
                                >
                                    <ShoppingCart className="w-4 h-4" /> {result ? 'Purchase Look' : 'Add to Cart'}
                                </button>
                            </div>

                            {!user && (
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                                    <p className="text-xs text-purple-900 font-medium mb-3">Sign in to save this look to your Cloud Closet and sync across devices.</p>
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition-all uppercase tracking-wider"
                                    >
                                        Sign In to Save
                                    </button>
                                </div>
                            )}

                            <div className="pt-8 border-t border-black/5 text-center">
                                <p className="text-[10px] uppercase tracking-widest text-charcoal/30 font-bold mb-4">Powered by Nano Banana Pro AI</p>
                                <div className="flex justify-center gap-4 grayscale opacity-30">
                                    <Plus className="w-5 h-5" />
                                    <Upload className="w-5 h-5" />
                                    <LayoutGrid className="w-5 h-5" />
                                </div>
                            </div>
                        </aside>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col p-8 bg-off-white overflow-y-auto">
                        <div className="max-w-5xl mx-auto w-full">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-3xl font-heading font-bold tracking-tighter">YOUR DRESSING ROOM</h2>
                                <div className="flex gap-4">
                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('try-on')}
                                            className="px-6 py-3 bg-accent-gold text-black rounded-full font-bold text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-lg"
                                        >
                                            Try {selectedIds.length} Selected
                                        </button>
                                    )}
                                    <button className="px-6 py-3 bg-obsidian text-white rounded-full font-bold text-xs tracking-widest uppercase hover:bg-black transition-all">
                                        Checkout All
                                    </button>
                                </div>
                            </div>

                            {dressingRoomItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <LayoutGrid className="w-16 h-16 text-black/10 mb-6" />
                                    <p className="text-charcoal/50 max-w-md leading-relaxed mb-8">
                                        Your dressing room is empty. Add items from the product page to build your look.
                                    </p>
                                    <button onClick={() => setActiveTab('try-on')} className="text-sm font-bold underline">Go back to Try On</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {dressingRoomItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleSelection(item.id)}
                                            className={`bg-white p-4 rounded-xl shadow-sm relative group cursor-pointer border-2 transition-all ${selectedIds.includes(item.id) ? 'border-accent-gold ring-4 ring-accent-gold/10' : 'border-transparent'}`}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                                className="absolute top-2 right-2 w-8 h-8 bg-black/5 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            {selectedIds.includes(item.id) && (
                                                <div className="absolute top-2 left-2 bg-accent-gold text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-md">
                                                    ✓
                                                </div>
                                            )}
                                            <div className="aspect-[3/4] bg-off-white rounded-lg overflow-hidden mb-4">
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                            </div>
                                            <h3 className="font-bold text-sm mb-1 truncate">{item.title}</h3>
                                            <p className="text-xs text-charcoal/60">{item.price}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
