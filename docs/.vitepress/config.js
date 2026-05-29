import { defineConfig } from 'vitepress'
import { useSidebar } from 'vitepress-openapi'
import spec from '../public/openapi.json' with { type: 'json' }

const openapiSidebar = useSidebar({ spec })

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function sidebarOperationItem({ method, title, path }) {
  const verb = method.toUpperCase()
  const label = escapeHtml(title || path)

  return `<span class="api-method-item"><span class="api-method-badge api-method-${verb.toLowerCase()}">${verb}</span> <span class="api-method-title">${label}</span></span>`
}

export default defineConfig({
  title: 'Pylontech OpenAPI',
  description: 'Partner API documentation and operating procedures',
  cleanUrls: true,
  lastUpdated: false,
  appearance: false,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api-reference/get-sites' },
      { text: 'OpenAPI JSON', link: '/openapi.json' },
    ],
    search: false,
    sidebar: {
      '/guide/': [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Authentication', link: '/guide/authentication' },
      ],
      '/api-reference/': [
        ...openapiSidebar.generateSidebarGroups({
          linkPrefix: '/api-reference/',
          sidebarItemTemplate: sidebarOperationItem,
        }),
      ],
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    socialLinks: [],
    footer: {
      message: '',
      copyright: 'Copyright @ Pylon Technologies Co., Ltd. All rights reserved.',
    },
  },
})
