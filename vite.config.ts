import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Vite plugin to run animation config generator before build
function animationConfigGenerator() {
  return {
    name: 'animation-config-generator',
    config() {
      console.log('🎬 Running animation config generator...');
      const scriptPath = resolve(__dirname, 'scripts/generate-animation-config.ts');
      
      if (!existsSync(scriptPath)) {
        console.warn('⚠️  Generator script not found:', scriptPath);
        return;
      }

      try {
        execSync('npx tsx scripts/generate-animation-config.ts', {
          stdio: 'inherit',
          cwd: __dirname
        });
        console.log('✅ Animation config generated successfully');
      } catch (error) {
        console.error('❌ Failed to generate animation config:', error);
        throw error;
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed ones for the dev proxy)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), animationConfigGenerator()],
    server: {
      port: 3000,
      host: true,
      // Mirror the production /api/openrouter Edge Function in dev so the
      // server-side OPENROUTER_API_KEY never leaks into the client bundle.
      proxy: {
        '/api/openrouter': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: () => '/api/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.OPENROUTER_API_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`);
              }
              proxyReq.setHeader('HTTP-Referer', 'http://localhost:3000');
              proxyReq.setHeader('X-Title', '3D AI Chat (dev)');
            });
          },
        },
      },
    },
    publicDir: 'public',
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
      include: ['wlipsync'],
    },
    build: {
      target: 'es2022',
    },
  };
});
