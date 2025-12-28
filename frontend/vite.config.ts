import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgrPlugin from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

import { existsSync } from 'fs'

// Custom plugin to resolve @multiversx/sdk-dapp subpaths
const multiversxResolverPlugin = () => ({
  name: 'multiversx-resolver',
  resolveId(source: string) {
    // Handle @multiversx/sdk-dapp/out/* imports
    if (source.startsWith('@multiversx/sdk-dapp/out/')) {
      const subpath = source.replace('@multiversx/sdk-dapp/out/', '')
      const basePath = resolve(__dirname, `node_modules/@multiversx/sdk-dapp/out/${subpath}`)

      // Try different extensions
      const extensions = ['.mjs', '.js', '.cjs', '']
      for (const ext of extensions) {
        const fullPath = `${basePath}${ext}`
        if (existsSync(fullPath)) {
          return { id: fullPath, external: false }
        }
      }

      // If nothing found, try index files
      const indexExtensions = ['/index.mjs', '/index.js', '/index.cjs']
      for (const ext of indexExtensions) {
        const fullPath = `${basePath}${ext}`
        if (existsSync(fullPath)) {
          return { id: fullPath, external: false }
        }
      }
    }
    return null
  }
})

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
    strictPort: false,
    host: true,
    https: {} as any,
    watch: {
      usePolling: false,
      useFsEvents: false
    },
    hmr: {
      overlay: false
    }
  },
  plugins: [
    multiversxResolverPlugin(),
    react(),
    basicSsl(),
    tsconfigPaths(),
    svgrPlugin(),
    nodePolyfills({
      protocolImports: true,
      globals: { Buffer: true, global: true, process: true }
    })
  ],
  css: {
    postcss: './postcss.config.cjs'
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      'protobufjs/minimal': resolve(__dirname, 'node_modules/protobufjs/minimal.js'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'protobufjs', 'protobufjs/minimal'],
    esbuildOptions: {
      resolveExtensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
  },
  build: {
    outDir: 'build',
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs', '.mjs'],
    },
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore "use client" directive warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        // Ignore unresolved imports for SDK packages - they will resolve at runtime
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter?.includes('@multiversx')) {
          return;
        }
        warn(warning);
      },
    }
  },
  preview: {
    port: 3002,
    https: {} as any,
    host: 'localhost',
    strictPort: true
  }
})
