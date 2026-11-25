import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const processEnv = {
    NODE_ENV: mode,
    ...env
  };

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    envPrefix: 'REACT_APP_',
    define: {
      'process.env': JSON.stringify(processEnv)
    },
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
