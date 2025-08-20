import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../api/swagger.json',
    output: {
      mode: 'split',
      target: './src/api/generated/api.ts',
      httpClient: 'fetch',
      client: 'react-query',
      clean: true,
      schemas: './src/api/generated/model',
      prettier: true,

      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/lib/http.ts',
          name: 'http',
        },
      },
    },
  },
})
