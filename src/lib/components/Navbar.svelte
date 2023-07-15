<script>
	import { onDestroy, onMount } from "svelte";
	import { themeChange } from "theme-change";
	import { LIGHTCOLORS, DARKCOLORS, themeStore } from "$lib/util/store";
	import Icon from "@iconify/svelte";

	/**
	 * @type {void | (() => void)}
	 */
	let unsubscribe;
	onMount(() => {
		themeChange(false);
		//set an event list for input with theme-toggle id, when it changes
		const themeToggle = document.getElementById("theme-toggle");
		//changes will set the store to the opposite boolean
		if (themeToggle) {
			themeToggle.addEventListener("change", () => {
				unsubscribe = themeStore.update((value) => !value);
			});
		}
	});

	onDestroy(() => {
		if (typeof unsubscribe === "function") {
			unsubscribe();
		}
	});
</script>

<div class="navbar bg-base-100">
	<div class="flex-1">
		<p class="font-medium normal-case text-xl">Music Visualizer</p>
		<Icon icon="icon-park-outline:cd" class="w-fit h-fit" />
	</div>
	<div class="flex-none px-4">
		<Icon icon="fluent-mdl2:color" class="w-6 h-6 mr-2" />
		<input
			id="theme-toggle"
			type="checkbox"
			class="toggle"
			checked
			data-toggle-theme="bumblebee,dracula"
		/>
	</div>
</div>
