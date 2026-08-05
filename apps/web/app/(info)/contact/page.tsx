import { Metadata } from 'next';
import { Mail, MapPin, MessageSquare, Terminal } from 'lucide-react';
import { SUPPORT_EMAIL, API_EMAIL, FOUNDERS_EMAIL } from '../../../lib/site';
import { EnterpriseBooking } from '../../../components/EnterpriseBooking';

export const metadata: Metadata = {
    title: 'Contact Us | emodeAI',
    description: 'Get in touch with the emodeAI team for support, enterprise pricing, or API help.',
};

export default function ContactPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">Contact Us</h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">We're here to help you scale.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="group p-8 bg-off-white hover:bg-black/5 rounded-2xl border border-black/5 transition-colors text-center md:text-left">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                        <Mail className="w-5 h-5 text-accent-gold" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-2">Support & Billing</h3>
                    <p className="text-sm text-charcoal/60 mb-4">Questions about your plan, stripe invoices, or widget installation?</p>
                    <span className="text-sm font-bold text-obsidian border-b border-black/10 pb-1">{SUPPORT_EMAIL}</span>
                </a>

                <a href={`mailto:${API_EMAIL}`} className="group p-8 bg-off-white hover:bg-black/5 rounded-2xl border border-black/5 transition-colors text-center md:text-left">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                        <Terminal className="w-5 h-5 text-accent-gold" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-2">Developer API</h3>
                    <p className="text-sm text-charcoal/60 mb-4">Building a custom headless integration and need higher rate limits?</p>
                    <span className="text-sm font-bold text-obsidian border-b border-black/10 pb-1">{API_EMAIL}</span>
                </a>
            </div>

            <div className="p-8 bg-black text-white rounded-[32px] relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <MessageSquare className="w-48 h-48" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-3 relative z-10">Enterprise Partnerships</h3>
                <p className="text-white/60 mb-6 relative z-10 max-w-lg">
                    Thousands of SKUs, a stack that isn&apos;t off the shelf, a security review to
                    get through, or volumes the published plans don&apos;t cover. Book a call and
                    we&apos;ll work out what it takes.
                </p>
                <div className="relative z-10">
                    <EnterpriseBooking />
                </div>
            </div>
        </article>
    );
}
