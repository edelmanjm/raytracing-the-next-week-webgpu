# Your Information

*TODO*: Please edit the following information in your assignment

* Name: Jonathan Edelman
* How many hours did it take you to complete this assignment? At least 35, and I wouldn't be surprised if way more.
* Did you collaborate or share ideas with any other students/TAs/Professors?  No
* Did you use any external resources?
  * Shirley's _Ray Tracing: The Next Week_ was referenced for the basic BVH algorithms, with significant modifications to remove recursion.
  * [This Nvidia paper](https://dl.acm.org/doi/10.5555/2977336.2977343), as well as several of the papers it references or compares itself to, were referenced in researching a stackless BVH traversal algorithm. Ultimately I did not have time to implement one, but I hope to in the future.
  * I opened an issue with webgpu-utils, though it ultimately proved to be a restriction of WebGPU.
  * [This guide to using compute shaders with vertex data](https://toji.dev/webgpu-best-practices/compute-vertex-data.html) was referenced during debugging, though it didn't prove useful.
  * Chrome's and Mozilla's WebGPU developer documentation was regularly referenced.
  * The [WGSL specification](https://www.w3.org/TR/WGSL/) was regularly referenced, as was [the explainer](https://gpuweb.github.io/gpuweb/explainer/).
* (Optional) What was the most interesting part of the assignment? How would you improve this assignment?
  * The different BVH traversal algorithms are super interesting. I'd like to know if there are other good, easy options for constructing the BVH besides the one shown in Shirley; I think including those as resources in the assignment document might be nice.

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
      <td>Part 1 - 60% (Core)</td>
      <td align="left">Did you implement a bounding volume</td>
    </tr>   
     <tr>
      <td>Part 1 - 20% (Core)</td>
      <td align="left">Did you output the required summary statistics?</td>
    </tr>
  </tbody>
</table>

* Core is the material everyone can get through. I expect everyone to complete this. Coming to class, listening to lectures, and reviewing materials should be sufficient.
* Intermediate is a little more difficult. Very likely you will have to utilize office hours, piazza, etc.
* Advanced is more challenging. You will have to spend more time and very likely use outside materials. I do not expect everyone to complete the advanced section.
