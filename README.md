
# WheatBytecode Assembler

This utility converts assembly code to bytecode application files for WheatSystem.

This repository may also be used as a Node.js module, and exports the following members:

* `types`: Provides TypeScript types and interfaces used by this module.
* `Assembler`: Provides methods to assemble a file.
* `AssemblyError`: Thrown when `Assembler` encounters a problem.
* `assemblyUtils`: Provides functions to help assemble files.
* `InstructionType`: Allows specifying non-standard instruction types.

## Installation and Usage

This application has the following system-wide dependencies:

* Node.js version ^16.4
* TypeScript version ^4.5
* pnpm version ^6.24

To install this application:

1. Install dependencies of the assembler: `pnpm install`
1. Compile the assembler: `npm run build`

To assemble a file into bytecode:

```
node ./dist/assemble.js [-v] (path to assembly file)
```

Bytecode application assembly files must have the extension `.wbasm`.

To assemble the example file `hello.wbasm` included in this repository:

```
node ./dist/assemble.js -v ./hello.wbasm
```

To use this repository as a dependency, add the following line to `dependencies` in your `package.json` file, replacing `(version)` with the desired version number:

```
"wheatbytecode-asm": "github:ostracod/wheatbytecode-asm#semver:^(version)"
```

## Instruction Syntax

Each instruction begins with an opcode followed by any number of comma-separated argument expressions.

Number literals:

* Decimal integer literal (Ex: `25`)
* Hexadecimal integer literal (Ex: `0x3F`)
* Floating point number literal (Ex: `2.5`)

Expression operators:

* `+`, `-`, `*`, `/`, and `%` perform arithmetic operations on constants
* `~`, `&`, `|`, `^`, `>>`, and `<<` perform bitwise operations on constants
* `(` and `)` manipulate order of operations
* `value:dataType` specifies the data type of a value
* `value[index]:dataType` accesses an element of a frame, region, or heap allocation

Data types:

* `u8`, `u16`, `u32`, and `u64` = Unsigned integer
* `s8`, `s16`, `s32`, and `s64` = Signed integer
* `f32` and `f64` = Floating point number

Note that all instruction arguments will be coerced to `s8`, `s16`, and `s32`, because these are the only data types supported by WheatBytecode.

Built-in identifiers:

* `localFrame` refers to the current local frame
* `globalFrame` refers to the global frame
* `prevArgFrame` refers to the argument frame supplied by the caller
* `nextArgFrame` refers to the argument frame for the next function invocation
* `appData` refers to the application data region
* `prevArg` refers to the previous argument of the same instruction
* `null` refers to the null pointer value
* All of the WheatSystem function types with the prefix `ws` (Ex: `wsInit`, `wsKill`)
* All of the error constants (Ex: `typeErr`, `permErr`)
* Allocation attribute flags `guardedAllocAttr` and `sentryAllocAttr`

## Directive Syntax

Each directive begins with a directive name followed by any number of comma-separated argument expressions.

Arguments which may only be used in directives:

* String literal enclosed in quotation marks (Ex: `"Hello"`)
* `guarded` function modifier

Certain directives initiate code blocks which are terminated by the `END` directive. For example:

```
FUNC myFunction
    # Code block body goes here.
END
```

## List of Directives

`DEF name, expression`  
Declares an alias to an expression.

`FUNC name, funcId?, funcModifiers? ... END`  
Declares a function. If no function ID is provided, the function ID will be zero.

`FUNC_TYPE name, funcId? ... END`  
Declares the type of a function which may be implemented in another application.

`VAR name, dataType, arrayLen?`  
Declares a local or global variable.

`ARG name, dataType, arrayLen?`  
Declares an argument variable.

`LBL name`  
Declares an instruction or data label.

`APP_DATA ... END`  
Declares the application data region.

`DATA values`  
Provides constant values for the application data region.

`INCLUDE path`  
Incorporates additional assembly code in the given file.

`MACRO macroName, argNames ... END`  
Declares a macro which may be used as an assembly directive.

## Miscellaneous Syntax

Comments are preceded by a pound symbol (`#`).

```
# This function does exciting stuff.
FUNC myFunc
    ARG myArg, s8 # Input number for the function.
    # TODO: Implement.
END
```

Use the unary at sign operator (`@`) to signify that an identifier is only visible in a single macro invocation.

```
MACRO myMacro, myArg
    # Variable "@myVar" is not visible within myFunc.
    VAR @myVar, s8
    wrt @myVar, 3
    add myArg, @myVar, myArg
END

FUNC myFunc
    # Variable "myVar" is distinct from "@myVar".
    VAR myVar, s8
    wrt myVar, 5
    myMacro myVar
END
```

Use the unary question mark operator (`?`) to refer to the index of a variable or app data label.

```
FUNC myFunc
    VAR dest, s8
    VAR myVar, s8
    # ?myVar is the index of myVar in the local frame.
    wrt dest, ?myVar
END
```

Use period operator (`.`) to retrieve the following attributes of a function or function type:

* `func.id` = Function ID
* `func.args.(name)` = Function argument in next argument frame
* `func.argsSize` = Size of function argument frame

```
FUNC myFunc
    ARG x, s32
    ARG y, s8
END

FUNC anotherFunc
    newArgFrame myFunc.argsSize
    wrt myFunc.args.x, 5
    wrt myFunc.args.y, 10
    call myFunc
END
```


