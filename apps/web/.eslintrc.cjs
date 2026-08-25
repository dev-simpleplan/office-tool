module.exports = {
  extends: ["../../packages/config/eslint-preset.cjs"],
  env: { browser: true, es2022: true },
  settings: { react: { version: "detect" } },
};
