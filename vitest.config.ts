import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    // RLS tests hit a real Postgres instance over the network — give them room.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js resolves "server-only" to a no-op via its "react-server"
      // export condition (see node_modules/server-only/package.json); Vitest
      // doesn't know that condition, so without this alias every test that
      // imports a Route Handler (which transitively imports server-only
      // domain modules) would hit the package's intentional throw. Test-only
      // — doesn't touch how Next.js actually builds/runs the app.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
