import { getShader } from './shaders/default-shader.js';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
export default class Renderer {
  canvas: HTMLCanvasElement;

  // API Data Structures
  // @ts-ignore
  adapter: GPUAdapter;
  // @ts-ignore
  device: GPUDevice;
  // @ts-ignore
  queue: GPUQueue;

  // Frame Backings
  // @ts-ignore
  context: GPUCanvasContext;

  // Compute vars
  // @ts-ignore
  pipeline: GPUComputePipeline;
  // @ts-ignore
  bindGroup: GPUBindGroup;
  // @ts-ignore
  outputBuffer: GPUBuffer;
  // @ts-ignore
  readBuffer: GPUBuffer;
  // @ts-ignore
  numGroups: number;
  // @ts-ignore
  frame: ImageData;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initializeAPI(): Promise<void> {
    const entry: GPU = navigator.gpu;
    if (!entry) {
      throw Error('WebGPU may not be supported in your browser');
    }

    const maybeAdapter = await entry.requestAdapter();
    if (maybeAdapter == null) {
      throw Error('Could not acquire GPU adapter; please check your settings');
    }

    this.adapter = maybeAdapter;
    this.device = await this.adapter.requestDevice();
    this.queue = this.device.queue;

    const wgSize = 256;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.numGroups = (width * height) / wgSize;

    this.pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: getShader(wgSize, width, height) }),
        entryPoint: 'main',
      },
    });

    // Allocate a buffer to hold the output
    const bufferNumElements = width * height;
    this.outputBuffer = this.device.createBuffer({
      size: bufferNumElements * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      // mappedAtCreation: true,
    });
    // const data = new Uint32Array(this.outputBuffer.getMappedRange());
    // for (let i = 0; i < bufferNumElements; ++i) {
    //     data[i] = 0xFF0000FF;
    // }
    // this.outputBuffer.unmap();

    // Get a GPU buffer for reading in an unmapped state.
    this.readBuffer = this.device.createBuffer({
      size: bufferNumElements * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.outputBuffer } }],
    });

    await this.onResize();
  }

  async onResize(): Promise<void> {
    if (!this.context) {
      const maybeContext = this.canvas.getContext('webgpu');
      if (maybeContext == null) {
        throw Error('Could not acquire canvas');
      }
      this.context = maybeContext;
      const canvasConfig: GPUCanvasConfiguration = {
        device: this.device,
        // TODO investigate bgra vs rgba
        format: 'bgra8unorm',
        // format: 'rgba8unorm',
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      };
      this.context.configure(canvasConfig);
    }
  }

  bgraToRgba(bgraArray: Uint8ClampedArray): Uint8ClampedArray {
    // Need to do a copy so the buffer doesn't die, so no need to do the swap in place
    const rgbBuffer = new Uint8ClampedArray(bgraArray.length);
    for (let i = 0; i < bgraArray.length; i += 4) {
      rgbBuffer[i] = bgraArray[i + 2]; // Red channel
      rgbBuffer[i + 1] = bgraArray[i + 1]; // Green channel
      rgbBuffer[i + 2] = bgraArray[i]; // Blue channel
      rgbBuffer[i + 3] = bgraArray[i + 3]; // Alpha channel
    }
    return rgbBuffer;
  }

  async render() {
    let commandBuffers = Array<GPUCommandBuffer>();

    // Run the compute shader
    {
      const computeEncoder = this.device.createCommandEncoder();

      const pass = computeEncoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(this.numGroups);
      pass.end();

      commandBuffers.push(computeEncoder.finish());
    }

    {
      const renderEncoder = this.device.createCommandEncoder();

      const colorTexture = this.context.getCurrentTexture();
      const imageCopyBuffer: GPUImageCopyBuffer = {
        buffer: this.outputBuffer,
        rowsPerImage: this.canvas.height,
        bytesPerRow: this.canvas.width * 4,
      };
      const imageCopyTexture: GPUImageCopyTexture = {
        texture: colorTexture,
      };
      const extent: GPUExtent3D = {
        width: this.canvas.width,
        height: this.canvas.height,
      };
      renderEncoder.copyBufferToTexture(imageCopyBuffer, imageCopyTexture, extent);

      // From https://developer.chrome.com/articles/gpu-compute/.
      // Encode commands for copying buffer to buffer.
      renderEncoder.copyBufferToBuffer(
        imageCopyBuffer.buffer,
        0,
        this.readBuffer,
        0,
        this.canvas.width * this.canvas.height * Uint32Array.BYTES_PER_ELEMENT,
      );

      commandBuffers.push(renderEncoder.finish());
    }

    this.queue.submit(commandBuffers);

    // Read buffer.
    await this.readBuffer.mapAsync(GPUMapMode.READ);
    this.frame = new ImageData(
      this.bgraToRgba(new Uint8ClampedArray(this.readBuffer.getMappedRange())),
      this.canvas.width,
      this.canvas.height,
    );
    this.readBuffer.unmap();
  }
}
