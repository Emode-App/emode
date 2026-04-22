import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export default function InfoLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-off-white text-charcoal">
            <Navbar />
            <div className="pt-32 pb-24 px-6 md:px-12 flex justify-center">
                <main className="w-full max-w-4xl bg-white p-8 md:p-16 rounded-[32px] shadow-sm border border-black/5 typography-legal">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    );
}
