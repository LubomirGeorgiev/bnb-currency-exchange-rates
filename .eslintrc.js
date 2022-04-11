module.exports = {
  ignorePatterns: ['*.d.ts', '*.js'],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module' // Allows for the use of imports
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended' // Uses the recommended rules from the @typescript-eslint/eslint-plugin
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    '@typescript-eslint/no-non-null-assertion': 'off',
    "no-empty": ["error", { "allowEmptyCatch": true }],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'semi': ['error', 'never'],
    'array-element-newline': ['error',
      {
        'multiline': true,
        'minItems': 3
      }
    ]
  }
};
