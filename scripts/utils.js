/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const path = require('path');
const fs = require('fs-extra');

// Platform-specific constants
const IS_WINDOWS = process.platform === 'win32';
const PLATFORM = process.platform;
const ARCH = process.arch;
const DOTNET_EXECUTABLE = IS_WINDOWS ? 'dotnet.exe' : 'dotnet';
const ILSPY_EXECUTABLE = IS_WINDOWS ? 'ilspycmd.exe' : 'ilspycmd';

let cachedPackageRoot;

/** @returns {string} */
function getPackageRoot() {
    if (cachedPackageRoot) {
        return cachedPackageRoot;
    }

    // Start from the current working directory
    const currentDir = process.cwd();
    const packagePath = path.join('node_modules', '@umbranoxio', 'difflux');
    
    // Check if we're in development or production
    if (fs.existsSync(path.join(currentDir, packagePath))) {
        cachedPackageRoot = path.join(currentDir, packagePath);
        return cachedPackageRoot;
    }
    
    // Fallback to development path
    cachedPackageRoot = path.resolve(__dirname, '..');
    return cachedPackageRoot;
}

/** @returns {{ dotnetPath: string, toolsPath: string, dotnetBin: string, ilspyBin: string }} */
function getPaths() {
    const packageRoot = getPackageRoot();
    return {
        dotnetPath: path.join(packageRoot, '.dotnet'),
        toolsPath: path.join(packageRoot, '.dotnet', 'tools'),
        dotnetBin: path.join(packageRoot, '.dotnet', DOTNET_EXECUTABLE),
        ilspyBin: path.join(packageRoot, '.dotnet', 'tools', ILSPY_EXECUTABLE)
    };
}

module.exports = {
    IS_WINDOWS,
    PLATFORM,
    ARCH,
    DOTNET_EXECUTABLE,
    ILSPY_EXECUTABLE,
    getPackageRoot,
    getPaths
}; 