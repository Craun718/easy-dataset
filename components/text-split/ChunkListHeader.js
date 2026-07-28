'use client';

import { Box, Typography, Checkbox, Button, Select, MenuItem, Tooltip, Menu, IconButton, Badge } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ChunkFilterDialog from './ChunkFilterDialog';

export default function ChunkListHeader({
  projectId,
  totalChunks,
  selectedChunks,
  onSelectAll,
  onBatchGenerateQuestions,
  onBatchEditChunks,
  onBatchDeleteChunks,
  questionFilter,
  setQuestionFilter,
  chunks = [], // 添加chunks参数，用于导出文本块
  selectedModel = {},
  onFilterChange = null,
  activeFilterCount = 0,
  onExportClick = null,  // 导出对话框触发回调
  onImportClick = null   // 导入对话框触发回调
}) {
  const { t, i18n } = useTranslation();

  // 添加更多菜单的状态和锚点
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState(null);
  const isMoreMenuOpen = Boolean(moreMenuAnchorEl);

  // 添加筛选对话框状态
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // 自动任务菜单状态
  const [autoTasksMenuAnchorEl, setAutoTasksMenuAnchorEl] = useState(null);
  const isAutoTasksMenuOpen = Boolean(autoTasksMenuAnchorEl);

  const handleAutoTasksClick = event => {
    setAutoTasksMenuAnchorEl(event.currentTarget);
  };

  const handleAutoTasksClose = () => {
    setAutoTasksMenuAnchorEl(null);
  };

  // 打开更多菜单
  const handleMoreMenuClick = event => {
    setMoreMenuAnchorEl(event.currentTarget);
  };

  // 关闭更多菜单
  const handleMoreMenuClose = () => {
    setMoreMenuAnchorEl(null);
  };

  // 处理批量编辑，关闭菜单并调用原有函数
  const handleBatchEdit = () => {
    handleMoreMenuClose();
    onBatchEditChunks();
  };

  // 处理批量删除，关闭菜单并调用原有函数
  const handleBatchDelete = () => {
    handleMoreMenuClose();
    onBatchDeleteChunks();
  };

  // 创建自动提取问题任务
  const handleCreateAutoQuestionTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '请先选择模型' }));
      return;
    }

    try {
      // 调用创建任务接口
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'question-generation',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批量生成问题任务'
      });

      if (response.data?.code === 0) {
        toast.success(t('tasks.createSuccess', { defaultValue: '后台任务已创建，系统将自动处理未生成问题的文本块' }));
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('创建自动提取问题任务失败:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + error.message);
    }
  };

  // 创建自动数据清洗任务
  const handleCreateAutoDataCleaningTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '请先选择模型' }));
      return;
    }

    try {
      // 调用创建任务接口
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'data-cleaning',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批量数据清洗任务'
      });

      if (response.data?.code === 0) {
        toast.success(
          t('tasks.createSuccess', { defaultValue: '后台任务已创建，系统将自动处理所有文本块进行数据清洗' })
        );
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('创建自动数据清洗任务失败:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + error.message);
    }
  };

  // 创建自动生成评估数据集任务
  const handleCreateAutoEvalGenerationTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '请先选择模型' }));
      return;
    }

    try {
      // 调用创建任务接口
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'eval-generation',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批量生成评估数据集任务'
      });

      if (response.data?.code === 0) {
        toast.success(
          t('tasks.createSuccess', {
            defaultValue: '后台任务已创建，系统将自动为所有未生成评估题目的文本块生成评估数据集'
          })
        );
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('创建自动生成评估数据集任务失败:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '创建任务失败' }) + ': ' + error.message);
    }
  };

  // 处理导出文本块 - 触发外部导出对话框
  const handleExport = () => {
    handleMoreMenuClose();
    if (onExportClick) {
      onExportClick();
    } else {
      // 降级：原有客户端导出逻辑
      handleExportChunksFallback();
    }
  };

  // 处理导入文本块 - 触发外部导入对话框
  const handleImport = () => {
    handleMoreMenuClose();
    if (onImportClick) {
      onImportClick();
    }
  };

  // 原有客户端导出逻辑（降级用）
  const handleExportChunksFallback = () => {
    if (!chunks || chunks.length === 0) return;
    const exportData = chunks.map(chunk => ({
      name: chunk.name,
      projectId: chunk.projectId,
      fileName: chunk.fileName,
      content: chunk.content,
      summary: chunk.summary,
      size: chunk.size
    }));
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-chunks-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Checkbox
          checked={selectedChunks.length === totalChunks}
          indeterminate={selectedChunks.length > 0 && selectedChunks.length < totalChunks}
          onChange={onSelectAll}
        />
        <Typography variant="body1">{t('textSplit.selectedCount', { count: selectedChunks.length })}</Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 1.5,
          width: { xs: '100%', md: 'auto' }
        }}
      >
        {/* 更多筛选按钮 */}
        <Tooltip title={t('datasets.moreFilters', { defaultValue: '更多筛选' })}>
          <Badge badgeContent={activeFilterCount} color="error" overlap="circular">
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterDialogOpen(true)}
              size="small"
              sx={{ borderRadius: 1 }}
            >
              {t('datasets.moreFilters', { defaultValue: '更多筛选' })}
            </Button>
          </Badge>
        </Tooltip>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mt: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Tooltip
              title={!selectedModel?.id ? t('textSplit.modelRequired', { defaultValue: '请先选择模型以启用该功能' }) : ''}
            >
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<QuizIcon />}
                  disabled={selectedChunks.length === 0 || !selectedModel?.id}
                  onClick={onBatchGenerateQuestions}
                  size="medium"
                  sx={{ minWidth: { xs: '48%', sm: 'auto' } }}
                >
                  {t('textSplit.batchGenerateQuestions')}
                </Button>
              </span>
            </Tooltip>

          {/* 自动任务下拉菜单 */}
          <Tooltip
            title={!selectedModel?.id ? t('textSplit.modelRequired', { defaultValue: '请先选择模型以启用该功能' }) : ''}
          >
            <span>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AutoFixHighIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleAutoTasksClick}
                disabled={!projectId || !selectedModel?.id}
                size="medium"
                sx={{ minWidth: { xs: '48%', sm: 'auto' } }}
              >
                {t('textSplit.autoTasks', { defaultValue: '自动任务' })}
              </Button>
            </span>
          </Tooltip>

          <Menu
            anchorEl={autoTasksMenuAnchorEl}
            open={isAutoTasksMenuOpen}
            onClose={handleAutoTasksClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <Tooltip
              title={t('textSplit.autoGenerateQuestionsTip', {
                defaultValue: '创建后台批量处理任务：自动查询待生成问题的文本块并提取问题'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoQuestionTask();
                  handleAutoTasksClose();
                }}
              >
                <QuizIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                {t('textSplit.autoGenerateQuestions')}
              </MenuItem>
            </Tooltip>

            <Tooltip
              title={t('textSplit.autoEvalGenerationTip', {
                defaultValue: '创建后台批量处理任务：自动为所有未生成评估题目的文本块生成评估数据集'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoEvalGenerationTask();
                  handleAutoTasksClose();
                }}
              >
                <AssessmentIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                {t('textSplit.autoEvalGeneration', { defaultValue: '自动生成评估集' })}
              </MenuItem>
            </Tooltip>

            <Tooltip
              title={t('textSplit.autoDataCleaningTip', {
                defaultValue: '创建后台批量处理任务：自动对所有文本块进行数据清洗'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoDataCleaningTask();
                  handleAutoTasksClose();
                }}
              >
                <CleaningServicesIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                {t('textSplit.autoDataCleaning', { defaultValue: '自动数据清洗' })}
              </MenuItem>
            </Tooltip>
          </Menu>

          {/* 更多菜单按钮 */}
          <Tooltip title={t('common.more', { defaultValue: '更多操作' })}>
            <IconButton
              onClick={handleMoreMenuClick}
              color="primary"
              size="medium"
              sx={{
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>

          {/* 更多操作下拉菜单 */}
          <Menu
            anchorEl={moreMenuAnchorEl}
            open={isMoreMenuOpen}
            onClose={handleMoreMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <MenuItem onClick={handleBatchEdit} disabled={selectedChunks.length === 0}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              {t('batchEdit.batchEdit', { defaultValue: '批量编辑' })}
            </MenuItem>
            <MenuItem onClick={handleBatchDelete} disabled={selectedChunks.length === 0}>
              <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
              {t('textSplit.batchDeleteChunks', { defaultValue: '批量删除' })}
            </MenuItem>
            <MenuItem onClick={handleExport} disabled={chunks.length === 0}>
              <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
              {t('textSplit.exportChunks', { defaultValue: '导出文本块' })}
            </MenuItem>
            <MenuItem onClick={handleImport} disabled={!projectId}>
              <UploadIcon fontSize="small" sx={{ mr: 1 }} />
              {t('textSplit.importChunks', { defaultValue: '导入文本块' })}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* 筛选对话框 */}
      <ChunkFilterDialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} onApply={onFilterChange} />
    </Box>
  );
}
