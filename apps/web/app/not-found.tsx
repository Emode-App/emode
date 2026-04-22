import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-off-white">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-black/5 max-w-md">
                <h2 className="text-6xl font-heading font-bold mb-4">404</h2>
                <p className="text-charcoal/60 mb-8">
                    We could not find the page you were looking for.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-obsidian text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
