import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { DiffResult, DiffOptions, AssemblyInfo } from './types';
import { createPatch } from 'diff';
import * as os from 'os';
import { getPaths, IS_WINDOWS } from './utils';
import { randomBytes } from 'crypto';

/**
 * Makes a file non-executable and optionally renames it with a random extension on Windows
 * @param filePath Path to the assembly file
 * @returns Path to the secured assembly file
 */
async function secureAssembly(filePath: string): Promise<string> {
    // On Unix systems, remove execute permissions
    if (!IS_WINDOWS) {
        await fs.chmod(filePath, '644');
        return filePath;
    }
    
    // On Windows, add random extension to prevent execution
    const randomExt = randomBytes(4).toString('hex');
    const securedPath = `${filePath}.${randomExt}`;
    await fs.copy(filePath, securedPath);
    return securedPath;
}

/**
 * Decompiles a .NET assembly to C# source code
 * @param assembly The assembly information including path and optional dependencies
 * @param outputPath The directory where decompiled source should be written
 * @throws Error if ILSpy tools are not found or decompilation fails
 */
export async function decompile(assembly: AssemblyInfo, outputPath: string): Promise<void> {
    const { dotnetPath, ilspyBin } = getPaths();
    const originalPath = assembly.assemblyPath;

    if (!(await fs.pathExists(ilspyBin))) {
        throw new Error(
            `ILSpy tools not found at path: ${ilspyBin}. ` +
            `Make sure the package is properly installed and the .dotnet directory exists.`
        );
    }

    // Secure the assembly file
    const securedPath = await secureAssembly(originalPath);
    const args = [securedPath, '-o', outputPath];

    if (assembly.dependenciesPath) {
        const dependenciesPath = path.resolve(assembly.dependenciesPath);
        if (!(await fs.pathExists(dependenciesPath))) {
            throw new Error(`Dependencies path does not exist: ${dependenciesPath}`);
        }
        args.push('--referencepath', dependenciesPath);
    }

    try {
        await new Promise<void>((resolve, reject) => {
            const proc = spawn(ilspyBin, args, {
                env: {
                    ...process.env,
                    DOTNET_ROOT: dotnetPath,
                    PATH: `${dotnetPath}${path.delimiter}${process.env.PATH}`,
                },
            });

            proc.stdout.on('data', (data) => console.log(data.toString()));
            proc.stderr.on('data', (data) => console.error(data.toString()));

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Decompilation failed with code ${code}`));
                }
            });
        });
    } finally {
        // Clean up secured file if it was created
        if (securedPath !== originalPath) {
            await fs.remove(securedPath).catch(() => {});
        }
    }
}

/**
 * Decompiles and compares two .NET assemblies
 * @param first First assembly to compare
 * @param second Second assembly to compare
 * @param options Optional settings including output path
 * @returns Promise containing the decompiled sources and their diff
 * @throws Error if decompilation fails for either assembly
 */
export async function diffDecompiledAssemblies(
    first: AssemblyInfo,
    second: AssemblyInfo,
    options?: DiffOptions
): Promise<DiffResult> {
    const tempDir = options?.outputPath || (await fs.mkdtemp(path.join(os.tmpdir(), 'difflux-')));
    const firstOutputDir = path.join(tempDir, 'first');
    const secondOutputDir = path.join(tempDir, 'second');
    
    await fs.ensureDir(firstOutputDir);
    await fs.ensureDir(secondOutputDir);

    try {
        await decompile(first, firstOutputDir);
        await decompile(second, secondOutputDir);

        // Get the decompiled source files
        const getDecompiledPath = (assemblyPath: string, outputDir: string) => {
            const baseName = path.basename(assemblyPath).replace(/\.(dll|exe)$/i, '');
            return path.join(outputDir, `${baseName}.decompiled.cs`);
        };

        const firstDecompiledPath = getDecompiledPath(first.assemblyPath, firstOutputDir);
        const secondDecompiledPath = getDecompiledPath(second.assemblyPath, secondOutputDir);

        // Read the decompiled sources
        const firstSource = await fs.readFile(firstDecompiledPath, 'utf8');
        const secondSource = await fs.readFile(secondDecompiledPath, 'utf8');

        const diff = createPatch(
            'assembly.cs',
            firstSource,
            secondSource,
            'Original',
            'Modified',
            { context: 3 }
        );

        // Write diff to file if output path was provided
        if (options?.outputPath) {
            const diffPath = path.join(options.outputPath, 'assembly.diff');
            await fs.writeFile(diffPath, diff);
        }

        return {
            firstSource,
            secondSource,
            diff,
        };
    } finally {
        if (!options?.outputPath) {
            await fs.remove(tempDir);
        }
    }
}
