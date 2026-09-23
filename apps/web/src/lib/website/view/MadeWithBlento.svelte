<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<div class={['text-xs font-light', className]}>
	<div>
		made with <a
			href="https://blento.app"
			target="_blank"
			class="hover:text-accent-600 dark:hover:text-accent-400 font-medium transition-colors duration-200"
			>blento</a
		>
	</div>
</div>
