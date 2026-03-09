import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { spawn, type ChildProcess } from "child_process";

function syncDaemonPlugin() {
  let proc: ChildProcess | null = null;
  return {
    name: "pharmar-sync-daemon",
    configureServer() {
      const syncDir = path.resolve(__dirname, "../Database/sync");
      console.log("[sync-daemon] Avvio sync service...");
      proc = spawn("node", ["dist/index.js"], {
        cwd: syncDir,
        stdio: "inherit",
        env: { ...process.env },
      });
      proc.on("error", (err) => console.error("[sync-daemon] Errore:", err.message));
      proc.on("exit", (code) => {
        if (code !== 0 && code !== null) console.warn(`[sync-daemon] Terminato con codice ${code}`);
      });
    },
    closeBundle() {
      proc?.kill();
      proc = null;
    },
  };
}

const EXT_API_KEY = "6fe02f93e500352fb85ed5aa3b3c20f79f10258a95f02c08c5720cdc4579f7a2";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/med-tracker-dash/" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      // API esterna PharmAR — aggiunge automaticamente x-api-key (server-side, non esposta al browser)
      "/ext-api": {
        target: "http://127.0.0.1:3002",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ext-api/, "/api/v1"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("x-api-key", EXT_API_KEY);
          });
        },
      },
      // Sync service locale — solo per mutazioni Config e trigger sync
      "/sync-api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sync-api/, ""),
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && syncDaemonPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
