module.exports = {
  plugins: ["jest", "@typescript-eslint"],
  extends: ["plugin:github/recommended", "plugin:prettier/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 9,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  rules: {
    camelcase: ["off"],
    "import/no-namespace": ["off"],
    "no-unused-vars": ["off"],
  },
}
