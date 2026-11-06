import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url)).split("\\").join("/");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      // Next's server-only guard throws outside the react-server condition; route handlers are tested in plain Node.
      { find: /^server-only$/, replacement: resolve(root, "test/server-only-stub.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
