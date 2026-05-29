import { defineConfig } from 'vitepress'
import { useSidebar } from 'vitepress-openapi'
import spec from '../public/openapi.json' with { type: 'json' }

const openapiSidebar = useSidebar({ spec })

export default defineConfig({
  title: 'Pylontech RESS OpenAPI',
  description: 'Partner API documentation and operating procedures',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/operations/get-sites' },
      { text: 'OpenAPI JSON', link: '/openapi.json' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/guide/': [
        {
          text: 'SOP',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Authentication', link: '/guide/authentication' },
            { text: 'Go-Live Checklist', link: '/guide/go-live-checklist' },
          ],
        },
      ],
      '/operations/': [
        {
          text: 'SOP',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Authentication', link: '/guide/authentication' },
          ],
        },
        {
          text: 'API Reference',
          items: openapiSidebar.itemsByTags({
            collapsible: true,
            collapsed: false,
            linkPrefix: '/operations/',
            sidebarItemTemplate: ({ method, title, path }) =>
              `${method.toUpperCase()} ${title || path}`,
          }),
        },
      ],
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    socialLinks: [],
    footer: {
      message: 'Pylontech partner API documentation.',
      copyright: 'Copyright © Pylontech',
    },
  },
})
