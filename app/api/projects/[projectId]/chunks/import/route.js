import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/index';
import { getOrCreateUploadFile } from '@/lib/db/chunks';

/**
 * 验证单条 chunk 数据
 * @returns {{ message: string, stack?: string }[]}
 */
function validateChunk(item, index) {
  const errors = [];
  if (!item.name || typeof item.name !== 'string') {
    errors.push({ message: `Item ${index + 1}: missing or invalid "name"` });
  }
  if (!item.fileName || typeof item.fileName !== 'string') {
    errors.push({ message: `Item ${index + 1}: missing or invalid "fileName"` });
  }
  if (!item.content || typeof item.content !== 'string') {
    errors.push({ message: `Item ${index + 1}: missing or invalid "content"` });
  }
  return errors;
}

/**
 * 导入文本块
 * POST /api/projects/[projectId]/chunks/import
 *
 * 请求：multipart/form-data，file 字段为 JSON 或 JSONL 文件
 * 文件内容格式与导出格式一致：
 *   [{ name, fileName, content, summary? }]
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const formData = await request.formData();

    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ code: 400, error: 'Please upload a file' }, { status: 400 });
    }

    // 校验文件类型
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    if (!['json', 'jsonl'].includes(fileExt)) {
      return NextResponse.json(
        { code: 400, error: 'Unsupported file format. Please upload a JSON or JSONL file' },
        { status: 400 }
      );
    }

    // 读取并解析文件
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);
    let data = [];

    try {
      if (fileExt === 'json') {
        data = JSON.parse(content);
      } else if (fileExt === 'jsonl') {
        data = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => JSON.parse(line));
      }
    } catch (parseError) {
      return NextResponse.json(
        {
          code: 400,
          error: `Failed to parse file: ${parseError.message}`,
          stack: parseError.stack
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ code: 400, error: 'File is empty or has an invalid format' }, { status: 400 });
    }

    // 验证数据
    const allErrors = [];
    for (let i = 0; i < data.length; i++) {
      const errors = validateChunk(data[i], i);
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      return NextResponse.json(
        {
          code: 400,
          error: 'Data validation failed',
          details: allErrors.slice(0, 10),
          totalErrors: allErrors.length
        },
        { status: 400 }
      );
    }

    // 准备导入数据（分组按 fileName 缓存 UploadFile）
    const fileCache = new Map();
    const now = new Date();
    const chunks = [];

    for (const item of data) {
      let uploadFile = fileCache.get(item.fileName);
      if (!uploadFile) {
        uploadFile = await getOrCreateUploadFile(projectId, item.fileName);
        fileCache.set(item.fileName, uploadFile);
      }

      const summary = typeof item.summary === 'string' ? item.summary : '';

      chunks.push({
        id: nanoid(),
        projectId,
        fileId: uploadFile.id,
        name: item.name,
        fileName: item.fileName,
        content: item.content,
        summary,
        size: item.content.length,
        createAt: now,
        updateAt: now
      });
    }

    // 分批插入
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await db.chunks.createMany({ data: batch });
      insertedCount += batch.length;
    }

    return NextResponse.json({
      code: 0,
      data: {
        total: insertedCount
      },
      message: `Successfully imported ${insertedCount} chunks`
    });
  } catch (error) {
    console.error('[Import] Chunk import failed:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'Import failed',
        message: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
