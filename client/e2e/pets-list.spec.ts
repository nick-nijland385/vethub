import { test, expect, type Page } from '@playwright/test';

// Relies on the seeded dev data (server runs with `dev` profile, which
// drops/recreates the schema and reseeds it on every startup), so Leo the
// cat belonging to George Franklin is always present.

// The type filter trigger's accessible name changes with the current
// selection ("All types", "Cat", ...), so it's located by its stable
// aria-label instead. Opening it has been observed to occasionally not
// register on the first click under CI (a portal/popover timing issue),
// so this retries the open before picking an option.
async function selectPetType(page: Page, typeName: string) {
	const trigger = page.getByRole('button', { name: 'Filter by pet type' });
	const option = page.getByRole('option', { name: typeName, exact: true });

	for (let attempt = 0; attempt < 3; attempt++) {
		await trigger.click();
		try {
			await option.waitFor({ state: 'visible', timeout: 3000 });
			break;
		} catch {
			await page.keyboard.press('Escape');
		}
	}

	await option.click();
}

test.describe('Pets overview page', () => {
	test('lists pets with name, type, age, and owner', async ({ page }) => {
		await page.goto('/pets');

		await expect(page.getByRole('heading', { name: 'Pets', exact: true })).toBeVisible();

		const leoRow = page.getByRole('row', { name: /Leo/ });
		await expect(leoRow).toBeVisible();
		await expect(leoRow.getByText('Cat')).toBeVisible();
		await expect(leoRow.getByRole('link', { name: 'George Franklin' })).toBeVisible();
	});

	test('search filters the list by pet name', async ({ page }) => {
		await page.goto('/pets');

		await page.getByPlaceholder('Search by name, type, or owner...').fill('Leo');

		await expect(page.getByRole('row', { name: /Leo/ })).toBeVisible();
		await expect(page.getByRole('row', { name: /Basil/ })).toHaveCount(0);
	});

	test('search filters the list by owner name', async ({ page }) => {
		await page.goto('/pets');

		await page.getByPlaceholder('Search by name, type, or owner...').fill('Franklin');

		await expect(page.getByRole('row', { name: /Leo/ })).toBeVisible();
		await expect(page.getByRole('row', { name: /Basil/ })).toHaveCount(0);
	});

	test('search with no matches shows an empty state', async ({ page }) => {
		await page.goto('/pets');

		await page
			.getByPlaceholder('Search by name, type, or owner...')
			.fill('no-such-pet-xyz');

		await expect(page.getByText('No pets found matching "no-such-pet-xyz"')).toBeVisible();
	});

	test('type filter shows only pets of the selected type', async ({ page }) => {
		await page.goto('/pets');

		await selectPetType(page, 'Cat');

		await expect(page).toHaveURL(/\/pets\?type=\d+$/);
		await expect(page.getByRole('row', { name: /Leo/ })).toBeVisible();
		await expect(page.getByRole('row', { name: /Rosy/ })).toHaveCount(0);
	});

	test('type filter combines with search', async ({ page }) => {
		await page.goto('/pets');

		await selectPetType(page, 'Cat');
		await page.getByPlaceholder('Search by name, type, or owner...').fill('Leo');

		await expect(page.getByRole('row', { name: /Leo/ })).toBeVisible();
		await expect(page.getByText('Showing 1 of')).toBeVisible();
	});

	test('selecting "All types" clears the type filter', async ({ page }) => {
		await page.goto('/pets');

		await selectPetType(page, 'Cat');
		await expect(page).toHaveURL(/\/pets\?type=\d+$/);

		await selectPetType(page, 'All types');

		await expect(page).toHaveURL('/pets');
		await expect(page.getByRole('row', { name: /Rosy/ })).toBeVisible();
	});

	test('a bookmarked type filter URL restores the filter on load', async ({ page }) => {
		await page.goto('/pets');
		await selectPetType(page, 'Cat');
		await expect(page).toHaveURL(/\/pets\?type=\d+$/);
		const filteredUrl = page.url();

		await page.goto(filteredUrl);

		await expect(page.getByRole('button', { name: 'Filter by pet type' })).toHaveText('Cat');
		await expect(page.getByRole('row', { name: /Leo/ })).toBeVisible();
		await expect(page.getByRole('row', { name: /Rosy/ })).toHaveCount(0);
	});

	test('clicking a pet row navigates to its own detail page', async ({ page }) => {
		await page.goto('/pets');

		await page.getByRole('link', { name: 'Leo' }).click();

		await expect(page).toHaveURL(/\/pets\/\d+$/);
		await expect(page.locator('[data-slot="card-title"]', { hasText: 'Leo' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Back to Pets' })).toBeVisible();
	});

	test('"Pets" nav link is highlighted while on the pets pages', async ({ page }) => {
		await page.goto('/pets');

		const petsNavLink = page.getByRole('navigation').getByRole('link', { name: 'Pets' });
		await expect(petsNavLink).toHaveClass(/text-primary/);
	});

	test('"Add Pet" button opens the new pet form', async ({ page }) => {
		await page.goto('/pets');

		await page.getByRole('link', { name: 'Add Pet' }).click();

		await expect(page).toHaveURL('/pets/new');
		await expect(page.getByRole('heading', { name: 'Add New Pet' })).toBeVisible();
	});
});
