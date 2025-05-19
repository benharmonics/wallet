import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  build: { target: "esnext" },
  root: ".", // root is the current folder with index.html
  plugins: [tailwindcss(), wasm()],
});
