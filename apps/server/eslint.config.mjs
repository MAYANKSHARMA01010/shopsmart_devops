import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default [
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            }
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "off",
            "no-empty": ["error", { "allowEmptyCatch": true }]
        }
    },
    {
        ignores: ["dist/", "node_modules/", "prisma/"]
    }
];
