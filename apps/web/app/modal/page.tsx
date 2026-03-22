'use client';

import { Suspense } from 'react';
import { ModalContent } from './ModalContent';

export default function ModalHost() {
    return (
        <main className="h-screen w-full bg-off-white overflow-hidden">
            <Suspense fallback={<div>Loading...</div>}>
                <ModalContent />
            </Suspense>
        </main>
    );
}
