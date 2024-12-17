import { decompile, diffDecompiledAssemblies } from './index';
import * as path from 'path';
import * as fs from 'fs-extra';
import { createTestProjects, cleanupTestProjects } from './test/setup';

describe('decompile function', () => {
  let testProject1Path: string;
  let testProject2Path: string;
  let dependenciesPath: string;
  const testOutputPath = path.join(process.cwd(), 'test-output/output');

  beforeAll(async () => {
    const { project1Path, project2Path, nugetPackagesPath } = await createTestProjects();
    testProject1Path = project1Path;
    testProject2Path = project2Path;
    dependenciesPath = nugetPackagesPath;
    await fs.ensureDir(testOutputPath);
  });

  afterAll(async () => {
    await fs.remove(testOutputPath);
    await cleanupTestProjects();
  });

  it('should successfully decompile a test project', async () => {
    await expect(decompile(
      { assemblyPath: testProject1Path },
      testOutputPath
    )).resolves.not.toThrow();

    const outputExists = await fs.pathExists(testOutputPath);
    expect(outputExists).toBe(true);
  });

  it('should successfully diff two assemblies with output path', async () => {
    const result = await diffDecompiledAssemblies(
      { assemblyPath: testProject1Path },
      { assemblyPath: testProject2Path },
      {
        outputPath: testOutputPath
      }
    );

    expect(result.firstSource).toBeTruthy();
    expect(result.secondSource).toBeTruthy();
    expect(result.diff).toBeTruthy();
    
    // Verify diff file was created
    const diffExists = await fs.pathExists(path.join(testOutputPath, 'assembly.diff'));
    expect(diffExists).toBe(true);
  });
  it('should successfully diff two assemblies without output path', async () => {
    const result = await diffDecompiledAssemblies(
      { assemblyPath: testProject1Path },
      { assemblyPath: testProject2Path }
    );

    expect(result.firstSource).toBeTruthy();
    expect(result.secondSource).toBeTruthy();
    expect(result.diff).toBeTruthy();
    expect(result.firstSource).toContain('Unknown result type'); // Expect decompiled source to be incomplete because we didn't include dependencies
    expect(result.secondSource).toContain('Unknown result type'); 
  });

  it('should successfully decompile with dependencies', async () => {
    const result = await diffDecompiledAssemblies(
      { 
        assemblyPath: testProject1Path,
        dependenciesPath: dependenciesPath
      },
      { 
        assemblyPath: testProject2Path,
        dependenciesPath: dependenciesPath
      },
      {
        outputPath: testOutputPath
      }
    );
    expect(result.firstSource).not.toContain('Unknown result type');
    expect(result.secondSource).not.toContain('Unknown result type');
  });
});