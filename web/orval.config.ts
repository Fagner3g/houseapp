import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../api/swagger.json',
    output: {
      mode: 'split',
      target: './src/http/generated/api.ts',
      httpClient: 'fetch',
      client: 'react-query',
      clean: true,
      schemas: './src/http/generated/model',
      prettier: true,

      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/http/client.ts',
          name: 'http',
        },
      },
    },
  },
})
