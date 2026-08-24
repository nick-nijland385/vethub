<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getPets } from '$lib/api/pet/PetController';
	import { getOwners } from '$lib/api/owner/OwnerController';
	import { calculateAge } from '$lib/pet-format';
	import type { PetResponse, OwnerResponse } from '$lib/api/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { PawPrint, Plus, Search } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let pets = $state<PetResponse[]>([]);
	let owners = $state<OwnerResponse[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// The selected type filter lives in the URL (?type=<id>) so it's
	// shareable/bookmarkable, rather than duplicated into local state.
	let selectedTypeId = $derived.by(() => {
		const raw = $page.url.searchParams.get('type');
		return raw ? Number(raw) : undefined;
	});

	function setTypeFilter(value: string | undefined) {
		const params = new URLSearchParams($page.url.searchParams);
		if (!value || value === 'all') {
			params.delete('type');
		} else {
			params.set('type', value);
		}
		const query = params.toString();
		goto(`/pets${query ? `?${query}` : ''}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	let ownerNameById = $derived.by(() => {
		const map = new Map<number, string>();
		for (const owner of owners) {
			map.set(owner.id, `${owner.firstName} ${owner.lastName}`);
		}
		return map;
	});

	function ownerName(ownerId: number): string {
		return ownerNameById.get(ownerId) ?? 'Unknown owner';
	}

	// Only types actually in use by at least one pet
	let availableTypes = $derived.by(() => {
		const map = new Map<number, string>();
		for (const pet of pets) {
			if (pet.type) map.set(pet.type.id, pet.type.name);
		}
		return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	});

	let selectedTypeName = $derived(
		availableTypes.find((t) => t.id === selectedTypeId)?.name
	);

	// Filtered pets based on the type filter and search query
	let filteredPets = $derived.by(() => {
		let result = pets;
		if (selectedTypeId !== undefined) {
			result = result.filter((pet) => pet.type?.id === selectedTypeId);
		}
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(pet) =>
					pet.name?.toLowerCase().includes(query) ||
					pet.type?.name?.toLowerCase().includes(query) ||
					ownerName(pet.ownerId).toLowerCase().includes(query)
			);
		}
		return result;
	});

	async function loadPets() {
		loading = true;
		try {
			const [petsResult, ownersResult] = await Promise.all([getPets(), getOwners()]);
			pets = petsResult;
			owners = ownersResult;
		} catch (err) {
			toast.error('Failed to load pets');
			console.error('Error loading pets:', err);
		} finally {
			loading = false;
		}
	}

	// Load pets on mount
	$effect(() => {
		loadPets();
	});
</script>

<svelte:head>
	<title>Pets | VetHub</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
				<PawPrint class="h-6 w-6 text-accent" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground">Pets</h1>
				<p class="text-sm text-muted-foreground">All pets registered across every owner</p>
			</div>
		</div>
		<Button href="/pets/new" class="gap-2">
			<Plus class="h-4 w-4" />
			Add Pet
		</Button>
	</div>

	<!-- Search & filter -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative max-w-md flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search by name, type, or owner..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>
		<Select.Root
			type="single"
			value={selectedTypeId?.toString() ?? 'all'}
			onValueChange={setTypeFilter}
		>
			<Select.Trigger class="w-full sm:w-[180px]" aria-label="Filter by pet type">
				{selectedTypeName ?? 'All types'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All types</Select.Item>
				{#each availableTypes as type (type.id)}
					<Select.Item value={type.id.toString()}>{type.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Table -->
	{#if loading}
		<div class="card p-12 text-center">
			<div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground">Loading pets...</p>
		</div>
	{:else if filteredPets.length === 0}
		<div class="card p-12 text-center">
			<PawPrint class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			{#if searchQuery && selectedTypeName}
				<p class="text-muted-foreground">No {selectedTypeName}s found matching "{searchQuery}"</p>
			{:else if selectedTypeName}
				<p class="text-muted-foreground">No {selectedTypeName}s found</p>
			{:else if searchQuery}
				<p class="text-muted-foreground">No pets found matching "{searchQuery}"</p>
			{:else}
				<p class="text-muted-foreground">No pets registered yet</p>
			{/if}
		</div>
	{:else}
		<div class="card overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Age</Table.Head>
						<Table.Head>Owner</Table.Head>
						<Table.Head class="w-[100px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredPets as pet (pet.id)}
						<Table.Row class="hover:bg-muted/50">
							<Table.Cell>
								<a
									href="/pets/{pet.id}"
									class="font-medium text-foreground hover:text-primary"
								>
									{pet.name}
								</a>
							</Table.Cell>
							<Table.Cell>
								{#if pet.type}
									<Badge variant="secondary">{pet.type.name}</Badge>
								{:else}
									<span class="text-sm text-muted-foreground">Unknown</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">{calculateAge(pet.birthDate)}</span>
							</Table.Cell>
							<Table.Cell>
								<a href="/owners/{pet.ownerId}" class="text-sm text-muted-foreground hover:text-primary">
									{ownerName(pet.ownerId)}
								</a>
							</Table.Cell>
							<Table.Cell>
								<Button variant="ghost" size="sm" href="/pets/{pet.id}">
									View
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<p class="mt-4 text-sm text-muted-foreground">
			Showing {filteredPets.length} of {pets.length} pets
		</p>
	{/if}
</div>
