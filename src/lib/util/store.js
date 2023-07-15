import { writable } from "svelte/store";

const LIGHTCOLORS = {
	primary: "rgb(249, 215, 47)",

	secondary: "rgb(224, 168, 46)",

	accent: "rgb(220, 136, 80)",
};

const DARKCOLORS = {
	primary: "rgb(255, 122, 198)",

	secondary: "rgb(191, 149, 249)",

	accent: "rgb(255, 184, 107)",
};

// Default to light theme
const themeStore = writable(false);

export { themeStore, LIGHTCOLORS, DARKCOLORS };
