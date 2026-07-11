import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "camelcase": "error",
            "no-unused-vars": "error",
            "no-undef": "error",
            "eqeqeq": "error"
        }
    }
];