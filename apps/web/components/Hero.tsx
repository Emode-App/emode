import { HeroDemo } from './HeroDemo';
import Link from 'next/link';

export const Hero = () => {
    // pt-40 left roughly 80px of dead space below a nav that is only ~72px tall.
    // Clear the nav and stop.
    return (
        <section className="relative pt-24 md:pt-28 pb-16 overflow-hidden">
            <div className="max-w-[90rem] mx-auto px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 flex-shrink-0 mb-2 lg:mb-0 pr-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-semibold uppercase tracking-widest text-charcoal mb-6">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        The Future of Fashion
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-[6rem] xl:text-[7rem] font-heading font-bold leading-[0.9] tracking-tighter mb-6">
                        DRESS WITHOUT <br />
                        <span className="bg-purple-gradient bg-clip-text text-transparent underline decoration-accent-gold/30">LIMITS.</span>
                    </h1>

                    <p className="text-xl text-charcoal/70 leading-relaxed mb-8 max-w-lg">
                        Professional-grade virtual try-ons for the modern shopper.
                        Experience high-fashion collections in your digital dressing room.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <a href="#pricing" className="btn-primary group !rounded-full py-4 px-10 hover:shadow-xl hover:shadow-purple-500/20 transition-all flex items-center">
                            Start styling
                            <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                        </a>
                        <Link href="/marketplace" className="px-10 py-4 border border-black/10 rounded-full font-semibold hover:bg-black hover:text-white transition-all">
                            Explore Marketplace
                        </Link>
                    </div>
                </div>

                {/* Interactive Demo Widget - Takes up remaining 7 columns to be massive */}
                <div className="lg:col-span-7 w-full z-20 relative">
                    <HeroDemo />
                </div>
            </div>

            {/* Visual Accent */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none select-none">
                <div className="w-full h-full bg-gradient-to-l from-purple-500/30 to-transparent blur-3xl rounded-full translate-x-1/2"></div>
            </div>
        </section>
    );
};
