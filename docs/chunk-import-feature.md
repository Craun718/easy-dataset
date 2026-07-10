# 文本块导入功能

> 版本：v1.7.3-ntk-v5 | 分支：`feat/import`

## 概述

新增**文本块导入**功能，允许直接将导出的文本块 JSON / JSONL 文件重新导入到项目中，实现跨项目、跨设备的数据迁移与复用。

## 核心流程

```
导出（其他项目/设备）          →          导入（目标项目）
──────────────────────                   ──────────────────
JSON / JSONL 文件                       拖拽或选择文件
    ↓                                       ↓
包含 name, fileName,                    自动解析 & 验证
content, summary 字段                       ↓
                                        按 fileName 关联 UploadFile
                                            ↓
                                        分批写入 Chunks 表
                                            ↓
                                        目标项目即可使用
```

## 数据格式

与导出格式完全一致，支持两种文件格式：

### JSON 格式

```json
[
  {
    "name": "文档标题-part-1",
    "fileName": "文档标题.md",
    "content": "这是第一段文本内容...",
    "summary": "可选摘要"
  },
  {
    "name": "文档标题-part-2",
    "fileName": "文档标题.md",
    "content": "这是第二段文本内容...",
    "summary": ""
  }
]
```

### JSONL 格式

```jsonl
{"name":"文档标题-part-1","fileName":"文档标题.md","content":"第一段文本...","summary":"摘要"}
{"name":"文档标题-part-2","fileName":"文档标题.md","content":"第二段文本...","summary":""}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 文本块名称 |
| `fileName` | string | ✅ | 所属源文件名，用于关联 UploadFile |
| `content` | string | ✅ | 文本块完整内容 |
| `summary` | string | ❌ | 可选摘要，不提供时为空字符串 |

## 使用方式

### 步骤 1：打开导入对话框

在项目文本分割页面，点击 **Import Chunks** 按钮。

### 步骤 2：上传文件

- **拖拽**：将 JSON / JSONL 文件拖入虚线区域
- **点击**：点击虚线区域选择文件

支持格式：`.json`、`.jsonl`，建议单文件不超过 50MB。

### 步骤 3：预览确认

系统会展示：

- 总记录数
- 无效记录数（缺少必填字段的条目）及警告
- 前 5 条数据预览表格（名称、文件名、内容摘要、summary）

### 步骤 4：执行导入

点击 **Start Import**，系统分批次写入数据库，进度条实时显示。

### 步骤 5：完成

导入完成后显示统计：总条数、成功数、失败数及错误详情。

## 技术实现

### 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/projects/[projectId]/chunks/import` | POST | 接收 multipart/form-data，处理导入 |
| `/api/projects/[projectId]/chunks/export` | POST | 导出 chunks，支持 JSON/JSONL，>1000 条流式输出 |

**导入流程：**

1. 接收文件 → 校验扩展名（`.json` / `.jsonl`）
2. 解析内容 → 验证每条数据的必填字段
3. 按 `fileName` 缓存 `UploadFile` 记录（自动创建不存在的）
4. 每 100 条一批写入数据库（`db.chunks.createMany`）

**导出流程：**

1. 接收筛选条件（`fileIds`、`keyword`、`format`）
2. ≤1000 条直接返回完整 JSON/JSONL 文件
3. \>1000 条使用 `ReadableStream` 流式输出

### 前端组件

| 组件 | 说明 |
|------|------|
| `ChunkImportDialog.js` | 三步向导对话框（上传 → 预览 → 导入） |
| `ChunkExportDialog.js` | 导出设置对话框（格式选择、筛选条件） |

### 数据库操作

```js
// lib/db/chunks.js

// 获取或创建 UploadFile（导入时自动关联）
getOrCreateUploadFile(projectId, fileName)

// 获取导出数据（支持筛选）
getChunksForExport(projectId, { fileIds, keyword })
```

## API 响应格式

### 导入成功

```json
{
  "code": 0,
  "data": { "total": 150 },
  "message": "Successfully imported 150 chunks"
}
```

### 验证失败

```json
{
  "code": 400,
  "error": "Data validation failed",
  "details": ["Item 3: missing or invalid \"name\""],
  "totalErrors": 5
}
```

## 适用场景

| 场景 | 操作 |
|------|------|
| 项目间迁移 | 从项目 A 导出 JSON → 导入项目 B |
| 设备间迁移 | 导出文件 → 传输到另一台电脑 → 导入 |
| 备份恢复 | 定期导出 JSON 备份 → 需要时导入复原 |
| 数据复用 | 提取优质 chunks 分享给团队成员导入 |
