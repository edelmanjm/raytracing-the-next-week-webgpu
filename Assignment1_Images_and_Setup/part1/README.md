# Part 1- PPM Library

## Implementation Logistics

- You may use whatever operating system, IDE, or tools for completing this lab/assignment.
	- However, my instructions will usually be using the command-line, and that is what I will most easily be able to assist you with.
- You may use whatever programming language that you like
	- Plan on committing to this language for the duration of the semester. Any mainstream language should be fine--consult the instructor otherwise if you are not sure.
- In the future there may be restrictions, so please review the logistics each time.

**For this Lab/Assignment**: You will be working on your own laptop/desktop machine.

# Resources to help

- Image Library related
	- The PPM Format Specification
		- http://netpbm.sourceforge.net/doc/ppm.html

# Description

For this assignment you are going to implement a PPM parsing tool. PPM is a data format for structuring image data. You likely have used or saved images formatted as .jpg, .bmp, .png, or .gif, and now you will understand .ppm. 

For this first exercise you are going to build an image parser in whatever language you like. You should use this project as a way to pick your programming langauge for the semester.  This assignment will otherwise introduce you to how image data is stored. The **deliverables** section describes the expected output.

**For Students in my Graphics Course**: Some of the assignment will be familiar, but some of it has changed--read carefully!

## Images Background

<img align="right" src="./media/RGB-animation.gif" width="400px" alt="RGB Animation">

Images are made up of pixels, which are located with an x,y coordinate. That is, a 64x128 image, is 64 pixels wide, and 128 pixels high. Within each pixel (say pixel (2,100)) are three values, that specify the red, green, and blue components for that individual pixel. The higher the value from a range of 0-255, the more that color is expressed.

The PPM format looks something like this:

```
P3
# some_image.ppm (Note this is just a comment)
64 128
255
 0  0  0    0  0  0    0  0  0   125 0  125 .... 60 more triples.
 0  0  0    0 225 7    0  0  0    0  0  0   .... 60 more triples.
 0  0  0    0  0  0    0 15  7    0  0  0   .... 60 more triples.
15  0 15    0  0  0    0  0  0    0  0  0   .... 124 more rows follow.
```

1. The first line is the 'header' data of the file, which describes which specific format of PPM data you are loading.
2. The second line begins with a '#' which is merely a comment. This line should be ignored when reading in data.
3. The third line specifies the width (64 pixels) and the height(128) pixels.
4. The fourth line specifies the maximum value for an individual color value(i.e. the red, green, or blue component). So values will range from 0 to 255.
	- One thing to note here, is that if we are only storing values between 0-255, we can use an uint8_t (i.e. an *unsigned char*) to be efficient.

### Assignment - Task 1

For this assignment, you are going to write a program that can read as input (from the command line argument) an image.ppm file and apply a transformation to change that program. The image.ppm your program will read in is a valid P3 ppm image (You do not have to read in P6 binary format).

For example, you will use one of the following ways to run your program and load a .ppm image.

[DLang with arguments](https://www.youtube.com/watch?v=Eq2R7ljpGQE)
```
./prog image.ppm
```

[C++ with arguments](https://www.youtube.com/watch?v=C2Vhp-ozA0k)
```
./prog image.ppm
```

[Java with arguments](https://www.learnjavaonline.org/en/Compiling_and_Running_with_Arguments)
```
javac program.java
java program image.ppm
```

[JavaScript with arguments using nodejs](https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/)
```
node program.js image.ppm
```

[Python3 with arguments](https://www.tutorialspoint.com/python/python_command_line_arguments.htm
)
```
python3 program.py image.ppm
```

#### Output of program

After running your program, you will then output **5** image files.

1. The image as a P3 format .ppm saved as "darken_p3.ppm" where the pixels are all half as bright.
2. The image as a P6 format .ppm saved as "darken_p6.ppm" where the pixels are all half as bright.
3. The image as a P3 format .ppm saved as "lighten_p3.ppm" where the pixels are all twice as bright.
4. The image as a P6 format .ppm saved as "lighten_p6.ppm" where the pixels are all twice as bright.
5. The fifth image will be a p3 formatted .ppm called "circle.ppm" in which you draw a circle on the image.
	- The background color should be black
	- The color of the circle can be any color other than black such that I can see it.
	- The circle can be filled or just an outline.
	- This means as part of your .ppm library, you will need the ability to modify pixels or otherwise create a 'blank' canvas that you can draw on.

Pixels that would have a value greater than 255 will be capped at 255. Pixels that would have a value lower than 0, will be capped at 0. Thus the pixels range is clamped from 0 to 255.

Some test files are provided that I will use to grade the assignment in the [./common/textures](../../common/textures/) folder. Assume if your program can read those .ppm image files that your parser is working!

#### Spirit of the assignment

If you find a 'ppm' loader library or package in C/C++/Python/Java/etc. **you may not** use it! You need to be able to write your own image parser and work with raw pixels. The goal is for you to be able to build graphics assignments from scratch (Also--I do not want to install dependencies and strange libraries :) )

## How to run your program

Your solution will include a document called [run.md](./run.md) that provides instructions on how to compile/interpret/execute/etc. your program. You should minimize the number of dependencies needed. Please edit the [run.md](./run.md) so that I know how to run your software. The goal again is to be able to easily run your program with an input image.ppm and generate 5 outputs. 

## Deliverables

* Implement the PPM Library such that an image can be loaded from the command line arugments.
	- Pixels can be changed (such that you can brighten, lighten, or arbitrarily draw pixels)
	- Images can be saved as either a P3 or P6 format.
	- The 5 .ppm images are automatically generated
* Make sure to commit your source code changes to the code repository.
	* Note: You should not implement the PPM images to the repository.
	* Note: You should not commit your .ppm images to the repository.

# F.A.Q. (Instructor Anticipated Questions)

- Q: My darken value is not properly staying at 255 when exceeding 255.
	- A: Careful! The data type you use may have a range of 0-255 (i.e. 8 bits). So when you exceed that range (say lighten a pixel of value 200, and it becomes 200 x 2=400, it exceeds the data types range), you should compute that in an intermediate data type that is larger, say an 'int', and then store the result back into the unsigned 8 bit type.
- Q: Will PPM images you test on be valid?
	- A: Yes, I will not for example send in dimensions of 10x10 and only supply 1 pixel of data. Although, this might be nice functionality to handle in your PPM class!
- Q: What does it mean to handle ppm values with only one value on a line versus multiple?
	- A: (below)
	
```
One value
P3
# some_image.ppm (Note this is just a comment)
64 
128
255
0
0
0
0
0
0
0
0
0
125
0
125
```

```
multiple values
P3
# some_image.ppm (Note this is just a comment)
64 128
255
 0  0  0    0  0  0    0  0  0   125 0  125
```

- Q: What is the difference between a P3 and P6 PPM Image
	- A: https://my.eng.utah.edu/~cs5610/ppm.html
	- <details>
				<summary>A copy and paste of the website above</summary>

		## PPM

		A PPM file consists of two parts, a header and the image data. The header consists of at least three parts normally delinineated by carriage returns and/or linefeeds but the PPM specification only requires white space. The first "line" is a magic PPM identifier, it can be "P3" or "P6" (not including the double quotes!). The next line consists of the width and height of the image as ascii numbers. The last part of the header gives the maximum value of the colour components for the pixels, this allows the format to describe more than single byte (0..255) colour values. In addition to the above required lines, a comment can be placed anywhere with a "#" character, the comment extends to the end of the line.

		The following are all valid PPM headers.

		## Header example 1
		```
		P6 1024 788 255
		```

		## Header example 2

		```
		P6 
		1024 788 
		# A comment
		255
		```

		## Header example 3

		```
		P3
		1024 # the image width
		788 # the image height
		# A comment
		1023
		```

		The format of the image data itself depends on the magic PPM identifier. If it is "P3" then the image is given as ascii text, the numerical value of each pixel ranges from 0 to the maximum value given in the header. The lines should not be longer than 70 characters.

		## PPM example 4

		```
		P3
		# example from the man page
		4 4
		15
		 0  0  0    0  0  0    0  0  0   15  0 15
		 0  0  0    0 15  7    0  0  0    0  0  0
		 0  0  0    0  0  0    0 15  7    0  0  0
		15  0 15    0  0  0    0  0  0    0  0  0
		```

		If the PPM magic identifier is "P6" then the image data is stored in byte format, one byte per colour component (r,g,b). Comments can only occur before the last field of the header and only one byte may appear after the last header field, normally a carriage return or line feed. "P6" image files are obviously smaller than "P3" and much faster to read. Note that "P6" PPM files can only be used for single byte colours.

		While not required by the format specification it is a standard convention to store the image in top to bottom, left to right order. Each pixel is stored as a byte, value 0 == black, value 255 == white. The components are stored in the "usual" order, red - green - blue.
		</details>
- Q: Do we have to save the comments when we save the PPM.
	- A: Nope. It may be a nice feature, but not necessary.

# Found a bug?

If you found a mistake (big or small, including spelling mistakes) in this lab, kindly send me an e-mail. It is not seen as nitpicky, but appreciated! (Or rather, future generations of students will appreciate it!)

- Fun fact: The famous computer scientist Donald Knuth would pay folks one $2.56 for errors in his published works. [[source](https://en.wikipedia.org/wiki/Knuth_reward_check)]
- Unfortunately, there is no monetary reward in this course :)

