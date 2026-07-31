import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@msqdx/ui': path.resolve(__dirname, 'lib/msqdx-ui.ts'),
      '@msqdx/ui-shell': path.resolve(__dirname, 'lib/msqdx-ui-shell.ts'),
      '@msqdx/ui/styles.css': path.resolve(__dirname, '../msqdx-ui/packages/ui/src/styles.css'),
      '@msqdx/ui-tokens': path.resolve(__dirname, '../msqdx-ui/packages/ui-tokens/dist/index.js'),
      '@msqdx/react': path.resolve(__dirname, 'lib/msqdx-react-bridge/index.ts'),
      '@msqdx/tokens': path.resolve(__dirname, 'lib/msqdx-tokens-shim.ts'),
      '@mui/material': path.resolve(__dirname, 'lib/mui-shim.tsx'),
    },
  },
})
