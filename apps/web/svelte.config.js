// SELF-HOST: adapter-cloudflare helyett Node (sajat szerveren futunk, nginx mogott)
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		paths: {
			base: ''
		},
		experimental: {
			remoteFunctions: true
		}
	},

	vitePlugin: {
		inspector: true
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
