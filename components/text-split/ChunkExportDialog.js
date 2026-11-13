'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  CircularProgress,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { sortByName } from '@/lib/util/natural-sort';

/**
 * 文本块导出对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Function} props.onClose - 关闭回调
 * @param {string} props.projectId - 项目ID
 * @param {Array} props.chunks - 要导出的文本块（用于小数量直接导出）
 * @param {number} props.totalCount - 文本块总数（用于大数量服务端导出）
 */
export default function ChunkExportDialog({ open, onClose, projectId, chunks = [], totalCount = 0 }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState('json');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const needServerExport = chunks.length > 500 || totalCount > 500;

  const handleFormatChange = event => {
    setFormat(event.target.value);
  };

  const handleExport = async () => {
    setError('');
    setExporting(true);
    setProgress(0);

    try {
      if (!needServerExport) {
        // 小数量：直接客户端导出（快速，无需请求）
        // 导出前按 name 自然排序
        const exportData = sortByName(chunks).map(chunk => ({
          name: chunk.name,
          fileName: chunk.fileName,
          content: chunk.content,
          summary: chunk.summary || ''
        }));

        let content, mimeType, ext;
        if (format === 'json') {
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          ext = 'json';
        } else {
          content = exportData.map(item => JSON.stringify(item)).join('\n');
          mimeType = 'application/x-ndjson';
          ext = 'jsonl';
        }

        setProgress(100);
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chunks-${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => {
          setExporting(false);
          onClose();
        }, 500);
      } else {
        // 大数量：服务端流式导出
        const controller = new AbortController();
        abortRef.current = controller;

        // 先获取总数
        const previewRes = await fetch(`/api/projects/${projectId}/chunks/export?${new URLSearchParams()}`);
        const previewData = await previewRes.json();
        const total = previewData?.data?.total || totalCount;

        // 分批拉取
        const allItems = [];
        const batchSize = 500;
        const batches = Math.ceil(total / batchSize);

        for (let i = 0; i < batches; i++) {
          const res = await fetch(`/api/projects/${projectId}/chunks/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ format: 'json', offset: i * batchSize, limit: batchSize }),
            signal: controller.signal
          });

          if (!res.ok) throw new Error(`Export request failed: ${res.statusText}`);

          const batchData = await res.json();
          if (Array.isArray(batchData)) {
            allItems.push(...batchData);
          }

          setProgress(Math.round(((i + 1) / batches) * 100));
        }

        // 转换为最终格式
        let content, mimeType, ext;
        if (format === 'json') {
          content = JSON.stringify(allItems, null, 2);
          mimeType = 'application/json';
          ext = 'json';
        } else {
          content = allItems.map(item => JSON.stringify(item)).join('\n');
          mimeType = 'application/x-ndjson';
          ext = 'jsonl';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chunks-${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => {
          setExporting(false);
          onClose();
        }, 500);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (exporting) {
      abortRef.current?.abort();
    }
    setExporting(false);
    setProgress(0);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('textSplit.exportChunksDialog', 'Export Chunks')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {!exporting ? (
            <>
              <FormControl fullWidth>
                <InputLabel>{t('textSplit.selectExportFormat', 'Export Format')}</InputLabel>
                <Select
                  value={format}
                  onChange={handleFormatChange}
                  label={t('textSplit.selectExportFormat', 'Export Format')}
                >
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="jsonl">JSONL</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary">
                {needServerExport
                  ? t('textSplit.exportLargeHint', 'Large dataset detected, server-side streaming export will be used')
                  : t('textSplit.exportSmallHint', '{{count}} chunks will be exported', { count: chunks.length })}
              </Typography>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
              <Typography variant="body1">{t('textSplit.exportingData', 'Exporting data...')}</Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ width: '100%', height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button onClick={handleExport} variant="contained" disabled={exporting}>
          {t('textSplit.startExport', 'Start Export')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
