import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../api/swagger.json',
    output: {
      target: './src/http/generated/api.ts',
      httpClient: 'fetch',
      client: 'react-query',
      clean: true,

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
