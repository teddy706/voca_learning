import path from "path";
import { defineConfig } from "vitest/config";

// "server-only"는 react-server 조건이 없는 일반 Node 런타임(=vitest)에서 import되면 항상
// 예외를 던지도록 만들어져 있다(Next.js 빌드에서만 조건부로 empty.js로 치환됨) — 리딩버디와
// 동일한 이유로 테스트에서는 빈 모듈로 바꿔치기한다.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
