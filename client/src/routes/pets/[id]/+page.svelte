<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getPetById, deletePet } from '$lib/api/pet/PetController';
	import { getOwnerById } from '$lib/api/owner/OwnerController';
	import { formatDate, calculateAge, sortVisitsByDateDesc } from '$lib/pet-format';
	import type { PetResponse, OwnerResponse } from '$lib/api/models';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		PawPrint,
		Calendar,
		ArrowLeft,
		Pencil,
		Trash2,
		Plus,
		Stethoscope,
		User
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let pet = $state<PetResponse | null>(null);
	let owner = $state<OwnerResponse | null>(null);
	let loading = $state(true);
	let deleteDialogOpen = $state(false);
	let deleting = $state(false);

	const petId = $derived(Number($page.params.id));

	async function loadPet() {
		const requestedId = petId;
		loading = true;
		try {
			const petData = await getPetById(requestedId);
			if (requestedId !== petId) return; // a newer navigation has since started
			pet = petData;
			const ownerData = await getOwnerById(petData.ownerId);
			if (requestedId !== petId) return;
			owner = ownerData;
		} catch (err) {
			if (requestedId !== petId) return;
			pet = null;
			toast.error('Failed to load pet');
			console.error('Error:', err);
		} finally {
			if (requestedId === petId) loading = false;
		}
	}

	async function handleDeletePet() {
		deleting = true;
		try {
			await deletePet(petId);
			toast.success('Pet deleted successfully');
			goto('/pets');
		} catch (err) {
			toast.error('Failed to delete pet');
			console.error('Error:', err);
		} finally {
			deleting = false;
			deleteDialogOpen = false;
		}
	}

	let sortedVisits = $derived(pet?.visits ? sortVisitsByDateDesc(pet.visits) : []);

	// Load pet on mount and when the ID changes
	$effect(() => {
		if (Number.isFinite(petId)) {
			loadPet();
		} else {
			pet = null;
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{pet ? pet.name : 'Pet'} | VetHub</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<Button variant="ghost" href="/pets" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back to Pets
		</Button>
	</div>

	{#if loading}
		<div class="card p-12 text-center">
			<div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground">Loading pet...</p>
		</div>
	{:else if !pet}
		<div class="card p-12 text-center">
			<PawPrint class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="text-muted-foreground">Pet not found</p>
		</div>
	{:else}
		<!-- Pet Info Card -->
		<Card.Root class="mb-8">
			<Card.Header>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex items-center gap-4">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
							<PawPrint class="h-8 w-8 text-accent" />
						</div>
						<div>
							<Card.Title class="text-2xl">{pet.name}</Card.Title>
							<div class="flex items-center gap-2 mt-1">
								<Badge variant="secondary">{pet.type?.name ?? 'Unknown type'}</Badge>
								<span class="text-muted-foreground">•</span>
								<span class="text-muted-foreground">{calculateAge(pet.birthDate)}</span>
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" href="/pets/{petId}/edit" class="gap-2">
							<Pencil class="h-4 w-4" />
							Edit
						</Button>
						<Button variant="destructive" onclick={() => (deleteDialogOpen = true)} class="gap-2">
							<Trash2 class="h-4 w-4" />
							Delete
						</Button>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
					<div class="flex items-center gap-3 text-muted-foreground">
						<Calendar class="h-5 w-5" />
						<span>Born: {formatDate(pet.birthDate)}</span>
					</div>
					{#if owner}
						<div class="flex items-center gap-3 text-muted-foreground">
							<User class="h-5 w-5" />
							<a href="/owners/{owner.id}" class="hover:text-primary">
								{owner.firstName} {owner.lastName}
							</a>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Visits Section -->
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-foreground">Visit History</h2>
			<Button href="/pets/{petId}/visits/new" class="gap-2">
				<Plus class="h-4 w-4" />
				Add Visit
			</Button>
		</div>

		{#if !pet.visits?.length}
			<div class="card p-8 text-center">
				<Stethoscope class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
				<p class="text-muted-foreground">No visits recorded for this pet</p>
				<Button href="/pets/{petId}/visits/new" class="mt-4 gap-2">
					<Plus class="h-4 w-4" />
					Record First Visit
				</Button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each sortedVisits as visit (visit.id)}
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-start justify-between">
								<div class="flex items-start gap-4">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
										<Stethoscope class="h-5 w-5 text-success" />
									</div>
									<div>
										<p class="font-medium text-foreground">{visit.description}</p>
										<p class="text-sm text-muted-foreground">{formatDate(visit.date)}</p>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Pet</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete {pet?.name}? This will also delete all visit records. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)} disabled={deleting}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleDeletePet} disabled={deleting}>
				{#if deleting}
					Deleting...
				{:else}
					Delete
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
