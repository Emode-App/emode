/**
 * Lint for the extension.
 *
 * Exists because of two bugs shipped in one evening, both of which took out the
 * extension on every site:
 *
 *   1. extractProductContext() referenced `images`, a variable deleted when the
 *      surrounding block was rewritten. It threw on every page.
 *   2. A regular expression assembled through several layers of escaping came
 *      out malformed. An invalid RegExp throws at load.
 *
 * Neither is subtle, and both survived review because content.js is edited by
 * script and there was nothing that would refuse to load it. no-undef catches
 * the first; the parser catches the second. Cheap insurance for a file with no
 * build step and no tests.
 */
export default [
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                // Browser
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                localStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                MutationObserver: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                crypto: 'readonly',
                history: 'readonly',
                location: 'readonly',
                Image: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                CustomEvent: 'readonly',
                MessageEvent: 'readonly',
                getComputedStyle: 'readonly',
                globalThis: 'readonly',
                // Extension
                chrome: 'readonly',
                // Provided by detect.js, which the manifest loads first into the
                // same content-script scope.
                emodeDetect: 'readonly',
            },
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
            'no-redeclare': 'error',
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',
            'no-cond-assign': 'error',
            'no-constant-condition': 'warn',
        },
    },
];
