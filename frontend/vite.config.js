import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const define = {};
  for (const key of new Set(['REACT_APP_API_BASE_URL', 'REACT_APP_CURRENCY', ...Object.keys(env)])) {
    define[`process.env.${key}`] = env[key] === undefined ? 'undefined' : JSON.stringify(env[key]);
  }

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    envPrefix: 'REACT_APP_',
    define,
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: []
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    build: {
      outDir: 'build'
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js'
    }
  };
});
