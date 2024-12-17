# @umbranoxio/difflux

A TypeScript library for decompiling and diffing .NET assemblies using ILSpy.

## How it works

This package works by bootstrapping the **.NET 6.0 SDK** into your `node_modules`, installs `ilspycmd` and uses it to decompile

For security reasons, whatever assembly is passed to this package is secured by adding a random extension to the file name, and on unix systems, the file is made non executable.

> Note: This package has only been tested on apple silicon. Raise an issue if you have any problems on other platforms.

## Installation

Install using npm:

```bash
npm install @umbranoxio/difflux
```

Or using pnpm:

```bash
pnpm add @umbranoxio/difflux
```

## Usage

### Basic Decompilation

Decompile a single assembly:

```typescript
import { decompile } from '@umbranoxio/difflux';

await decompile({ assemblyPath: './path/to/assembly.dll' }, './output/directory');
```

### Decompiling with Dependencies

If your assembly references external libraries, provide the path to those dependencies:

> All assemblies accociated with the assembly must be in the root of the `dependenciesPath`

```typescript
import { diffDecompiledAssemblies } from '@umbranoxio/difflux';

await decompile(
   {
      assemblyPath: './path/to/assembly.dll',
      dependenciesPath: './path/to/dependencies',
   },
   './output/directory'
);
```

### Comparing Two Assemblies

Generate a diff between two assemblies:

```typescript
import { diffDecompiledAssemblies } from '@umbranoxio/difflux';

const result = await diffDecompiledAssemblies(
   { assemblyPath: './path/to/first.dll' },
   { assemblyPath: './path/to/second.dll' },
   { outputPath: './diff/output' } // Optional
);

console.log(result.diff); // View the unified diff
console.log(result.firstSource); // Original decompiled source
console.log(result.secondSource); // Modified decompiled source
```

### Comparing Two Assemblies with dependencies

> All assemblies accociated with the assembly must be in the root of the `dependenciesPath`

```typescript
import { diffDecompiledAssemblies } from '@umbranoxio/difflux';

const result = await diffDecompiledAssemblies(
   {
      assemblyPath: './path/to/first.dll',
      dependenciesPath: './path/to/first/dependencies',
   },
   {
      assemblyPath: './path/to/second.dll',
      dependenciesPath: './path/to/second/dependencies',
   },
   { outputPath: './diff/output' } // Optional
);

console.log(result.diff); // View the unified diff
console.log(result.firstSource); // Original decompiled source
console.log(result.secondSource); // Modified decompiled source
```

## Requirements

-  Node.js
-  Internet connection (for initial .NET SDK download)

## License

MIT
