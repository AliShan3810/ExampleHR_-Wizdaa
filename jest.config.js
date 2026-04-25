const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFiles: ["<rootDir>/jest.polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000/",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/store/balancesSlice.ts",
    "src/store/requestsSlice.ts",
    "src/components/employee/BalanceCard.tsx",
    "src/components/employee/RequestForm.tsx",
    "src/lib/balanceKey.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      lines: 80,
      functions: 80,
      // Branch coverage is stricter to hit (conditional UI paths); keep floor below statement/line
      branches: 75,
    },
  },
};

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  return {
    ...config,
    // Replace Next's default "/node_modules/" ignore so MSW and its ESM deps are SWC-transpiled.
    transformIgnorePatterns: [
      "/node_modules/(?!msw/)(?!@mswjs/)(?!@open-draft/)(?!rettime/)(?!until-async/)(?!is-node-process/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};
