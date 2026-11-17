import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// GitHub Pages 地址为 https://<用户名>.github.io/laojia-yuanzi/，所以生产构建的 base 必须是仓库名路径
const REPO_BASE = '/laojia-yuanzi/';

export default defineConfig(({ command, mode, isPreview }) => {
  // `npm run build:single` → dist-single/index.html，所有 JS/CSS 内联，可直接双击打开
  if (mode === 'single') {
    return {
      base: './',
      plugins: [viteSingleFile()],
      build: { outDir: 'dist-single', emptyOutDir: true },
    };
  }
  return {
    base: command === 'build' || isPreview ? REPO_BASE : '/',
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
