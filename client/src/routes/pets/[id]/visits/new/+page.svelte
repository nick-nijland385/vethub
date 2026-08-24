<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createVisit } from '$lib/api/visit/VisitController';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ArrowLeft, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	const petId = $derived(Number($page.params.id));

	let visitDate = $state(new Date().toISOString().split('T')[0]);
	let description = $state('');
	let submitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!Number.isFinite(petId)) {
			toast.error('Invalid pet');
			return;
		}

		submitting = true;

		try {
			await createVisit({
				petId,
				date: visitDate,
				description: description.trim()
			});
			toast.success('Visit recorded successfully');
			goto(`/pets/${petId}`);
		} catch (err) {
			toast.error('Failed to create visit');
			console.error('Error:', err);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Add Visit | VetHub</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<!-- Back button -->
	<Button variant="ghost" href="/pets/{petId}" class="mb-6 gap-2">
		<ArrowLeft class="h-4 w-4" />
		Back to Pet
	</Button>

	<div class="mb-6">
		<h1 class="text-2xl font-bold">Record New Visit</h1>
		<p class="text-muted-foreground">Add a new visit record for this pet</p>
	</div>

	<div class="card p-6">
		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="space-y-2">
				<Label for="visitDate">Visit Date</Label>
				<Input
					id="visitDate"
					type="date"
					bind:value={visitDate}
					required
					disabled={submitting}
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Describe the reason for the visit (e.g., Annual checkup, Vaccination, etc.)"
					rows={4}
					required
					disabled={submitting}
				/>
			</div>

			<div class="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					href="/pets/{petId}"
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Record Visit
				</Button>
			</div>
		</form>
	</div>
</div>
