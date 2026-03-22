export const Hero = () => {
    return (
        <section className="relative pt-40 pb-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-semibold uppercase tracking-widest text-charcoal mb-8">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        The Future of Fashion
                    </div>

                    <h1 className="text-6xl md:text-8xl font-heading font-bold leading-[0.9] tracking-tighter mb-8">
                        DRESS WITHOUT <br />
                        <span className="bg-purple-gradient bg-clip-text text-transparent underline decoration-accent-gold/30">LIMITS.</span>
                    </h1>

                    <p className="text-xl text-charcoal/70 max-w-xl leading-relaxed mb-10">
                        Professional-grade virtual try-ons for the modern shopper.
                        Experience high-fashion collections in your digital dressing room.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button className="btn-primary group !rounded-full py-4 px-10">
                            Start Your Fitting
                            <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                        </button>
                        <button className="px-10 py-4 border border-black/10 rounded-full font-semibold hover:bg-black hover:text-white transition-all">
                            Explore Marketplace
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Accent */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none select-none">
                <div className="w-full h-full bg-gradient-to-l from-purple-500/30 to-transparent blur-3xl rounded-full translate-x-1/2"></div>
            </div>
        </section>
    );
};
