import js from "@eslint/js";
import eslintPluginVue from "eslint-plugin-vue";
import globals from "globals";
import ts from "typescript-eslint";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...eslintPluginVue.configs["flat/recommended"],
  {
    files: ["*.vue", "**/*.vue"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
    },
  }
);
