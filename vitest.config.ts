import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: [
      {
        find: '@msqdx/ui/mag',
        replacement: path.resolve(__dirname, '../msqdx-ui/packages/ui/src/mag/index.ts'),
      },
      {
        find: '@msqdx/ui/styles.css',
        replacement: path.resolve(__dirname, '../msqdx-ui/packages/ui/src/styles.css'),
      },
      { find: '@msqdx/ui', replacement: path.resolve(__dirname, 'lib/msqdx-ui.ts') },
      { find: '@msqdx/ui-shell', replacement: path.resolve(__dirname, 'lib/msqdx-ui-shell.ts') },
      {
        find: '@msqdx/ui-tokens',
        replacement: path.resolve(__dirname, '../msqdx-ui/packages/ui-tokens/dist/index.js'),
      },
      {
        find: '@msqdx/react',
        replacement: path.resolve(__dirname, 'lib/msqdx-react-bridge/index.ts'),
      },
      { find: '@msqdx/tokens', replacement: path.resolve(__dirname, 'lib/msqdx-tokens-shim.ts') },
      {
        find: '@react-pdf/renderer',
        replacement: path.resolve(__dirname, 'node_modules/@react-pdf/renderer'),
      },
      { find: '@mui/material', replacement: path.resolve(__dirname, 'lib/mui-shim.tsx') },
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
})
