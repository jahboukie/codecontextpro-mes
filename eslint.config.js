// ESLint 9 flat config for CI/CD compatibility
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module'
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                global: 'readonly',
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptEslint
        },
        rules: {
            // Minimal rules for CI/CD compatibility
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off' // Allow console.log for development
        }
    },
    {
        ignores: ['dist/', 'node_modules/', '*.js', '*.d.ts']
    }
];
