import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../api/swagger.json',
    output: {
      baseUrl: 'http://localhost:3333',
      target: './src/http/generated/api.ts',
      httpClient: 'fetch',
      client: 'react-query',
      clean: true,
    },
  },
})
