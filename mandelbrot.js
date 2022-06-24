
/// <reference types="@webgpu/types" />

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();

if (!device) {
	;/** @type {HTMLElement} */ (document.querySelector("#webgpu-not-supported")).hidden = false;
	throw new Error("Your browser does not support WebGPU.");
}

const currentChromeVersion = 103;
const currentCanaryVersion = 105;

const chromiumVersion = +(/** @type {any} */ (navigator)).userAgentData?.brands.find(({ brand }) => brand === "Chromium")?.version;
const isNewBrowser = !(chromiumVersion < currentCanaryVersion);

if (chromiumVersion < currentChromeVersion) {
	;/** @type {HTMLElement} */ (document.querySelector("#webgpu-outdated")).hidden = false;
	console.warn("The WebGPU implementation of your browser is outdated.");
}

const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector("canvas"));
const context = canvas.getContext("webgpu");

const format = isNewBrowser ? navigator.gpu.getPreferredCanvasFormat() : context.getPreferredFormat(adapter);

const uniformBufferSize = (
	+ 2 * Float32Array.BYTES_PER_ELEMENT // center: vec2<f32>
	+ 2 * Float32Array.BYTES_PER_ELEMENT // rectangle: vec2<f32>
	+ 1 * Uint32Array.BYTES_PER_ELEMENT // maxIterations: u32
);

const uniformBuffer = device.createBuffer({
	size: uniformBufferSize,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const shaderModule = device.createShaderModule({
	code: await (await window.fetch(new URL(isNewBrowser ? "./mandelbrot.wgsl" : "./mandelbrot.old.wgsl", import.meta.url).href)).text(),
});

const pipeline = device.createRenderPipeline({
	layout: "auto",
	vertex: {
		module: shaderModule,
		entryPoint: "vertex_main",
	},
	fragment: {
		module: shaderModule,
		entryPoint: "fragment_main",
		targets: [{ format }],
	},
	primitive: {
		topology: "triangle-strip",
	},
});

const bindGroup = device.createBindGroup({
	layout: pipeline.getBindGroupLayout(0),
	entries: [
		{
			binding: 0,
			resource: {
				buffer: uniformBuffer,
			},
		},
	],
});

{
	const resize = (/** @type {boolean?} */ firstTime) => {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;

		if (firstTime || !isNewBrowser) {
			context.configure({
				device,
				format,
				[isNewBrowser ? "alphaMode" : "compositingAlphaMode"]: "premultiplied",
			});
		}
	};
	resize(true);
	window.addEventListener("resize", () => resize());
}

let center = [0, 0];
let zoom = 0;

const scalePerZoom = 2;
let maxIterations = 2048;

canvas.addEventListener("wheel", (event) => {
	event.preventDefault();

	const { offsetX, offsetY, deltaY } = event;

	const pointX = ((offsetX / canvas.width * 2 - 1) / (
		(scalePerZoom ** zoom) / (canvas.width / canvas.height)
	)) + center[0];

	const pointY = (-(offsetY / canvas.height * 2 - 1) / (
		(scalePerZoom ** zoom)
	)) + center[1];

	const delta = Math.min(Math.max(-deltaY * 5, -100), 100) / 100;

	zoom += delta;

	center[0] = pointX - (pointX - center[0]) / (scalePerZoom ** delta);
	center[1] = pointY - (pointY - center[1]) / (scalePerZoom ** delta);

}, { passive: false });

canvas.addEventListener("pointermove", (event) => {
	if (event.buttons & 1) {
		const { movementX, movementY } = event;
		center[0] += (-(movementX / canvas.width * 2) / (
			(scalePerZoom ** zoom) / (canvas.width / canvas.height)
		));
		center[1] += ((movementY / canvas.height * 2) / (
			(scalePerZoom ** zoom)
		));
	}
});

document.querySelector(".max-iterations input[type=range]").addEventListener("input", function (event) {
	// @ts-ignore
	maxIterations = document.querySelector("#max-iterations").textContent = 2 ** this.valueAsNumber;
});

{
	const frame = () => {
		{
			const arrayBuffer = new ArrayBuffer(uniformBufferSize);
			new Float32Array(arrayBuffer, 0).set(new Float32Array([
				...center,
				scalePerZoom ** -zoom * canvas.width / canvas.height,
				scalePerZoom ** -zoom,
			]));
			new Uint32Array(arrayBuffer, (2 + 2) * Float32Array.BYTES_PER_ELEMENT).set([maxIterations]);
			device.queue.writeBuffer(uniformBuffer, 0, arrayBuffer);

			const encoder = device.createCommandEncoder();
			const renderPass = encoder.beginRenderPass({
				colorAttachments: [{
					view: context.getCurrentTexture().createView(),
					loadOp: "clear",
					clearValue: [0, 0, 0, 0],
					storeOp: "store",
				}],
			});

			renderPass.setPipeline(pipeline);
			renderPass.setBindGroup(0, bindGroup);
			renderPass.draw(4);
			renderPass.end();

			device.queue.submit([encoder.finish()]);
		}

		window.requestAnimationFrame(frame);
	};

	frame();
}

export { };

//# sourceMappingURL=data:,{"mappings":"","sources":["./mandelbrot.wgsl"]}
