bonsai-c
========

***Very early work-in-progress***

bonsai-c is a C-to-Javascript compiler, outputting asm.js-compatible code, operating on a fundamentally different model to Emscripten.

Wait, what's wrong with Emscripten?
-----------------------------------

It's basically Java Applets 2.0.

It's perfect if you've got a great big POSIX C + SDL codebase that you want to run in its own self-contained environment in a browser, but it's not very helpful for writing idiomatic Javascript code that just needs to drop into optimised asm.js occasionally for some heavy lifting.

bonsai-c is a tool for writing programs, not porting them. By building a C compiler from the ground up, rather than bolting a Javascript backend onto a mature C compiler, we can tailor it to the needs of Javascript programmers. You can use it to write a function for calculating fibonacci numbers, and you will get back an asm.js-compliant Javascript module with an obvious entry point, for calculating fibonacci numbers. You will not get a mountain of runtime code to implement file handling and malloc and a million other things you didn't ask for.

bonsai-c won't provide a full C implementation from day one. It won't have fancy features like, for example, strings. What it will do is provide a way for programmers to harness the power of asm.js, with a syntax that's as familiar as it gets.

Build
-----

Install Node.js <https://nodejs.org/>.

Install jison:

    npm install -g jison

Then, from the root of the codebase:

    npm install
    npm run build-parser

Usage
-----

    node bonsai-c.js infile.c
