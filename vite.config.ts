import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // 关键配置：确保打包后资源路径正确，防止白屏
  plugins: [react()],
});