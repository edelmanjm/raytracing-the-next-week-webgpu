## Quick dip into C++17

Provided below is a first C++ code snippet so you can get up to speed. Our first assignment will help us take a deeper dive into C++. For now, I want to know you can compile modern C++ code.

```cpp
// A first C++ program
// Standard libraries that we include.
#include <iostream>
#include <string>

// Specially named function that is the entry point into our program.
int main()
{
    
// ========================== for - loops ====================
     // Allocate an array on the stack.
     // This array cannot be referenced outside the main function.
     int myArray[10];
     
     // A loop that pre-increments 'i' by one each iteration of the
     // loop.
     for(int i =0; i < 10 ; ++i) {
        // If we are modifying values , then use a regular for-loop
        myArray[i] = i ;
        // cout is also part of the standard library, and prints
        // text to standard output (i.e. typically our terminal window)
        std::cout << i << " ";
     }
    
     // Here we create a string type. It is part of the 
     // standard library namespace, which is why it begins with
     // std::
     std::string s= "hello";
     
     // Here is a different kind of loop.
     for(char c : s) {
     // Range-based for loops are useful if we are not modifying any values.
     // Ranged-based for loops were introduced in C++11 and are a new popular feature
     // in many other programming languages, and now C++
        std::cout << c ;
     }
     
     // More information can be found here: http://en.cppreference.com/w/cpp/language/range-for
}
```


- Type out(i.e. DO NOT just copy and paste) the above code sample in [part4/example.cpp](./part4/example.cpp).
  - Compile and run with the following on the terminal:
    - Linux Option 1: `clang++ -std=c++17 example.cpp -o example`
    - Linux Option 2: `g++ -std=c++17 example.cpp -o example`
    - Mac Option 1:   `clang++ -std=c++17 example.cpp -o example`
    - Mac Option 2:   `g++ -std=c++17 example.cpp -o example`
    - Mac Option 3:   Create a console-based XCode project
    - Windows Option 1: `g++ -std=c++17 example.cpp -o example`
    - Windows Option 2: Create a console-based Visual Studio C++ project
  - Finally, make sure to do a 'git add', 'git commit', and 'git push' of example.cpp to practice working with git.
