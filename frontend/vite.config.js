import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// shared/folhaRespostasLayout.js é CommonJS porque a API (Node) faz require dele.
// O Vite não converte CommonJS fora do node_modules: no build o leitor da câmera
// recebia um módulo vazio (layout.QR undefined → "Não foi possível processar a
// imagem da câmera") e no `npm run dev` o navegador quebrava em `module.exports`.
// Este plugin troca `module.exports =` por `export default` só para o front-end,
// no build, no dev e no Vitest; o back-end continua usando require normalmente.
function sharedCommonJsParaEsm() {
  return {
    name: 'shared-commonjs-para-esm',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]shared[\\/][^\\/]+\.js$/.test(id) || !code.includes('module.exports')) return null
      return { code: code.replace(/module\.exports\s*=\s*/, 'export default '), map: null }
    }
  }
}

export default defineConfig({
  plugins: [sharedCommonJsParaEsm(), vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // Testes dos componentes (Vitest + Vue Test Utils)
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js']
  }
})
