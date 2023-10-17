# Your Information

*TODO*: Please edit the following information in your assignment

* Name: Jonathan Edelman
* How many hours did it take you to complete this assignment? 
  * Approximately 30 hours.
* Did you collaborate or share ideas with any other students/TAs/Professors? 
  * No.
* Did you use any external resources? 
  * amaiorano's implementation of raytracing in one weekend in WebGPU was referenced, primarily in choosing which parameters to pass in via uniform/storage buffers. I oped for a very different scene setup structure, as well as an alternative method for calculating offsets. Per-sample rendering was copied relatively directly due to the complexity of this schema.
  * [webgpufundamentals.org](https://webgpufundamentals.org/) was referenced, particularly for understanding storage and uniform buffers.
  * I worked with the author of webgpu-utils to address [an issue in the library.](https://github.com/greggman/webgpu-utils/issues/3)
  * Chrome's and Mozilla's WebGPU developer documentation was regularly referenced.
  * The [WGSL specification](https://www.w3.org/TR/WGSL/) was regularly referenced.
  * [Tweakpane's documentation](https://cocopon.github.io/tweakpane/) was referenced for setting up Tweakpane.
* (Optional) What was the most interesting part of the assignment? How would you improve this assignment?

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
      <td align="left">Do you have a repositionable camera</td>
    </tr>
    </tr>
       <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Did you implement antialiasing?</td>
    </tr>
    </tr>
       <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Did you implement a depth of field (DoF)</td>
    </tr>
    </tr>
       <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Did you output 5 images?</td>
    </tr>
  </tbody>
</table>

* Core is the material everyone can get through. I expect everyone to complete this. Coming to class, listening to lectures, and reviewing materials should be sufficient.
* Intermediate is a little more difficult. Very likely you will have to utilize office hours, piazza, etc.
* Advanced is more challenging. You will have to spend more time and very likely use outside materials. I do not expect everyone to complete the advanced section.
