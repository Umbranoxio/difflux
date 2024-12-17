/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const { IS_WINDOWS, PLATFORM, ARCH, getPaths } = require('./utils');

const DOTNET_VERSION = '6.0';
const ILSPY_VERSION = '8.2.0.7535';
const ARCHIVE_EXT = IS_WINDOWS ? 'zip' : 'tar.gz';

/** @returns {string} */
function getDotnetDownloadUrl() {
    const platformMap = {
        win32: 'win',
        darwin: 'osx',
        linux: 'linux'
    };
    const platformStr = platformMap[PLATFORM] || 'linux';
    return `https://aka.ms/dotnet/${DOTNET_VERSION}/dotnet-sdk-${platformStr}-${ARCH}.${ARCHIVE_EXT}`;
}

/** @returns {Promise<void>} */
async function downloadFile(url, outputPath) {
    console.log(`Downloading from ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
    }

    const fileStream = fs.createWriteStream(outputPath);
    await new Promise((resolve, reject) => {
        if (!response.body) {
            reject(new Error('No response body'));
            return;
        }
        response.body.pipe(fileStream);
        response.body.on('error', reject);
        fileStream.on('finish', resolve);
    });
}

/** @returns {Promise<void>} */
async function extractArchive(archivePath, extractPath) {
    if (IS_WINDOWS) {
        const extract = require('extract-zip');
        await extract(archivePath, { dir: extractPath });
    } else {
        const tar = require('tar');
        await tar.x({
            file: archivePath,
            cwd: extractPath,
            strip: 1
        });
    }
}

/** @returns {Promise<void>} */
async function runDotnetCommand(args) {
    const { dotnetPath, dotnetBin } = getPaths();

    return new Promise((resolve, reject) => {
        const proc = spawn(dotnetBin, args, {
            env: {
                ...process.env,
                DOTNET_ROOT: dotnetPath,
                PATH: `${dotnetPath}${path.delimiter}${process.env.PATH}`
            }
        });

        proc.stdout.on('data', (data) => console.log(data.toString()));
        proc.stderr.on('data', (data) => console.error(data.toString()));

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

/** @returns {Promise<void>} */
async function installDotnet() {
    const { dotnetPath, dotnetBin } = getPaths();
    await fs.ensureDir(dotnetPath);

    if (await fs.pathExists(dotnetBin)) {
        console.log('Found existing .NET SDK installation');
        return;
    }

    console.log('Installing .NET SDK...');
    const sdkUrl = getDotnetDownloadUrl();
    const sdkArchivePath = path.join(dotnetPath, `dotnet-sdk.${ARCHIVE_EXT}`);
    
    try {
        await downloadFile(sdkUrl, sdkArchivePath);
        await extractArchive(sdkArchivePath, dotnetPath);
        
        // Make dotnet executable on Unix systems
        if (!IS_WINDOWS) {
            await fs.chmod(dotnetBin, '755');
        }
    } finally {
        await fs.remove(sdkArchivePath).catch(() => {});
    }
}

/** @returns {Promise<void>} */
async function installILSpy() {
    const { toolsPath } = getPaths();

    if (await fs.pathExists(toolsPath)) {
        console.log('Found existing ILSpy installation');
        return;
    }

    console.log('Installing ILSpy...');
    await fs.ensureDir(toolsPath);

    await runDotnetCommand([
        'new', 'tool-manifest', '--output', toolsPath
    ]);

    await runDotnetCommand([
        'tool', 'install',
        '--tool-path', toolsPath,
        'ilspycmd',
        '--version', ILSPY_VERSION
    ]);
}

/** @returns {Promise<void>} */
async function install() {
    try {
        await installDotnet();
        await installILSpy();
        console.log('Installation completed successfully!');
    } catch (error) {
        console.error('Installation failed:', error);
        process.exit(1);
    }
}

// Run the installer
install(); 