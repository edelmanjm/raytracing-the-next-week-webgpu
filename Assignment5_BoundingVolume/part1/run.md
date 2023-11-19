# Run.md

This implementation of the assignment is written principally in WebGPU/WGSL. *WebGPU is a very new standard*, and its implementations are quite new. Support can be limited, and at times, buggy. These instructions are intended to give the highest chance of success, but *there may be hitches due to underlying WebGPU bugs, rather than my implementation of the assignment.* If you see any issues, please let me know so we can root cause them appropriately. A pre-rendered image is included in the `media/` directory as reference.

**Please note that with assignment 5 in particular, I've struggled immensely with GPU "Device is lost" errors.** Sometimes the scene renders, sometimes it doesn't, even without changing the code. Currently, this appears to occur across OSs, GPU vendors, and WebGPU backends, both with and without BVHs. I don't know what the cause is, and you may or may not face these issues on your system. Unfortunately, I've reached the limit of my ability to debug further on my own for this assignment.

1. Update your GPU drivers. DDU + fresh install is recommended, but probably not required.
2. **Download the latest stable version of Google Chrome.** Chrome 113 (May 10, 2023) is *required*, and Chrome 117 or newer is *highly recommended.* Chrome Canary (nightly) can also be more stable on some systems. WebGPU support in other browsers (even other Chromium distributions) is generally poor, and not recommended.
3. Ensure you have Node.js 20 installed.
4. In the `Assignment5_Triangles/` directory, run `npm install && npm start`.
5. In Chrome, navigate to http://localhost:1234/. You should see a rendered scene.
6. Use the Tweakpane to select the desired scene and set quality preferences.
7. To download `output-<x>.ppm`, press the download button. Automatic downloading is not possible due to the security restrictions of web browsers.