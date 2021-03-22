module.exports = {
  ignorePatterns: ['*.d.ts'],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module' // Allows for the use of imports
  },
  extends: [
    'plugin:@typescript-eslint/recommended' // Uses the recommended rules from the @typescript-eslint/eslint-plugin
  ],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'array-element-newline': ['error',
      {
        'multiline': true,
        'minItems': 3
      }
    ]
  }
};
