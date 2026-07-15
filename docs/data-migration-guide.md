# Easy Dataset 数据迁移指南

本文档介绍如何将 Easy Dataset 中的项目数据（包括 chunks、问题、数据集等）从一台电脑迁移到另一台电脑。

---

## 目录

1. [前置知识：数据存储架构](#前置知识数据存储架构)
2. [方案一：整体搬迁（推荐）](#方案一整体搬迁推荐)
3. [方案二：内置迁移工具](#方案二内置迁移工具)
4. [常见问题](#常见问题)

---

## 前置知识：数据存储架构

Easy Dataset 的数据存储在**两个位置**：

### SQLite 数据库

| 项目     | 说明                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- |
| 路径     | `<项目根目录>/prisma/db.sqlite`                                                                     |
| 配置来源 | `.env` 中的 `DATABASE_URL="file:./db.sqlite"`                                                       |
| 包含内容 | 所有项目的元数据和内容：Projects、Chunks、Questions、Datasets、ImageDatasets、EvalDatasets 等全部表 |

### 文件系统（项目文件目录）

| 项目     | 说明                                     |
| -------- | ---------------------------------------- |
| 路径     | `<项目根目录>/local-db/<projectId>/`     |
| 配置来源 | `lib/db/base.js` 中的 `getDbDirectory()` |
| 目录结构 | 见下表                                   |

```
local-db/
└── <projectId>/                  # 每个项目一个子目录（目录名 = 项目ID）
    ├── files/                    # 上传的源文件
    │   ├── document.pdf          #   原始 PDF
    │   └── document.md           #   MinerU 提取 / 上传的 Markdown
    ├── toc/                      # 目录结构文件
    │   └── document-toc.json     #   从 Markdown 标题提取的层级目录
    ├── task-config.json          # 任务配置（分割参数、MinerU Token 等）
    ├── config.json               # 项目配置（旧版迁移用）
    ├── tags.json                 # 标签数据（旧版迁移用）
    ├── model-config.json         # 模型配置（旧版迁移用）
    ├── chunks/                   # 文本块文件（仅旧版，新版存 DB）
    ├── questions.json            # 问题数据（旧版迁移用）
    └── datasets.json             # 数据集（旧版迁移用）
```

> **注意**：`local-db` 目录在不同环境下的位置有所不同：
>
> | 环境                     | 路径                                                                                       |
> | ------------------------ | ------------------------------------------------------------------------------------------ |
> | 开发模式 (`npm run dev`) | `<项目根目录>/local-db/`                                                                   |
> | Electron 打包后          | `<用户数据目录>/local-db/` (如 `C:\Users\<用户名>\AppData\Roaming\Easy Dataset\local-db\`) |
> | 自定义                   | 可通过 `.env` 中 `LOCAL_DB_PATH` 指定                                                      |

### Chunks 的双重存储

| 存储位置                | 内容                                       | 说明                                           |
| ----------------------- | ------------------------------------------ | ---------------------------------------------- |
| `Chunks` 表 (SQLite)    | 元数据 + **完整文本内容** (`content` 字段) | **权威数据源**，运行时读取 chunks 内容从这里取 |
| `files/*.md` (文件系统) | 切分前的完整 Markdown 源文件               | 可在新项目重新上传以重建 chunks                |

---

## 方案一：整体搬迁（推荐）

> **适用场景**：目标电脑为空白环境，或你不介意覆盖目标电脑上的已有数据。
> **优势**：100% 完整，一步到位，无需额外操作。

### 操作步骤

#### 步骤 1：在源电脑定位数据文件

进入 Easy Dataset 项目根目录，确认以下两个路径存在：

```bash
# 在 Easy Dataset 项目根目录下执行
ls prisma/db.sqlite           # SQLite 数据库
ls local-db/                  # 项目文件目录
```

如果不是开发模式，而是 Electron 打包版本，`local-db` 通常在用户数据目录下：

- **Windows**: `%APPDATA%/Easy Dataset/local-db/`
- **macOS**: `~/Library/Application Support/Easy Dataset/local-db/`
- **Linux**: `~/.config/Easy Dataset/local-db/`

#### 步骤 2：关闭 Easy Dataset

在源电脑和目标电脑上**完全关闭** Easy Dataset 应用，确保 SQLite 数据库没有被占用。

#### 步骤 3：复制文件

将以下内容复制到目标电脑：

```
源电脑                                    目标电脑
─────────────────────────────────        ─────────────────────────────────
prisma/db.sqlite               ──→       <目标项目根目录>/prisma/db.sqlite
local-db/                      ──→       <目标项目根目录>/local-db/
```

如果你使用 U 盘或网络传输，可以打包：

```bash
# 在源电脑执行
# 打包整个数据目录
tar -czf easy-dataset-backup.tar.gz prisma/db.sqlite local-db/

# 或使用 PowerShell (Windows)
# Compress-Archive -Path prisma/db.sqlite, local-db\ -DestinationPath easy-dataset-backup.zip
```

#### 步骤 4：在目标电脑放置文件

将文件放到目标电脑的 Easy Dataset 项目根目录下。如果目标电脑是 **Electron 打包版**，`db.sqlite` 放在应用安装目录，`local-db` 放在用户数据目录。

#### 步骤 5：启动验证

启动目标电脑上的 Easy Dataset，检查：

- [ ] 项目列表是否显示所有项目
- [ ] 进入项目，chunks 列表是否正常
- [ ] 查看 chunk 内容是否完整
- [ ] 文件列表是否显示源文件

### 注意事项

- ⚠️ **覆盖风险**：如果目标电脑已有数据，此操作会**完全覆盖**。如有需要，请先备份目标电脑的原有数据
- ⚠️ **路径兼容**：跨操作系统（如 Windows ↔ macOS）迁移时，`local-db` 中的文件路径使用的是项目相对路径，不影响兼容性
- ⚠️ **SQLite 版本**：确保源和目标使用相同版本的 Easy Dataset，避免数据库 schema 不兼容

---

## 方案二：内置迁移工具

> **适用场景**：你拥有旧版项目数据（`local-db/<projectId>/` 下包含 `chunks/`、`config.json` 等 JSON 文件），只想迁移特定项目而非整个数据库。
> **限制**：仅适用于**旧版存储格式**（chunks 以独立文件形式存在于 `chunks/` 目录）。新版 chunks 直接存 DB，此工具无法单独迁移。

### 工具原理

`POST /api/projects/migrate` 是一个异步任务接口，它会：

1. 扫描 `local-db/` 下所有子目录
2. 对每个**在 DB 中不存在的项目**，读取其文件系统中的 JSON 数据
3. 按顺序写入 SQLite 数据库：

```
config.json     →  Projects 表
chunks/*.txt    →  Chunks 表         ← chunks 内容从这里来
tags.json       →  Tags 表
model-config.json → ModelConfig 表
questions.json  →  Questions 表
datasets.json   →  Datasets 表
最后              → UPDATE Questions SET answered = 1
```

### 前置检查

在源电脑上确认项目目录包含以下文件：

```bash
# 检查项目目录结构
ls local-db/<projectId>/
# 必须存在：
#   config.json          # 项目配置
#   chunks/              # 文本块目录（含 -part-1, -part-2 ... 文件）
# 可选存在：
#   questions.json       # 问题数据
#   datasets.json        # 数据集
#   tags.json            # 标签
#   model-config.json    # 模型配置
#   files/               # 源文件（会被自动复制）
```

### 操作步骤

#### 步骤 1：复制项目目录

从源电脑只复制目标项目的目录：

```bash
# 源电脑：复制单个项目目录
# 例如项目ID为 "abc123def456"
cp -r local-db/abc123def456 /tmp/abc123def456
```

将 `/tmp/abc123def456` 传输到目标电脑的 `local-db/` 目录下：

```bash
# 目标电脑：放置项目目录
cp -r /path/to/abc123def456 <easy-dataset根目录>/local-db/
```

#### 步骤 2：发起迁移任务

确保目标电脑上 Easy Dataset 正在运行（`npm run dev` 或 Electron 应用已启动），然后调用迁移 API：

```bash
# 发起迁移
curl -X POST http://localhost:3000/api/projects/migrate
```

返回示例：

```json
{
  "success": true,
  "taskId": "1719000000000"
}
```

#### 步骤 3：监控进度

使用返回的 `taskId` 查询迁移进度：

```bash
curl "http://localhost:3000/api/projects/migrate?taskId=1719000000000"
```

返回示例：

```json
{
  "success": true,
  "task": {
    "status": "running",
    "progress": 42,
    "total": 5,
    "completed": 2,
    "error": null,
    "startTime": 1719000000000
  }
}
```

状态说明：

| status      | 说明                                     |
| ----------- | ---------------------------------------- |
| `running`   | 迁移进行中                               |
| `completed` | 迁移完成，`completed` 为成功迁移的项目数 |
| `failed`    | 迁移失败，查看 `error` 字段获取错误信息  |

#### 步骤 4：验证结果

迁移完成后，在 Easy Dataset 界面中检查：

- [ ] 项目是否出现在项目列表中
- [ ] chunks 内容是否完整
- [ ] 问题和数据集是否正确关联
- [ ] 标签树是否恢复

### 错误处理

```bash
# 如果迁移失败，检查错误信息
curl "http://localhost:3000/api/projects/migrate?taskId=xxx"

# 返回示例（失败时）：
# {
#   "success": true,
#   "task": {
#     "status": "failed",
#     "error": "具体错误信息...",
#     ...
#   }
# }
```

常见失败原因：

| 错误                 | 可能原因                     | 解决方法                                                 |
| -------------------- | ---------------------------- | -------------------------------------------------------- |
| `config.json` 不存在 | 项目目录不完整               | 检查 `local-db/<projectId>/config.json` 是否存在         |
| Chunk 写入失败       | `chunks/` 目录为空或格式不对 | 确认 chunk 文件名格式为 `<baseName>-part-N`              |
| Question 关联失败    | chunk name 不匹配            | 确保 `questions.json` 中的 `chunkId` 与 chunk 文件名一致 |

---

## 常见问题

### Q: 目标电脑已有项目，如何只迁移一个项目？

使用方案一但只复制 SQLite 中对应的行，操作较复杂。推荐的做法是：

1. 从源电脑拷贝 `local-db/<projectId>/files/*.md`
2. 在目标电脑新建项目
3. 重新上传 `.md` 文件，系统会自动重新分割生成 chunks
4. 如果有 QA 数据集，使用数据集导出/导入功能单独迁移

### Q: 开发版和 Electron 版的数据库可以互迁吗？

可以。两个版本的 SQLite schema 相同，文件路径使用相对路径，互迁兼容。

### Q: 迁移后 chunks 内容乱码怎么办？

确保文件传输过程中没有改变编码。SQLite 数据库文件是二进制格式，请使用二进制模式传输（不要用文本模式 FTP）。`.md` 文件统一使用 UTF-8 编码。

### Q: 迁移工具任务状态丢失了怎么办？

迁移任务状态仅存在内存中（`migrationTasks` Map），应用重启后即丢失。如果任务中断，重新发起迁移即可——已迁移的项目会被跳过（检测到 DB 中存在则不再重复创建）。
