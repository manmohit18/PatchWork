import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/generated/**", "**/coverage/**"] },
  ...tseslint.configs.recommended,
);
