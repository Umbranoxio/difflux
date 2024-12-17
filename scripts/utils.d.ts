export const IS_WINDOWS: boolean;
export const PLATFORM: string;
export const ARCH: string;
export const DOTNET_EXECUTABLE: string;
export const ILSPY_EXECUTABLE: string;

export function getPackageRoot(): string;
export function getPaths(): {
    dotnetPath: string;
    toolsPath: string;
    dotnetBin: string;
    ilspyBin: string;
}; 