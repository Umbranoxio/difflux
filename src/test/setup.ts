import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { getPaths } from '../utils';

const PROJECT1 = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
  </ItemGroup>
</Project>
`;

const PROJECT1_CS = `
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace TestProject;

public class DataService
{
    private readonly JsonSerializerSettings _settings;

    public DataService()
    {
        _settings = new JsonSerializerSettings 
        { 
            TypeNameHandling = TypeNameHandling.All,
            ContractResolver = new Newtonsoft.Json.Serialization.DefaultContractResolver()
        };
    }

    public string SerializeData<T>(T data) where T : JContainer
    {
        return JsonConvert.SerializeObject(data, _settings);
    }

    public JObject DeserializeData(string json)
    {
        return (JObject)JsonConvert.DeserializeObject(json, _settings);
    }
}
`;

const PROJECT2 = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
  </ItemGroup>
</Project>
`;

const PROJECT2_CS = `
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace TestProject;

public class DataService
{
    private readonly JsonSerializerSettings _settings;
    private readonly IContractResolver _resolver;

    public DataService()
    {
        _resolver = new CamelCasePropertyNamesContractResolver();
        _settings = new JsonSerializerSettings 
        { 
            TypeNameHandling = TypeNameHandling.All,
            ContractResolver = _resolver,
            Formatting = Formatting.Indented
        };
    }

    public string SerializeData<T>(T data) where T : JContainer
    {
        return JsonConvert.SerializeObject(data, _settings);
    }

    public JObject DeserializeData(string json)
    {
        return (JObject)JsonConvert.DeserializeObject(json, _settings);
    }

    public bool ValidateJson(string jsonString)
    {
        try
        {
            JToken.Parse(jsonString);
            return true;
        }
        catch (JsonReaderException)
        {
            return false;
        }
    }
}
`;

/**
 * Creates test .NET projects with Newtonsoft.Json dependency and returns their paths
 * @returns Promise containing paths to the built assemblies and dependencies
 */
export async function createTestProjects(): Promise<{
  project1Path: string;
  project2Path: string;
  nugetPackagesPath: string;
}> {
  const { dotnetBin } = getPaths();
  const testDir = path.join(process.cwd(), 'test-output/projects');
  const nugetPackagesPath = path.join(testDir, 'packages');
  const buildOutputDir = path.join(process.cwd(), 'test-output/assemblies');
  const depsDir = path.join(process.cwd(), 'test-output/dependencies');
  
  // Create directories
  await fs.ensureDir(testDir);
  await fs.ensureDir(nugetPackagesPath);
  await fs.ensureDir(buildOutputDir);
  await fs.ensureDir(depsDir);
  
  // Create Project1
  const project1Dir = path.join(testDir, 'TestProject1');
  await fs.ensureDir(project1Dir);
  await fs.writeFile(path.join(project1Dir, 'TestProject1.csproj'), PROJECT1);
  await fs.writeFile(path.join(project1Dir, 'DataService.cs'), PROJECT1_CS);
  
  // Create nuget.config to specify custom packages directory
  const nugetConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <config>
    <add key="globalPackagesFolder" value="${nugetPackagesPath}" />
  </config>
</configuration>`;
  await fs.writeFile(path.join(testDir, 'nuget.config'), nugetConfig);
  
  // Create Project2
  const project2Dir = path.join(testDir, 'TestProject2');
  await fs.ensureDir(project2Dir);
  await fs.writeFile(path.join(project2Dir, 'TestProject2.csproj'), PROJECT2);
  await fs.writeFile(path.join(project2Dir, 'DataService.cs'), PROJECT2_CS);
  
  // Build projects
  const buildProject = async (projectDir: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const proc = spawn(dotnetBin, ['build'], {
        cwd: projectDir,
        env: {
          ...process.env,
          DOTNET_ROOT: path.dirname(dotnetBin)
        }
      });
      
    //   proc.stdout.on('data', (data) => console.log(data.toString()));
      proc.stderr.on('data', (data) => console.error(data.toString()));
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  };
  
  await buildProject(project1Dir);
  await buildProject(project2Dir);
  
  // Copy Newtonsoft.Json.dll to dependencies directory
  const newtonsoftPath = path.join(project1Dir, 'bin/Debug/net6.0/Newtonsoft.Json.dll');
  await fs.copy(newtonsoftPath, path.join(depsDir, 'Newtonsoft.Json.dll'));
  
  // Move DLLs and cleanup
  const project1Dll = path.join(project1Dir, 'bin/Debug/net6.0/TestProject1.dll');
  const project2Dll = path.join(project2Dir, 'bin/Debug/net6.0/TestProject2.dll');
  
  const project1OutputPath = path.join(buildOutputDir, 'TestProject1.dll');
  const project2OutputPath = path.join(buildOutputDir, 'TestProject2.dll');
  
  await fs.copy(project1Dll, project1OutputPath);
  await fs.copy(project2Dll, project2OutputPath);
  
  // Clean up build directories
  await fs.remove(project1Dir);
  await fs.remove(project2Dir);

  return {
    project1Path: project1OutputPath,
    project2Path: project2OutputPath,
    nugetPackagesPath: depsDir
  };
} 

/**
 * Cleans up test project files and directories
 */
export async function cleanupTestProjects(): Promise<void> {
    const testDir = path.join(process.cwd(), 'test-output/projects');
    await fs.remove(testDir);
} 