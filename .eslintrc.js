module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  extends: [
    'eslint-config-airbnb-base',
  ],
  parserOptions: {
  },
  rules: {
    'no-console': 'off',
  },
  globals: {
  },
  overrides: [
    {
      files: [
        '**/src/**/*.spec.js',
      ],
    },
  ],
};
