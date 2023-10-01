# Your Information

*TODO*: Please edit the following information in your assignment

* Name: Jonathan Edelman
* How many hours did it take you to complete this assignment? 
* Did you collaborate or share ideas with any other students/TAs/Professors? 
  * No.
* Did you use any external resources? 
  * amaiorano's implementation of raytracing in one weekend in WebGPU was referenced for initial setup and some limited design considerations, principally how to actually set up a WebGPU raytracing environment in a fragment shader. This covered most of chapters 3 and 4 of the textbook. Except for random number generation (chapter 8.1) and material abstractions (chapter 10.1), this repo was only used for debugging WebGPU-specific bugs and as output reference for the remaining chapters.
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
      <td>Part 1 - 30% (Core)</td>
      <td align="left">Core - Does your code compile, use good programming style, etc. Did you provide me a trivial way to compile or otherwise run your code?</td>
    </tr>
       <tr>
      <td>Part 1 - 10% (Core)</td>
      <td align="left">Did you output an output.ppm image and commit it to the repository</td>
    </tr>
    <tr>
      <td>Part 1 - 60% (Intermediate)</td>
      <td align="left">Does your ray tracer generate a ppm image with the 'concrete requirements' specifications provided in the writeup?<ul><li>(10%) Sphere Requirement - At least 3 spheres</li><li>(10%) Material Requirement - At least 2 materials (e.g. diffuse sphere, glass, metal, opaque color, etc.)</li><li>(10%) Reflection requirement - Support reflection (e.g. a metal sphere would show this property)</li><li>(10%) Camera Requirement - A Camera class such that you can position the camera in different orientations</li><li>(10%) PPM Requirement - The ability to output an image called 'output.ppm'</li><li>(10%) Gamma Requirement - Implement gamma correction. You can use the trick Shirley uses in his book.</li></ul>      </td>
    </tr>
  </tbody>
</table>

* Core is the material everyone can get through. I expect everyone to complete this. Coming to class, listening to lectures, and reviewing materials should be sufficient.
* Intermediate is a little more difficult. Very likely you will have to utilize office hours, piazza, etc.
* Advanced is more challenging. You will have to spend more time and very likely use outside materials. I do not expect everyone to complete the advanced section.
