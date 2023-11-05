# Your Information

* Name: **Jonathan Edelman**
* How many hours did it take you to complete this assignment?: **Approximately 26**
* Did you collaborate or share ideas with any other students/TAs/Professors?: **I worked with Professor  Shah to try and debug an issue when rendering larger scenes.**
* Did you use any external resources? 
  * scratchapixel's [guide to rendering ray-traced triangle](https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/ray-triangle-intersection-geometric-solution.html) was extensively referenced, with the core ray-traingle intersection code copied from their implementation of Möller-Trumbore.
  * The [Wikipedia page on Möller-Trumbore](https://en.wikipedia.org/wiki/Möller–Trumbore_intersection_algorithm) was referenced, though ultimately no code was used from it.
  * [This guide to using compute shaders with vertex data](https://toji.dev/webgpu-best-practices/compute-vertex-data.html) was referenced, though the actual information that ended up being relevant was basically limited to alignment-related concepts.
  * [webgpufundamentals.org](https://webgpufundamentals.org/) was referenced during debugging to see if there were any WebGPU concepts that might be important when dealing with larger buffers.
  * [alain.xyz's raw WebGPU guide](https://alain.xyz/blog/raw-webgpu) was used as a review of high-level concepts.
  * Chrome's and Mozilla's WebGPU developer documentation was regularly referenced.
  * The [WGSL specification](https://www.w3.org/TR/WGSL/) was regularly referenced, as was [the explainer](https://gpuweb.github.io/gpuweb/explainer/).
* (Optional) What was the most interesting part of the assignment? How would you improve this assignment?
  * Though it was fairly frustrating (and ultimately remains somewhat incomplete), the process of debugging the issues with larger scenes was interesting, as I got to test my understanding of compute shaders and WebGPU.
  * N.b.: While scenes up to 512 vertices/faces are currently stable with a storage buffer, scenes of 1024 and larger still seem to be unstable. This has not yet been root caused. It doesn't appear to be alignment, OOB, or workgroup size related; it is likely timeout related, but this doesn't seem to be easily configurable in WebGPU.

# Assignment

This assignment consists of [part1](./part1).

# Rubric


<table>
  <tbody>
    <tr>
      <th>Points</th>
      <th align="center">Description</th>
    </tr>
    <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Core - Does your code compile, use good programming style, etc. Did you provide me a trivial way to compile or otherwise run your code?</td>
    </tr>
     <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Did you upload an output.ppm image?</td>
    </tr>   
     <tr>
      <td>Part 1 - 60% (Core)</td>
      <td align="left">Can you load and render a .obj model?</td>
    </tr>
  </tbody>
</table>

* Core is the material everyone can get through. I expect everyone to complete this. Coming to class, listening to lectures, and reviewing materials should be sufficient.
* Intermediate is a little more difficult. Very likely you will have to utilize office hours, piazza, etc.
* Advanced is more challenging. You will have to spend more time and very likely use outside materials. I do not expect everyone to complete the advanced section.
