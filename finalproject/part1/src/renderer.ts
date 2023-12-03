import { getShader } from './shaders/main-shader.js';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';
import {
  FinalScene,
  Scene,
  FourSphere,
  FourSphereCameraPosition,
  MeshShowcase,
  BvhTest,
} from './scenes.js';
import { RaytracingConfig } from './copyable/raytracing-config.js';
import { ListBladeApi, Pane } from 'tweakpane';
import { vec4 } from 'gl-matrix';

function Copy(src: ArrayBuffer, dst: ArrayBuffer) {
  new Uint8Array(dst).set(new Uint8Array(src));
}

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
  outputReadBuffer: GPUBuffer;
  // @ts-ignore
  statsBuffer: GPUBuffer;
  // @ts-ignore
  statsReadBuffer: GPUBuffer;
  // @ts-ignore
  materialsBuffer: GPUBuffer;
  // @ts-ignore
  worldBuffer: GPUBuffer;
  // @ts-ignore
  cameraIpBuffer: GPUBuffer;
  // @ts-ignore
  raytracingConfigBuffer: GPUBuffer;
  // @ts-ignore
  frame: ImageData;

  wgSize = 64;
  width: number;
  height: number;
  numGroups: number;

  raytracingConfig: RaytracingConfig = {
    // Antialiasing Requirement
    samples_per_pixel: 5,
    max_depth: 5,
    rand_seed: [Math.random(), Math.random(), Math.random(), Math.random()],
    weight: 0,
    use_bvhs: 0,
  };
  infiniteSamples: boolean = false;
  // @ts-ignore
  scene: Scene;
  pane: Pane = new Pane();
  dirty: boolean = true;

  // computeStats: Statistics;
  stats = {
    rayCastCount: 0,
    rayBvIntersectionCount: 0,
    rayObjectIntersectionCount: 0,
    frametime: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.numGroups = (this.width * this.height) / this.wgSize;
  }

  async init() {
    await this.initializeAPI();
    await this.onResize();
  }

  updatePipeline(scene: Scene, configOnly: boolean) {
    const materials = scene.materials;

    const code: string = getShader(
      this.wgSize,
      this.width,
      this.height,
      materials.length,
      scene.world.spheres.length,
      scene.world.meshes.length,
      scene.world.bvhs.length,
    );
    const defs = makeShaderDataDefinitions(code);

    if (!configOnly) {
      // Material buffer
      {
        const materialView = makeStructuredView(defs.uniforms.materials);
        materialView.set(materials);

        this.materialsBuffer = this.device.createBuffer({
          size: materialView.arrayBuffer.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });
        Copy(materialView.arrayBuffer, this.materialsBuffer.getMappedRange());
        this.materialsBuffer.unmap();
      }

      // World buffer
      {
        const worldView = makeStructuredView(defs.storages.world);

        worldView.set(scene.world);

        this.worldBuffer = this.device.createBuffer({
          size: worldView.arrayBuffer.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });
        Copy(worldView.arrayBuffer, this.worldBuffer.getMappedRange());
        this.worldBuffer.unmap();
      }

      // Camera parameters buffer
      {
        const cameraIpView = makeStructuredView(defs.uniforms.camera_ip);

        cameraIpView.set(scene.cameraInitializationParameters);

        this.cameraIpBuffer = this.device.createBuffer({
          size: cameraIpView.arrayBuffer.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });
        Copy(cameraIpView.arrayBuffer, this.cameraIpBuffer.getMappedRange());
        this.cameraIpBuffer.unmap();
      }

      // Stats buffers
      {
        const statsView = makeStructuredView(defs.storages.compute_stats);
        this.statsBuffer = this.device.createBuffer({
          size: statsView.arrayBuffer.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });

        const data = new Uint8Array(this.statsBuffer.getMappedRange());
        for (let i = 0; i < statsView.arrayBuffer.byteLength; ++i) {
          data[i] = 0x00;
        }
        this.statsBuffer.unmap();
      }
    }

    // Raytracing config buffer
    {
      const configView = makeStructuredView(defs.uniforms.config);

      configView.set(this.raytracingConfig);

      this.raytracingConfigBuffer = this.device.createBuffer({
        size: configView.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      Copy(configView.arrayBuffer, this.raytracingConfigBuffer.getMappedRange());
      this.raytracingConfigBuffer.unmap();
    }

    this.pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({
          code: code,
        }),
        entryPoint: 'main',
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.outputBuffer } },
        { binding: 1, resource: { buffer: this.materialsBuffer } },
        { binding: 2, resource: { buffer: this.worldBuffer } },
        { binding: 3, resource: { buffer: this.cameraIpBuffer } },
        { binding: 4, resource: { buffer: this.raytracingConfigBuffer } },
        { binding: 5, resource: { buffer: this.statsBuffer } },
      ],
    });
  }

  initializeTweakPane() {
    let update = () => {
      this.updatePipeline(this.scene, false);
      this.dirty = true;
    };

    let fourSphereOptions = [
      FourSphereCameraPosition.FRONT,
      FourSphereCameraPosition.WIDE,
      FourSphereCameraPosition.TELEPHOTO,
      FourSphereCameraPosition.TOP,
      FourSphereCameraPosition.REFLECTION_DETAIL,
    ].map(e => {
      let scene = new FourSphere(e);
      return { text: scene.description, value: scene };
    });

    const finalScene = new FinalScene();
    const meshShowcase = new MeshShowcase();
    this.scene = fourSphereOptions[0].value;

    // View Requirement
    let sceneBlade = this.pane.addBlade({
      view: 'list',
      label: 'Scene',
      options: [
        ...fourSphereOptions,
        { text: FinalScene.description, value: finalScene },
        { text: MeshShowcase.description, value: meshShowcase },
      ],
      value: this.scene,
    }) as ListBladeApi<Scene>;
    sceneBlade.on('change', ev => {
      this.scene = ev.value;
      update();
    });

    let samplesBinding = this.pane.addBinding(this.raytracingConfig, 'samples_per_pixel', {
      label: 'Samples Per Pixel',
      min: 1,
      max: 250,
      step: 1,
    });
    samplesBinding.on('change', ev => {
      this.raytracingConfig.samples_per_pixel = ev.value;
      update();
    });

    let infiniteSamplesBinding = this.pane.addBinding(
      { infinite: this.infiniteSamples },
      'infinite',
      {
        label: 'Infinite Samples',
      },
    );
    infiniteSamplesBinding.on('change', ev => {
      this.infiniteSamples = ev.value;
      update();
    });

    let depthBinding = this.pane.addBinding(this.raytracingConfig, 'max_depth', {
      label: 'Max Ray Depth',
      min: 1,
      max: 100,
      step: 1,
    });
    depthBinding.on('change', ev => {
      this.raytracingConfig.max_depth = ev.value;
      update();
    });

    let useBvhsBinding = this.pane.addBinding({ useBvhs: false }, 'useBvhs', {
      label: 'Use BVHs',
    });
    useBvhsBinding.on('change', ev => {
      this.raytracingConfig.use_bvhs = ev.value ? 1 : 0;
      update();
    });

    let stats = this.pane.addFolder({
      title: 'Statistics',
      expanded: true,
    });

    stats.addBinding(this.stats, 'frametime', {
      label: 'Frametime (ms)',
      readonly: true,
      format: v => v.toFixed(1),
    });

    stats.addBinding(this.stats, 'rayCastCount', {
      label: 'Rays Cast',
      readonly: true,
      format: v => v.toFixed(0),
    });

    stats.addBinding(this.stats, 'rayBvIntersectionCount', {
      label: 'Nearest Ray Bounding Volume Intersections',
      readonly: true,
      format: v => v.toFixed(0),
    });

    stats.addBinding(this.stats, 'rayObjectIntersectionCount', {
      label: 'Nearest Ray Object Intersections',
      readonly: true,
      format: v => v.toFixed(0),
    });
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
    this.device.lost.then(info => {
      console.error(`WebGPU device was lost: ${info.message}`);
    });
    this.queue = this.device.queue;

    // Output and read buffers
    {
      const bufferNumElements = this.width * this.height;
      this.outputBuffer = this.device.createBuffer({
        size: bufferNumElements * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      // Get a GPU buffer for reading in an unmapped state.
      this.outputReadBuffer = this.device.createBuffer({
        size: bufferNumElements * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    // Stats read buffer
    {
      const code: string = getShader(this.wgSize, this.width, this.height, 0, 0, 0, 0);
      const defs = makeShaderDataDefinitions(code);

      const statsView = makeStructuredView(defs.storages.compute_stats);
      this.statsReadBuffer = this.device.createBuffer({
        size: statsView.arrayBuffer.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    this.initializeTweakPane();
    this.updatePipeline(this.scene, false);
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

  frameSamplesPerPixel = {
    max: 2, // Max per frame (constant)
    left: 0, // How many are left to process this frame
    done: 0, // How many processed so far
  };

  async render(dt: number) {
    let commandBuffers = Array<GPUCommandBuffer>();

    if (this.pipeline === undefined) {
      return;
    }

    // Run the compute shader
    const encoder = this.device.createCommandEncoder();

    if (this.dirty) {
      if (this.infiniteSamples) {
        this.frameSamplesPerPixel.left = Number.MAX_VALUE;
      } else {
        this.frameSamplesPerPixel.left = this.raytracingConfig.samples_per_pixel;
      }
      this.frameSamplesPerPixel.done = 0;
      this.dirty = false;
    }

    if (this.frameSamplesPerPixel.left > 0) {
      let startTime = performance.now();

      let currSamplesPerPixel = Math.min(
        this.frameSamplesPerPixel.left,
        this.frameSamplesPerPixel.max,
      );
      // Compute the amount this frame will contribute to the final pixel as a ratio of how many samples have
      // been processed so far.
      let weight = currSamplesPerPixel / (this.frameSamplesPerPixel.done + currSamplesPerPixel);
      // console.log(`currSamplesPerPixel: ${currSamplesPerPixel}, weight: ${weight}`)

      this.raytracingConfig = {
        max_depth: this.raytracingConfig.max_depth,
        samples_per_pixel: currSamplesPerPixel,
        rand_seed: vec4.fromValues(Math.random(), Math.random(), Math.random(), Math.random()),
        weight: weight,
        use_bvhs: this.raytracingConfig.use_bvhs,
      };

      this.updatePipeline(this.scene, true);

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(this.numGroups);
      pass.end();

      this.frameSamplesPerPixel.left -= currSamplesPerPixel;
      this.frameSamplesPerPixel.done += currSamplesPerPixel;

      // const pass = encoder.beginComputePass();
      // pass.setPipeline(this.pipeline);
      // pass.setBindGroup(0, this.bindGroup);
      // pass.dispatchWorkgroups(this.numGroups);
      // pass.end();

      // Copy output from compute shader to canvas
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
      encoder.copyBufferToTexture(imageCopyBuffer, imageCopyTexture, extent);

      // // From https://developer.chrome.com/articles/gpu-compute/.
      // Encode commands for copying buffer to buffer.
      encoder.copyBufferToBuffer(
        imageCopyBuffer.buffer,
        0,
        this.outputReadBuffer,
        0,
        this.canvas.width * this.canvas.height * Uint32Array.BYTES_PER_ELEMENT,
      );

      encoder.copyBufferToBuffer(
        this.statsBuffer,
        0,
        this.statsReadBuffer,
        0,
        this.statsBuffer.size,
      );

      commandBuffers.push(encoder.finish());

      this.queue.submit(commandBuffers);

      // Read buffer.
      await this.outputReadBuffer.mapAsync(GPUMapMode.READ);
      this.frame = new ImageData(
        this.bgraToRgba(new Uint8ClampedArray(this.outputReadBuffer.getMappedRange())),
        this.canvas.width,
        this.canvas.height,
      );
      this.outputReadBuffer.unmap();

      // Stats read
      await this.statsReadBuffer.mapAsync(GPUMapMode.READ);
      const statsArray = new Uint32Array(this.statsReadBuffer.getMappedRange());
      this.stats.rayCastCount = statsArray[0];
      this.stats.rayBvIntersectionCount = statsArray[1];
      this.stats.rayObjectIntersectionCount = statsArray[2];
      this.statsReadBuffer.unmap();

      this.stats['frametime'] = performance.now() - startTime;
    }
  }
}
