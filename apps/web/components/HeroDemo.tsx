"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Sparkles, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toDownscaledDataUrl } from '../lib/image';
import { readJson } from '../lib/http';

// Real Logical catalog rather than stock photos, so the demo shows the product
// working on the same garments a merchant would actually sell. Self-hosted from
// public/ instead of a Shopify CDN URL — the landing page must not break if a
// dev store is deleted.
//
// `path` is served two ways: next/image optimizes it for the thumbnail, while
// generation needs the original absolute URL (the API fetches it server-side,
// where a relative path would not resolve).
const PREDEFINED_GARMENTS = [
  {
    id: 'suede-bomber',
    category: 'outerwear',
    name: 'Suede Bomber — Harvest',
    path: '/demo/suede-bomber.png',
  },
  {
    id: 'denim-jacket',
    category: 'outerwear',
    name: 'Denim Workwear — Washed Indigo',
    path: '/demo/denim-jacket.png',
  },
  {
    id: 'sherpa-bomber',
    category: 'outerwear',
    name: 'Sherpa Bomber — Midnight',
    path: '/demo/sherpa-bomber.png',
  },
  {
    id: 'hybrid-pants',
    category: 'bottoms',
    name: 'Hybrid Denim-Leather — Contrast',
    path: '/demo/hybrid-pants.png',
  },
];

export const HeroDemo = () => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        setError("HEIC images from iPhones are not supported in browsers yet. Please upload a JPG or PNG.");
        return;
    }

    // Fast, reliable local preview url for massive photos
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    setError(null);

    try {
      // Downscale before sending: a raw phone photo exceeds Vercel's 4.5 MB
      // request body cap once base64-encoded, and the resulting 413 comes back
      // as plain text rather than JSON.
      setUserImage(await toDownscaledDataUrl(file));
    } catch (err: any) {
      setError(err.message || 'That image could not be processed.');
      setUserImage(null);
      setPreviewImage(null);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const toggleGarment = (id: string) => {
    setSelectedGarmentIds(prev => 
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!userImage || selectedGarmentIds.length === 0) return;

    setIsGenerating(true);
    setError(null);

    // Absolute URLs: /api/generate fetches these server-side, so a root-relative
    // path would not resolve.
    const origin = window.location.origin;
    const productImages = selectedGarmentIds
      .map(id => {
        const g = PREDEFINED_GARMENTS.find(g => g.id === id);
        return g ? `${origin}${g.path}` : null;
      })
      .filter(Boolean);

    try {
      // Calling api/generate without merchantId triggers the open-access demo logic
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImage,
          productImages,
          category: selectedGarmentIds.length > 1 ? 'outfit' : PREDEFINED_GARMENTS.find(g => g.id === selectedGarmentIds[0])?.category,
          merchantId: 'demo_hero_interactive',
        }),
      });

      const data = await readJson(res);

      setResultImage(data.resultUrl); // The API actually returns resultUrl!
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetDemo = () => {
    setResultImage(null);
    setSelectedGarmentIds([]);
    setUserImage(null);
    if (previewImage) {
        URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setError(null);
  };

  return (
    <div className="w-full relative group perspective-1000">
      {/* Decorative background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-accent-gold rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      
      {/* Main Glassmorphic Card */}
      <div className="relative bg-white/60 backdrop-blur-2xl border border-white/40 p-6 rounded-[32px] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-purple-gradient flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg">Live Try-On Demo</h3>
            <p className="text-xs text-charcoal/60">Upload photo & pick outfit</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {resultImage ? (
          /* Result State */
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Step 3</span>
                <span className="text-xs font-medium text-charcoal/80">Result</span>
              </div>
              <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-black/5 group/result shadow-inner">
                <img src={resultImage} alt="Generated Try-On" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/result:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <span className="text-white text-sm font-bold tracking-widest uppercase">Stunning!</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 mt-6 md:mt-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Success</span>
                </div>
                <h4 className="text-2xl font-heading font-bold mb-4">Your New Look</h4>
                <p className="text-sm text-charcoal/60 leading-relaxed mb-8">
                  {selectedGarmentIds.length > 1
                    ? `${selectedGarmentIds.length} pieces layered into a single outfit and draped over your silhouette by our AI fabric engine.`
                    : 'This item has been seamlessly draped over your silhouette with our AI fabric engine.'}
                </p>
              </div>
              <button
                onClick={resetDemo}
                className="w-full py-4 bg-black text-white font-bold rounded-xl text-sm hover:bg-black/80 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>
        ) : (
          /* Interactive State */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Step 1: Upload (Left Column) */}
            <div className="flex flex-col h-full">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium rounded-xl flex items-start gap-2">
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Step 1</span>
                <span className="text-xs font-medium text-charcoal/80">Your Photo</span>
              </div>
              
              <div 
                onClick={() => !previewImage && fileInputRef.current?.click()}
                className={`relative aspect-square w-full rounded-3xl border-2 border-dashed transition-all overflow-hidden ${previewImage ? 'border-transparent shadow-inner' : 'border-black/10 hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer flex flex-col items-center justify-center'}`}
              >
                {previewImage ? (
                  <>
                    <img 
                      src={previewImage} 
                      alt="User Upload" 
                      className="object-cover w-full h-full absolute inset-0" 
                      onError={() => {
                        setError("This image format could not be processed by your browser. Please upload a standard JPG or PNG.");
                        setUserImage(null);
                        setPreviewImage(null);
                      }}
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUserImage(null); setPreviewImage(null); }}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black backdrop-blur-md rounded-full text-white transition-all shadow-lg z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center p-6 text-center">
                    <Upload className="w-8 h-8 text-charcoal/30 mb-4" />
                    <span className="text-sm font-medium text-charcoal/80 mb-1">Upload Photo</span>
                    <span className="text-xs text-charcoal/50">Full body works best</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* Step 2: Select Items & Generate (Right Column) */}
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 mt-6 md:mt-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Step 2</span>
                  <span className="text-xs font-medium text-charcoal/80">Pick an Outfit</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {PREDEFINED_GARMENTS.map((garment) => {
                    const isSelected = selectedGarmentIds.includes(garment.id);
                    const position = selectedGarmentIds.indexOf(garment.id) + 1;
                    return (
                      <button
                        key={garment.id}
                        onClick={() => toggleGarment(garment.id)}
                        aria-pressed={isSelected}
                        title={garment.name}
                        className={`relative aspect-square w-full rounded-2xl overflow-hidden bg-white/70 transition-all ${isSelected ? 'ring-2 ring-accent-gold ring-offset-2 scale-95' : 'hover:opacity-80'}`}
                      >
                        <Image
                          src={garment.path}
                          alt={garment.name}
                          fill
                          sizes="(max-width: 768px) 45vw, 160px"
                          className="object-contain p-2"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            {/* Numbered so stacking order is legible when layering a full outfit */}
                            <div className="w-6 h-6 bg-accent-gold rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-lg">
                              {position}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-charcoal/40 italic text-right">
                  {selectedGarmentIds.length > 1
                    ? `Layering ${selectedGarmentIds.length} pieces into one outfit`
                    : '* Tap more than one to build a full outfit'}
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!userImage || selectedGarmentIds.length === 0 || isGenerating}
                className={`w-full py-4 mt-6 rounded-2xl font-bold tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-2 ${(!userImage || selectedGarmentIds.length === 0) ? 'bg-black/5 text-charcoal/30 cursor-not-allowed' : 'bg-obsidian text-white hover:bg-black shadow-xl shadow-black/10 hover:-translate-y-1'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Magic...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Try It On
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
