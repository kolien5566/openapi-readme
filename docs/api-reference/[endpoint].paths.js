import { usePaths } from 'vitepress-openapi'
import spec from '../public/openapi.json' with { type: 'json' }

export default {
  paths() {
    return usePaths({ spec })
      .getPathsByVerbs()
      .map(({ operationId: endpoint, summary }) => ({
        params: {
          endpoint,
          pageTitle: summary || endpoint,
        },
      }))
  },
}
