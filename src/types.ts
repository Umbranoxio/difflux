/**
 * Supported platforms for .NET SDK installation
 */
export type Platform = 'win32' | 'linux' | 'darwin';

/**
 * Supported CPU architectures for .NET SDK installation
 */
export type Architecture = 'x64' | 'arm64';

/**
 * Information about a .NET runtime installation
 */
export interface RuntimeInfo {
  /**
   * Version of the .NET runtime
   */
  version: string;

  /**
   * URL to download the runtime from
   */
  downloadUrl: string;

  /**
   * Path where the runtime is or will be installed
   */
  installPath: string;
}

/**
 * Options for installing .NET SDK and ILSpy
 */
export interface InstallOptions {
  /**
   * Version of .NET SDK to install
   */
  dotnetVersion: string;

  /**
   * Version of ILSpy to install
   */
  ilspyVersion: string;

  /**
   * Custom installation path (optional)
   */
  installPath?: string;
}

/**
 * Result of comparing two decompiled assemblies
 */
export interface DiffResult {
  /**
   * Decompiled source code of the first assembly
   */
  firstSource: string;

  /**
   * Decompiled source code of the second assembly
   */
  secondSource: string;

  /**
   * Unified diff between the two sources
   */
  diff: string;
}

export interface AssemblyInfo {
  /**
   * Path to the assembly file
   */
  assemblyPath: string;

  /**
   * Path to the directory containing dependency DLLs
   */
  dependenciesPath?: string;
}

export interface DiffOptions {
  /**
   * Output path for the diff file
   */
  outputPath?: string;
}