import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { getChunksForExport } from '@/lib/db/chunks';

const BATCH_SIZE = 500;

/**
 * 格式化导出数据
 */
function formatExportItem(item) {
  return {
    name: item.name,
    fileName: item.fileName,
    content: item.content,
    summary: item.summary || ''
  };
}

/**
 * 导出文本块（支持 JSON / JSONL）
 * 超过 1000 条时使用流式输出
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const { format = 'json', fileIds = [], keyword = '', offset, limit } = body;

    if (!['json', 'jsonl'].includes(format)) {
      return NextResponse.json({ code: 400, error: 'Unsupported export format' }, { status: 400 });
    }

    // 构建查询条件
    const filters = {};
    if (fileIds.length > 0) filters.fileIds = fileIds;
    if (keyword) filters.keyword = keyword;

    // 获取总数
    const allItems = await getChunksForExport(projectId, filters);
    const total = allItems.length;

    if (total === 0) {
      return NextResponse.json({ code: 400, error: 'No chunks match the criteria' }, { status: 400 });
    }

    // 分页模式：前端按 offset/limit 分批拉取时，仅返回对应批次，避免重复
    if (offset != null || limit != null) {
      const batchItems = await getChunksForExport(projectId, { ...filters, offset, limit });
      const formattedBatch = batchItems.map(formatExportItem);
      return NextResponse.json(formattedBatch);
    }

    // 小数量的直接返回
    if (total <= 1000) {
      const formattedItems = allItems.map(formatExportItem);

      if (format === 'json') {
        return new Response(JSON.stringify(formattedItems, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="chunks-${Date.now()}.json"`
          }
        });
      }

      if (format === 'jsonl') {
        const jsonlContent = formattedItems.map(item => JSON.stringify(item)).join('\n');
        return new Response(jsonlContent, {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Content-Disposition': `attachment; filename="chunks-${Date.now()}.jsonl"`
          }
        });
      }
    }

    // 大数据量流式输出
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        if (format === 'json') {
          controller.enqueue(encoder.encode('[\n'));
        }

        let isFirst = true;
        const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);

        for (let batch = 0; batch < totalBatches; batch++) {
          const batchItems = allItems.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);

          for (const item of batchItems) {
            const formattedItem = formatExportItem(item);

            if (format === 'json') {
              const prefix = isFirst ? '' : ',\n';
              controller.enqueue(encoder.encode(prefix + JSON.stringify(formattedItem)));
              isFirst = false;
            } else if (format === 'jsonl') {
              controller.enqueue(encoder.encode(JSON.stringify(formattedItem) + '\n'));
            }
          }
        }

        if (format === 'json') {
          controller.enqueue(encoder.encode('\n]'));
        }

        controller.close();
      }
    });

    const extensions = { json: 'json', jsonl: 'jsonl' };
    const contentTypes = { json: 'application/json', jsonl: 'application/x-ndjson' };

    return new Response(stream, {
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="chunks-${Date.now()}.${extensions[format]}"`,
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error) {
    console.error('Failed to export chunks:', error);
    return NextResponse.json({ code: 500, error: error.message || 'Export failed' }, { status: 500 });
  }
}

/**
 * 获取导出预览（计数）
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const fileIds = searchParams.getAll('fileIds');
    const keyword = searchParams.get('keyword') || '';

    const filters = {};
    if (fileIds.length > 0) filters.fileIds = fileIds;
    if (keyword) filters.keyword = keyword;

    const items = await getChunksForExport(projectId, filters);
    const total = items.length;

    return NextResponse.json({
      code: 0,
      data: {
        total,
        isLargeDataset: total > 1000
      }
    });
  } catch (error) {
    console.error('Failed to get export preview:', error);
    return NextResponse.json({ code: 500, error: error.message || 'Failed to get export preview' }, { status: 500 });
  }
}
