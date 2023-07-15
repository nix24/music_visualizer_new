<script>
	//importing a mp3 file from lib/assets
	// @ts-ignore
	import modernTech from "$lib/assets/modernTech.mp3";
	import { onDestroy, onMount } from "svelte";
	import { LIGHTCOLORS, DARKCOLORS, themeStore } from "$lib/util/store";
	import { guess } from "web-audio-beat-detector";
	import chroma from "chroma-js";
	import Icon from "@iconify/svelte";

	/**
	 * @type {HTMLAudioElement}
	 */
	let audioElement;
	/**
	 * @type {AudioContext}
	 */
	let audioCtx;

	/**
	 * @type {HTMLCanvasElement}
	 */
	let canvasElement;

	/**
	 * @type {boolean}
	 */
	let isDarkTheme;

	$: colors = isDarkTheme ? DARKCOLORS : LIGHTCOLORS;

	/**
	 * @type {MediaElementAudioSourceNode}
	 */
	let audioSrc;
	/**
	 * @type {AudioNode}
	 */
	let analyser;
	/**
	 * @type {import("svelte/store").Unsubscriber}
	 */
	let unsubscribe;

	let file;

	/**
	 * @type {ResizeObserver}
	 */
	let resizeObserver;

	/**
	 * @type {CanvasRenderingContext2D | null}
	 */
	let ctx;

	/**
	 * @type {Element | null}
	 */
	let visualizerContainer;

	let pulse;

	let isLoading = false;

	let animatePulseRequestId = null;

	const cleanup = () => {
		if (audioSrc) {
			audioSrc.disconnect();
			audioSrc = null;
		}
		if (analyser) {
			analyser.disconnect();
			analyser = null;
		}
		if (animatePulseRequestId !== null) {
			cancelAnimationFrame(animatePulseRequestId);
			animatePulseRequestId = null;
		}
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	};

	const createVisualizer = () => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		ctx = canvasElement.getContext("2d");
		// @ts-ignore
		analyser.fftSize = 512;
		// @ts-ignore
		const bufferLength = analyser.frequencyBinCount;
		const dataArr = new Uint8Array(bufferLength);
		const barWidth = canvasElement.width / bufferLength;
		let barHeight;
		let x = 0;
		resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				// set the canvas size to match the container size
				canvasElement.width = entry.contentRect.width;
				canvasElement.height = entry.contentRect.height;
				// multiply by devicePixelRatio to account for high resolution displays
				canvasElement.width *= window.devicePixelRatio;
				canvasElement.height *= window.devicePixelRatio;
				if (ctx) {
					// ensure ctx is not null
					ctx.resetTransform(); // Reset transformation matrix
					ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
				}
			}
		});
		// @ts-ignore
		resizeObserver.observe(visualizerContainer);

		const animate = () => {
			x = 0;
			if (ctx) {
				ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
				// @ts-ignore
				analyser.getByteFrequencyData(dataArr);
				// @ts-ignore
				const colorScale = chroma.scale([
					colors.accent,
					colors.secondary,
					colors.primary,
				]);

				for (let i = 0; i < bufferLength; i++) {
					barHeight = dataArr[i] * 1.1;
					ctx.save();
					ctx.translate(
						canvasElement.width / (2 * window.devicePixelRatio),
						canvasElement.height / (2 * window.devicePixelRatio)
					); // Adjust translate for high resolution displays
					ctx.rotate((i * Math.PI * 4.3) / bufferLength);
					const color = colorScale(dataArr[i] / 255).hex();
					ctx.fillStyle = color;

					ctx.fillRect(0, 0, barWidth, barHeight);
					x += barWidth * 1.25;
					ctx.restore();
				}
				requestAnimationFrame(animate);
			}
		};
		animate();
	};

	const playMusic = () => {
		if (!audioCtx) {
			// Initialize audioCtx and related nodes after user interaction
			audioCtx = new AudioContext();
			audioElement.play();
		}

		if (!audioSrc || !analyser) {
			try {
				audioSrc = audioCtx.createMediaElementSource(audioElement);
				analyser = audioCtx.createAnalyser();
				audioSrc.connect(analyser);
				analyser.connect(audioCtx.destination);
				createVisualizer();
			} catch (error) {
				console.log("The source is already connected to an analyser.");
			}

			if (audioCtx.state === "suspended") {
				audioCtx.resume();
			}

			audioElement.play();
		}
	};

	onMount(() => {
		//subsribe to themestore
		unsubscribe = themeStore.subscribe((value) => {
			//console log is a success
			//console log lightcolor when false, darkcolor when true
			isDarkTheme = value;
			console.log(value ? "dark" : "light");
		});

		let rawAudio = document.getElementById("audio1");
		//grab the value of audio to audio1
		audioElement = /** @type {HTMLAudioElement } */ (rawAudio);

		//grabbing container
		let rawCanvas = document.getElementById("canvas1");
		//grab the value of canvas to canvas1
		canvasElement = /** @type {HTMLCanvasElement } */ (rawCanvas);

		visualizerContainer = document.querySelector(".visualizer-container");

		pulse = document.querySelector(".pulse");
		//if visualizer container is not null
		if (visualizerContainer) {
			canvasElement.width = visualizerContainer.clientWidth;
			canvasElement.height = visualizerContainer.clientHeight;
		}

		file = document.getElementById("fileUpload");

		// @ts-ignore
		visualizerContainer.addEventListener("click", playMusic);

		// @ts-ignore
		file.addEventListener("change", async function () {
			cleanup();

			// @ts-ignore
			const files = this.files;
			audioElement.src = URL.createObjectURL(files[0]);
			// @ts-ignore
			canvasElement.width = visualizerContainer.clientWidth;
			// @ts-ignore
			canvasElement.height = visualizerContainer.clientHeight;
			audioElement.load();

			// Create the AudioContext when the file is uploaded
			if (!audioCtx) {
				audioCtx = new AudioContext();
			}

			// Get the audio buffer when the audio can play through
			audioElement.oncanplaythrough = async () => {
				isLoading = true;
				const response = await fetch(audioElement.src);
				const arrayBuffer = await response.arrayBuffer();
				const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

				let bpm = 120;
				let offset = 0;
				isLoading = false;

				try {
					// Try to guess the BPM and offset
					const guessResult = await guess(audioBuffer);
					bpm = guessResult.bpm;
					offset = guessResult.offset;
				} catch (error) {
					// Log the error and use the default BPM and offset values
					console.error("Error guessing BPM:", error);
				}

				// Calculate the duration of one beat in milliseconds
				const beatDuration = 60000 / bpm; // 60 seconds * 1000 milliseconds
				isLoading = false;

				const animatePulse = () => {
					const rotationAngle = Date.now() / 100; // Adjust divisor to change rotation speed
					const scaleFactor =
						1 + Math.sin(Date.now() / (beatDuration / 2)) * 0.1; // Adjust divisor to change pulse speed

					// Scale the visualizer based on the beat
					pulse.style.transform = `scale(${scaleFactor}) rotate(${rotationAngle}deg)`;

					requestAnimationFrame(animatePulse);
				};
				animatePulse();
				playMusic();
			};
		});
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});
</script>

<!--create container to center button-->
<div class="container">
	<div class="control-p">
		<Icon
			icon="icon-park-outline:cd"
			class="pulse text-primary w-20 h-20 mb-2 "
		/>
		{#if isLoading}
			<!-- Add this line -->
			<p
				>Loading visualizer <span class="loading loading-ring loading-md"
				></span></p
			>
			<!--small text-->
			<div class="flex flex-row">
				<span class="loading loading-bars loading-sm"></span>
				<p class="text-sm font-thin"
					>if you use the audio controls, the changes affect the visualizer in
					real time!</p
				>
				<span class="loading loading-bars loading-sm"></span>
			</div>
		{/if}
		<!-- And this line -->
		<audio id="audio1" controls></audio>
		<input
			type="file"
			id="fileUpload"
			class="opacity-50 my-5 file-input file-input-bordered file-input-md file-input-accent"
			accept="audio/*"
		/>
	</div>
	<div class="visualizer-container">
		<canvas id="canvas1" class="pulse"></canvas>
	</div>
</div>

<style>
	.container {
		@apply flex flex-col justify-center m-auto;
		@apply items-center w-full h-full;
	}
	.visualizer-container {
		@apply w-full h-full absolute top-0 left-0;
		/* make the zindex behind */
		z-index: -1;
	}
	#canvas1 {
		@apply w-full h-full absolute top-0 left-0;
		@apply border border-primary;
	}
	#audio1 {
		/**width 50%*/
		@apply max-w-lg m-auto w-full;
	}
	.control-p {
		/* make like a control panel with tailwind */
		@apply flex flex-col items-center justify-center m-auto;
	}
</style>
