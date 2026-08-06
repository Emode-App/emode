import { FlatCompat } from '@eslint/eslintrc';

/**
 * The web app had no ESLint config at all.
 *
 * `next lint` without one does not fail — it asks an interactive question about
 * how you would like to configure ESLint, which in a non-interactive shell means
 * the root `turbo run lint` died on a prompt nobody could answer. So the app that
 * holds the payment webhooks, the generation quota and the auth callbacks was the
 * one part of the monorepo never linted, and the failure looked like tooling
 * noise rather than an absence.
 *
 * Rules are set where they earn their keep on evidence from this codebase, not
 * by taste:
 *
 *   - `no-unused-vars` as a warning, because a stale import is how a half-done
 *     refactor hides.
 *   - `react/no-unescaped-entities` OFF. It fires on every apostrophe in prose
 *     and this app is mostly prose; leaving it on trains people to ignore output,
 *     which is worse than the typography it protects.
 *   - `@next/next/no-img-element` OFF. Product images come from arbitrary
 *     merchant CDNs at runtime, which is exactly what next/image cannot do
 *     without a domain allowlist that cannot be known in advance.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'public/**',
            'next-env.d.ts',
            '*.tsbuildinfo',
        ],
    },
    ...compat.extends('next/core-web-vitals'),
    {
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'react/no-unescaped-entities': 'off',
            '@next/next/no-img-element': 'off',

            // React Compiler rules, downgraded to warnings deliberately.
            //
            // These arrived with eslint-config-next and describe a stricter model
            // than this codebase was written against. Two of the nine they found
            // were real and are fixed: a component declared inside a render that
            // re-runs on every realtime tick, and Date.now() read during render
            // in a server-rendered banner. The rest fire on things that are
            // correct here - assigning window.location.href inside an async click
            // handler to reach Stripe Checkout, and reading the clock in a server
            // component that never hydrates.
            //
            // Errors on advisory rules a codebase predates train people to ignore
            // lint output, which costs more than the rules are worth. Warnings
            // keep them visible and worth working through.
            'react-hooks/purity': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/static-components': 'warn',
        },
    },
]

export default config;
