import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export default function MarketplaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen bg-[#F5F5F0]">
            <Navbar />
            {children}
            <Footer />
        </div>
    );
}
