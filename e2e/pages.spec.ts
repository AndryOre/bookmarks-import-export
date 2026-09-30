import { expect, test } from './fixtures'

test('opens the welcome page on install', async ({ context }) => {
  const welcomePage =
    context.pages().find((page) => page.url().includes('welcome.html')) ??
    (await context.waitForEvent('page', {
      predicate: (page) => page.url().includes('welcome.html'),
    }))

  await expect(
    welcomePage.getByRole('heading', {
      name: 'Welcome to Bookmark Import/Export',
    }),
  ).toBeVisible()
})

test('renders the update page', async ({ openExtensionPage }) => {
  const updatePage = await openExtensionPage('update.html')

  await expect(
    updatePage.getByRole('heading', { name: 'Bookmark Import/Export' }),
  ).toBeVisible()
  await expect(updatePage.getByText(/You're now using version/)).toBeVisible()
})
