import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MIRROR_TRY_URL } from '../lib/site';

/**
 * Emode Mirror, on the homepage.
 *
 * Placed straight under the hero because it is the one thing on this page a
 * visitor can do in the next thirty seconds without signing up for anything:
 * add a screenshot, take a photo, see it on. The frame on the right is plain
 * decoration -- a mirror outline, not a fake screenshot of a result.
 */
export function MirrorFeature() {
    return (
        <section className="bg-obsidian text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 py-20 md:py-24 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-gold mb-5">
                        New · Emode Mirror
                    </p>
                    <h2 className="text-4xl md:text-6xl font-heading font-bold tracking-tighter leading-[0.95] mb-6">
                        Try on anything.<br />Right now.
                    </h2>
                    <p className="text-lg text-white/60 leading-relaxed max-w-xl mb-10">
                        Add clothes from any store, take a photo, and see them on you — on your phone,
                        your laptop, or life-size on an Emode Mirror in store. No account needed.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a href={MIRROR_TRY_URL}
                            className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full bg-white text-obsidian font-semibold hover:bg-white/90 transition-colors">
                            Try it on now <ArrowRight className="w-4 h-4" />
                        </a>
                        <Link href="/mirror"
                            className="inline-flex items-center justify-center py-3.5 px-8 rounded-full border border-white/20 font-semibold hover:border-white/50 transition-colors">
                            How it works
                        </Link>
                    </div>
                </div>

                <a href={MIRROR_TRY_URL} aria-label="Try Emode Mirror"
                    className="relative mx-auto w-full max-w-[280px] aspect-[9/16] rounded-[2.5rem] border border-white/15 group">
                    <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_50%_45%,rgba(197,160,89,0.28),transparent_65%)] transition-opacity group-hover:opacity-100 opacity-80" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-black tracking-[-0.055em] text-4xl">EMODE.</span>
                        <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.42em] text-accent-gold pl-[0.42em]">Mirror</span>
                        <span className="mt-10 text-sm text-white/50 group-hover:text-white/80 transition-colors">Tap to try it on</span>
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-3 w-40 rounded-[50%] bg-accent-gold/20 blur-md" />
                </a>
            </div>
        </section>
    );
}
