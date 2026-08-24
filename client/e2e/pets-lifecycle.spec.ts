import { test, expect } from '@playwright/test';

// Full CRUD lifecycle against the real backend. Uses a name unique to this
// run and deletes the pet at the end, so it's safe to run repeatedly
// without accumulating data or colliding with the seeded pets.

test('create, view, edit, add a visit to, and delete a pet', async ({ page }) => {
	const petName = `E2E Pet ${Date.now()}`;

	await test.step('create the pet from the pets overview page', async () => {
		await page.goto('/pets');
		await page.getByRole('link', { name: 'Add Pet' }).click();

		await page.getByRole('button', { name: 'Owner' }).click();
		await page.getByRole('option', { name: 'George Franklin' }).click();

		await page.getByLabel('Pet Name').fill(petName);
		await page.getByLabel('Birth Date').fill('2022-01-01');

		await page.getByRole('button', { name: 'Pet Type' }).click();
		await page.getByRole('option', { name: 'Cat' }).click();

		await page.getByRole('button', { name: 'Add Pet' }).click();

		await expect(page.getByText('Pet created successfully')).toBeVisible();
		await expect(page).toHaveURL(/\/pets\/\d+$/);
		await expect(page.locator('[data-slot="card-title"]', { hasText: petName })).toBeVisible();
		await expect(page.getByText('George Franklin')).toBeVisible();
	});

	await test.step('the pet appears in the pets overview list', async () => {
		await page.goto('/pets');
		await page.getByPlaceholder('Search by name, type, or owner...').fill(petName);
		await expect(page.getByRole('row', { name: new RegExp(petName) })).toBeVisible();
	});

	await test.step('edit the pet', async () => {
		await page
			.getByPlaceholder('Search by name, type, or owner...')
			.fill(petName);
		await page.getByRole('link', { name: petName }).click();

		await page.getByRole('link', { name: 'Edit' }).click();
		await expect(page).toHaveURL(/\/pets\/\d+\/edit$/);

		await page.getByLabel('Birth Date').fill('2021-06-15');
		await page.getByRole('button', { name: 'Save Changes' }).click();

		await expect(page.getByText('Pet updated successfully')).toBeVisible();
		await expect(page).toHaveURL(/\/pets\/\d+$/);
		await expect(page.getByText('Born: June 15, 2021')).toBeVisible();
	});

	await test.step('record a visit for the pet', async () => {
		await page.getByRole('link', { name: 'Add Visit' }).click();
		await expect(page).toHaveURL(/\/pets\/\d+\/visits\/new$/);

		await page.getByLabel('Description').fill('E2E checkup visit');
		await page.getByRole('button', { name: 'Record Visit' }).click();

		await expect(page.getByText('Visit recorded successfully')).toBeVisible();
		await expect(page).toHaveURL(/\/pets\/\d+$/);
		await expect(page.getByText('E2E checkup visit')).toBeVisible();
	});

	await test.step('delete the pet', async () => {
		await page.getByRole('button', { name: 'Delete' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

		await expect(page.getByText('Pet deleted successfully')).toBeVisible();
		await expect(page).toHaveURL('/pets');

		await page.getByPlaceholder('Search by name, type, or owner...').fill(petName);
		await expect(page.getByText(`No pets found matching "${petName}"`)).toBeVisible();
	});
});
