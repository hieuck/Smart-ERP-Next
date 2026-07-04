import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", ".next-dev/**", "dist/**", "node_modules/**"],
  },
  {
    rules: {
      // New experimental react-hooks rules are not compatible with the current codebase.
      // They would require significant refactors (component hoisting, effect rewrites, ref access).
      "react-hooks/static-components": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default config;
