import { expect, test } from '@playwright/test'

test('home page keeps a simple light-only landing layout', async ({ page }) => {
  await page.goto('/')

  const main = page.locator('#VPContent')

  await expect(page).toHaveTitle(/Pylontech OpenAPI/)
  await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Pylontech OpenAPI' })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Start Integration' })).toBeVisible()
  await expect(main.getByRole('link', { name: 'API Reference' })).toBeVisible()

  await expect(page.getByText('Search')).toHaveCount(0)
  await expect(page.locator('.VPSwitchAppearance')).toHaveCount(0)
  await expect(page.locator('.VPNavBarExtra')).toBeHidden()

  const scrollMetrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }))
  expect(scrollMetrics.scrollHeight).toBeLessThanOrEqual(scrollMetrics.clientHeight + 4)

  const copyright = page.getByText(
    'Copyright @ Pylon Technologies Co., Ltd. All rights reserved.',
  )
  await expect(copyright).toBeVisible()
  await expect(copyright).toHaveCSS('text-align', 'left')
})

test('api reference page renders an operation with playground content', async ({ page }) => {
  await page.goto('/api-reference/get-sites')

  await expect(page.getByRole('heading', { name: 'Get site list' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy endpoint' })).toBeVisible()
  const tryItOut = page.getByRole('button', { name: 'Try it out' })
  await expect(tryItOut).toBeVisible()
  await expect(tryItOut).toHaveCSS('background-color', 'rgb(0, 179, 186)')
  const firstCheckbox = page.getByRole('checkbox').first()
  await firstCheckbox.click()
  await expect(firstCheckbox).toHaveCSS('background-color', 'rgb(0, 179, 186)')
  await expect(firstCheckbox).toHaveCSS('color', 'rgb(255, 255, 255)')

  const sidebar = page.getByRole('navigation', { name: 'Sidebar Navigation' })

  await expect(sidebar.getByText('Getting Started')).toHaveCount(0)
  await expect(sidebar.getByRole('button', { name: 'Site Management' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'GET Get site list' })).toBeVisible()
  await expect(
    sidebar.getByRole('link', { name: 'GET Get site list' }).locator('.api-method-badge'),
  ).toHaveText('GET')
})

test('guide sidebar is a flat first-level menu', async ({ page }) => {
  await page.goto('/guide/getting-started')

  const sidebar = page.getByRole('navigation', { name: 'Sidebar Navigation' })

  await expect(sidebar.getByText('SOP')).toHaveCount(0)
  await expect(sidebar.getByRole('link', { name: 'Getting Started' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Authentication' })).toBeVisible()

  const sidebarTop = await page.locator('.VPSidebar').evaluate((node) =>
    Math.round(node.getBoundingClientRect().top),
  )
  expect(sidebarTop).toBeGreaterThanOrEqual(63)
})
