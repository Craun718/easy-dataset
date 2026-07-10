/**
 * 将 .prisma 目录从 pnpm 虚拟存储复制到 node_modules/.prisma
 * 这确保 electron-builder 的 extraResources 能正确打包 Prisma 引擎文件
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const dotPrismaDst = path.join(projectRoot, 'node_modules', '.prisma');

// 查找 @prisma/client 的实际安装位置（跟随可能的符号链接）
let prismaClientDir;
try {
  prismaClientDir = path.dirname(require.resolve('@prisma/client/package.json'));
} catch (e) {
  console.log('[copy-prisma] @prisma/client not found, skipping...');
  process.exit(0);
}

// .prisma 位于 @prisma/client 的父级 node_modules 中（pnpm 虚拟存储）
const dotPrismaSrc = path.join(prismaClientDir, '..', '..', '.prisma');

console.log('[copy-prisma] Source:', dotPrismaSrc);
console.log('[copy-prisma] Dest:', dotPrismaDst);

if (!fs.existsSync(dotPrismaSrc)) {
  console.log('[copy-prisma] Source .prisma not found, skipping...');
  process.exit(0);
}

// 如果目标已存在且是最新的，跳过
if (fs.existsSync(dotPrismaDst)) {
  console.log('[copy-prisma] Destination already exists, removing old...');
  fs.rmSync(dotPrismaDst, { recursive: true, force: true });
}

// 复制 .prisma 目录
fs.cpSync(dotPrismaSrc, dotPrismaDst, { recursive: true });
console.log('[copy-prisma] Successfully copied .prisma to node_modules/.prisma');
