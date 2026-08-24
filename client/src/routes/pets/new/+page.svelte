<script lang="ts">
	import { goto } from '$app/navigation';
	import { createPet } from '$lib/api/pet/PetController';
	import { getPetTypes } from '$lib/api/pet-type/PetTypeController';
	import { getOwners } from '$lib/api/owner/OwnerController';
	import type { PetTypeResponse, OwnerResponse } from '$lib/api/models';
	import PetForm from '$lib/components/pets/PetForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ArrowLeft, PawPrint, Users, Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let petTypes = $state<PetTypeResponse[]>([]);
	let owners = $state<OwnerResponse[]>([]);
	let selectedOwnerId = $state<number | undefined>(undefined);
	let loading = $state(true);

	let selectedOwner = $derived(owners.find((o) => o.id === selectedOwnerId));

	async function loadData() {
		loading = true;
		try {
			const [typesData, ownersData] = await Promise.all([getPetTypes(), getOwners()]);
			petTypes = typesData;
			owners = ownersData;
		} catch (err) {
			toast.error('Failed to load data');
			console.error('Error:', err);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(data: { name: string; birthDate: string; typeId: number }) {
		if (!selectedOwnerId) {
			toast.error('Please select an owner first');
			return;
		}

		try {
			const pet = await createPet({
				name: data.name,
				birthDate: data.birthDate,
				typeId: data.typeId,
				ownerId: selectedOwnerId
			});
			toast.success('Pet created successfully');
			goto(`/pets/${pet.id}`);
		} catch (err) {
			toast.error('Failed to create pet');
			console.error('Error:', err);
		}
	}

	// Load owners and pet types on mount
	$effect(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>Add New Pet | VetHub</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<!-- Back button -->
	<Button variant="ghost" href="/pets" class="mb-6 gap-2">
		<ArrowLeft class="h-4 w-4" />
		Back to Pets
	</Button>

	<div class="mb-6">
		<h1 class="text-2xl font-bold">Add New Pet</h1>
		<p class="text-muted-foreground">Register a new pet and assign it to an owner</p>
	</div>

	{#if loading}
		<div class="card p-12 text-center">
			<div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground">Loading...</p>
		</div>
	{:else if petTypes.length === 0}
		<div class="card p-12 text-center">
			<PawPrint class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="text-muted-foreground">No pet types available. Please add pet types first.</p>
		</div>
	{:else if owners.length === 0}
		<div class="card p-12 text-center">
			<Users class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="text-muted-foreground">No owners registered yet. Add an owner before registering a pet.</p>
			<Button href="/owners/new" class="mt-4 gap-2">
				<Plus class="h-4 w-4" />
				Add Owner
			</Button>
		</div>
	{:else}
		<div class="card space-y-6 p-6">
			<div class="space-y-2">
				<Label for="owner">Owner</Label>
				<Select.Root
					type="single"
					value={selectedOwnerId?.toString()}
					onValueChange={(value) => (selectedOwnerId = value ? Number(value) : undefined)}
				>
					<Select.Trigger id="owner" class="w-full">
						{selectedOwner ? `${selectedOwner.firstName} ${selectedOwner.lastName}` : 'Select an owner'}
					</Select.Trigger>
					<Select.Content>
						{#each owners as owner (owner.id)}
							<Select.Item value={owner.id.toString()}>
								{owner.firstName} {owner.lastName}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<PetForm {petTypes} onSubmit={handleSubmit} submitLabel="Add Pet" />
		</div>
	{/if}
</div>
