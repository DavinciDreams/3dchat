import { defineConfig } from 'vite';
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), animationConfigGenerator()],
  server: {
    port: 3000,
    host: true,
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
});
