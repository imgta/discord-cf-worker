import antfu from '@antfu/eslint-config';

export default antfu({
    // Enable stylistic formatting rules
    // stylistic: true,

    // Or customize the stylistic rules
    stylistic: {
        indent: 4, // 4, or 'tab'
        quotes: 'single', // or 'double'
    },

    // TypeScript and Vue are auto-detected, you can also explicitly enable them:
    javascript: true,
    typescript: true,
    vue: true,

    // Disable jsonc and yaml support
    jsonc: false,
    yaml: false,

    // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
    ignores: [
        '**/fixtures',
        // ...globs
    ],
    rules: {
        // note: if you add a rule and it doesn't work, try adding 'style/' before it
        'style/semi': ['error', 'always'],
        'style/comma-dangle': 'off',
        'vue/comma-dangle': 'off',
        'curly': ['error', 'all'],
        'style/arrow-parens': ['error', 'as-needed'],
        'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        'vue/singleline-html-element-content-newline': 'off',
        'vue/html-self-closing': 'off',
        'vue/multiline-html-element-content-newline': 'off',
        'vue/first-attribute-linebreak': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/no-constant-condition': 'off',
        'style/spaced-comment': 'off',
        'n/prefer-global/process': 'off',
        'object-shorthand': 'off',
        'style/max-statements-per-line': ['error', { max: 2 }],
        'no-console': 'warn',
        'unused-imports/no-unused-imports': 'off',
        'vue/html-indent': 'off',
        'style/quote-props': 'off',
        'node/prefer-global/process': 'off',
        'unused-imports/no-unused-vars': 1,
        'style/no-trailing-spaces': 'off',
        'regexp/no-useless-escape': 'off',
        'style/operator-linebreak': 'off',
        'sort-imports': 'off',
    },
});
