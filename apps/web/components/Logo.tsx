'use client';

import { useState } from 'react';

/**
 * The emode wordmark.
 *
 * Falls back to type when the image is missing, which is not defensiveness for
 * its own sake: the brand asset sits in public/ and a bad deploy, a stripped
 * build or a path typo would otherwise leave a broken-image icon in the header of
 * every page. Type degrades to something that still reads as the brand.
 *
 * The italic wordmark used to be set with pr-4 hanging off it — padding added to
 * stop the last glyph being clipped. Italic type overhangs its box, and a
 * gradient clipped to the text compounds it, so the tail of the final letter was
 * cut off. Padding is the wrong tool: it moves the problem and pushes the mark
 * off-centre. overflow-visible with a little leading space lets the glyph sit
 * where the typeface intends.
 */
export function Logo({
    variant = 'full',
    className = '',
    imgClassName = '',
}: {
    /** 'full' is the lockup with the wordmark; 'mark' is the E monogram alone. */
    variant?: 'full' | 'mark';
    className?: string;
    imgClassName?: string;
}) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <span
                className={`font-heading font-bold italic bg-purple-gradient bg-clip-text text-transparent overflow-visible inline-block ${className}`}
            >
                emode
            </span>
        );
    }

    return (
        <img
            src={variant === 'mark' ? '/brand/emode-mark.png' : '/brand/emode-logo.png'}
            alt="emode"
            onError={() => setFailed(true)}
            className={`block w-auto object-contain ${imgClassName || 'h-8'} ${className}`}
        />
    );
}
