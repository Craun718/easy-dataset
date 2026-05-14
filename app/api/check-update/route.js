import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Get current version
function getCurrentVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read version from package.json:', String(error));
    return '1.0.0';
  }
}

// Get latest version from GitHub
async function getLatestVersion() {
  try {
    const owner = 'ConardLi';
    const repo = 'easy-dataset';
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.tag_name.replace('v', '');
  } catch (error) {
    console.error('Failed to fetch latest version:', String(error));
    return null;
  }
}

// Check for updates
export async function GET() {
  // 更新检测已被禁用
  return NextResponse.json({
    hasUpdate: false,
    currentVersion: getCurrentVersion(),
    latestVersion: null,
    disabled: true
  });
}

// Simple version comparison
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = i < partsA.length ? partsA[i] : 0;
    const numB = i < partsB.length ? partsB[i] : 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}
