'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * 文本块导入对话框（三步向导）
 * Step 1: 文件上传
 * Step 2: 数据预览
 * Step 3: 导入进度
 */
export default function ChunkImportDialog({ open, onClose, projectId, onImportSuccess }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, errors: [] });
  const [completed, setCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const steps = [
    t('import.fileUpload', 'Upload File'),
    t('import.preview', 'Preview'),
    t('import.importing', 'Importing')
  ];

  const handleClose = () => {
    setCurrentStep(0);
    setError('');
    setImportData(null);
    setImporting(false);
    setProgress(0);
    setStats({ total: 0, success: 0, failed: 0, errors: [] });
    setCompleted(false);
    setIsDragging(false);
    dragCounterRef.current = 0;
    onClose();
  };

  // 拖拽事件处理器
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  /**
   * 处理文件（拖拽或点击选择共用）
   */
  const processFile = async (file) => {
    setError('');

    try {
      const text = await file.text();
      const ext = file.name.split('.').pop().toLowerCase();
      let data = [];

      if (ext === 'json') {
        data = JSON.parse(text);
        data = Array.isArray(data) ? data : [data];
      } else if (ext === 'jsonl') {
        data = text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => JSON.parse(line));
      } else {
        throw new Error(t('textSplit.unsupportedFormat', 'Unsupported file format'));
      }

      if (data.length === 0) {
        throw new Error(t('textSplit.emptyFile', 'File contains no data'));
      }

      const invalidItems = data.filter(
        item => !item.name || !item.fileName || !item.content
      );

      setImportData({
        data,
        fileName: file.name,
        totalRecords: data.length,
        invalidCount: invalidItems.length,
        preview: data.slice(0, 5)
      });

      setCurrentStep(1);
    } catch (err) {
      setError(err.message || t('textSplit.parseFileFailed', 'Failed to parse file'));
    }
  };

  /**
   * 点击选择文件
   */
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]);
  };

  /**
   * 开始导入
   */
  const handleStartImport = async () => {
    if (!importData || !importData.data) return;

    setImporting(true);
    setCurrentStep(2);
    setProgress(0);

    try {
      const allData = importData.data;
      const batchSize = 200;
      const batches = Math.ceil(allData.length / batchSize);
      let success = 0;
      let failed = 0;
      const allErrors = [];

      for (let i = 0; i < batches; i++) {
        const batch = allData.slice(i * batchSize, (i + 1) * batchSize);

        // 创建 FormData
        const formData = new FormData();
        const batchJson = JSON.stringify(batch);
        const blob = new Blob([batchJson], { type: 'application/json' });
        formData.append('file', blob, `import-batch-${i}.json`);

        try {
          const res = await fetch(`/api/projects/${projectId}/chunks/import`, {
            method: 'POST',
            body: formData
          });

          const result = await res.json();

          if (res.ok && result.code === 0) {
            success += result.data?.total || 0;
          } else {
            failed += batch.length;
            // 支持结构化错误对象 { message, stack }
            allErrors.push({
              message: result.error || result.message || 'Unknown error',
              stack: result.stack || null
            });
          }
        } catch (err) {
          failed += batch.length;
          allErrors.push({ message: err.message, stack: err.stack });
        }

        setProgress(Math.round(((i + 1) / batches) * 100));
        setStats({
          total: allData.length,
          success,
          failed,
          errors: allErrors
        });
      }

      setCompleted(true);
      setStats({
        total: allData.length,
        success,
        failed,
        errors: allErrors
      });
    } catch (err) {
      setStats(prev => ({
        ...prev,
        errors: [...prev.errors, { message: err.message, stack: err.stack }]
      }));
    } finally {
      setImporting(false);
    }
  };

  /**
   * 导入完成回调
   */
  const handleComplete = () => {
    onImportSuccess?.();
    handleClose();
  };

  /**
   * 渲染步骤内容
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragging ? 'action.hover' : 'transparent',
              transition: 'all 0.2s',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('chunk-import-file-input')?.click()}
          >
            <input
              id="chunk-import-file-input"
              type="file"
              accept=".json,.jsonl"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <UploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'grey.500', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t('import.dragDropFile', 'Drag file here or click to select')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('import.supportedFormats', 'Supported formats: JSON, JSONL')}
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity={importData?.invalidCount > 0 ? 'warning' : 'info'}>
              {t('import.previewNote', 'Preview of the first 5 records:')}
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip icon={<InfoIcon />} label={t('import.total', { count: importData?.totalRecords || 0 })} variant="outlined" />
              {importData?.invalidCount > 0 && (
                <Chip icon={<ErrorIcon />} label={t('import.invalidCount', { count: importData.invalidCount })} color="warning" variant="outlined" />
              )}
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('import.chunkName', 'Name')}</TableCell>
                    <TableCell>{t('import.fileName', 'File')}</TableCell>
                    <TableCell>{t('textSplit.importContent', 'Content')}</TableCell>
                    <TableCell>{t('textSplit.importSummary', 'Summary')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importData?.preview?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </TableCell>
                      <TableCell>{item.fileName}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.content?.length > 100 ? item.content.substring(0, 100) + '...' : item.content}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.summary || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body1">
              {completed
                ? t('textSplit.importCompleted', 'Import completed!')
                : t('textSplit.importingData', 'Importing data...')}
            </Typography>

            <Paper sx={{ p: 3 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}% {t('import.complete', 'complete')}
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('import.importStats', 'Import Statistics')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip icon={<InfoIcon />} label={t('import.total', { count: stats.total })} variant="outlined" />
                <Chip icon={<CheckIcon />} label={t('import.success', { count: stats.success })} color="success" variant="outlined" />
                <Chip icon={<ErrorIcon />} label={t('import.failed', { count: stats.failed })} color="error" variant="outlined" />
              </Box>
            </Paper>

            {stats.errors.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="error">
                  {t('import.errors', 'Error Details')}
                </Typography>
                {stats.errors.slice(0, 5).map((err, i) => {
                  const msg = typeof err === 'string' ? err : err.message;
                  const stack = typeof err === 'object' ? err.stack : null;
                  return (
                    <Accordion key={i} defaultExpanded={false} sx={{ mb: 0.5 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <ErrorIcon color="error" fontSize="small" sx={{ mr: 1, mt: 0.5 }} />
                        <Typography variant="body2">{msg}</Typography>
                      </AccordionSummary>
                      {stack && (
                        <AccordionDetails>
                          <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                              m: 0
                            }}
                          >
                            {stack}
                          </Typography>
                        </AccordionDetails>
                      )}
                    </Accordion>
                  );
                })}
                {stats.errors.length > 5 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {t('import.moreErrors', '...and {{count}} more errors', { count: stats.errors.length - 5 })}
                  </Typography>
                )}
              </Paper>
            )}

            {completed && (
              <Alert severity="success">
                {t('textSplit.importSuccess', 'Successfully imported {{count}} chunks', { count: stats.success })}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: 500 } }}>
      <DialogTitle>{t('textSplit.importChunksDialog', 'Import Chunks')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ minHeight: 300 }}>{renderStepContent()}</Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing && !completed}>
          {t('common.cancel', 'Cancel')}
        </Button>
        {currentStep === 1 && (
          <>
            <Button onClick={() => setCurrentStep(0)}>
              {t('common.back', 'Back')}
            </Button>
            <Button onClick={handleStartImport} variant="contained" color="primary">
              {t('textSplit.startImport', 'Start Import')}
            </Button>
          </>
        )}
        {completed && (
          <Button onClick={handleComplete} variant="contained" color="primary">
            {t('common.done', 'Done')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
