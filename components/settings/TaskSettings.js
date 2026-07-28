'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Chip,
  FormHelperText
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import SaveIcon from '@mui/icons-material/Save';
import useTaskSettings from '@/hooks/useTaskSettings';

export default function TaskSettings({ projectId }) {
  const { t } = useTranslation();
  const { taskSettings, setTaskSettings, loading, error, success, setSuccess } = useTaskSettings(projectId);

  // 确保 multiTurnRounds 有正确的初始值
  useEffect(() => {
    if (
      !loading &&
      taskSettings &&
      (taskSettings.multiTurnRounds === undefined || taskSettings.multiTurnRounds === null)
    ) {
      setTaskSettings(prev => ({
        ...prev,
        multiTurnRounds: 3 // 默认值
      }));
    }
  }, [loading, taskSettings, setTaskSettings]);

  // 处理设置变更
  const handleSettingChange = e => {
    const { name, value } = e.target;
    setTaskSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存任务配置
  const handleSaveTaskSettings = async () => {
    try {
      // 确保数组类型的数据被正确处理
      const settingsToSave = { ...taskSettings };

      // 确保递归分块的分隔符数组存在
      if (settingsToSave.splitType === 'recursive' && settingsToSave.separatorsInput) {
        if (!settingsToSave.separators || !Array.isArray(settingsToSave.separators)) {
          settingsToSave.separators = settingsToSave.separatorsInput.split(',').map(item => item.trim());
        }
      }

      console.log('Saving settings:', settingsToSave);

      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      });

      if (!response.ok) {
        throw new Error(t('settings.saveTasksFailed'));
      }

      setSuccess(true);
    } catch (error) {
      console.error('保存任务配置出错:', error);
      //setError(error.message);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
    //setError(null);
  };

  if (loading) {
    return <Typography>{t('common.loading')}</Typography>;
  }

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      {' '}
      {/* 添加底部填充，为固定按钮留出空间 */}
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.textSplitSettings')}
              </Typography>
              <Box sx={{ px: 2, py: 1 }}>
                {/* 分块策略选择 */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="split-type-label">{t('settings.splitType')}</InputLabel>
                  <Select
                    labelId="split-type-label"
                    value={taskSettings.splitType || 'recursive'}
                    label={t('settings.splitType')}
                    name="splitType"
                    onChange={handleSettingChange}
                  >
                    <MenuItem value="markdown">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeMarkdown')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeMarkdownDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="recursive">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeRecursive')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeRecursiveDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="text">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeText')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeTextDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="token">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeToken')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeTokenDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="code">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeCode')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeCodeDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                    {/* 添加自定义符号分割策略选项 */}
                    <MenuItem value="custom">
                      <Box>
                        <Typography variant="subtitle2">{t('settings.splitTypeCustom')}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {t('settings.splitTypeCustomDesc')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Markdown模式设置 */}
                {(!taskSettings.splitType || taskSettings.splitType === 'markdown') && (
                  <>
                    <TextField
                      fullWidth
                      label={t('settings.minLength')}
                      name="textSplitMinLength"
                      value={taskSettings.textSplitMinLength || 2000}
                      onChange={handleSettingChange}
                      type="number"
                      InputProps={{ inputProps: { min: 1, step: 50 } }}
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      fullWidth
                      label={t('settings.maxLength')}
                      name="textSplitMaxLength"
                      value={taskSettings.textSplitMaxLength || 3000}
                      onChange={handleSettingChange}
                      type="number"
                      InputProps={{ inputProps: { min: 1, step: 50 } }}
                    />
                  </>
                )}

                {/* 通用 LangChain 参数设置 */}
                {taskSettings.splitType && taskSettings.splitType !== 'markdown' && (
                  <>
                    <TextField
                      fullWidth
                      label={t('settings.chunkSize')}
                      name="chunkSize"
                      value={taskSettings.chunkSize || 3000}
                      onChange={handleSettingChange}
                      type="number"
                      InputProps={{ inputProps: { min: 1, step: 50 } }}
                      sx={{ mb: 3 }}
                    />

                    <TextField
                      fullWidth
                      label={t('settings.chunkOverlap')}
                      name="chunkOverlap"
                      value={taskSettings.chunkOverlap || 200}
                      onChange={handleSettingChange}
                      type="number"
                      InputProps={{ inputProps: { min: 0, step: 50 } }}
                    />
                  </>
                )}

                {/* Text 分块器特殊设置 */}
                {taskSettings.splitType === 'text' && (
                  <TextField
                    fullWidth
                    label={t('settings.separator')}
                    name="separator"
                    value={taskSettings.separator || '\\n\\n'}
                    onChange={handleSettingChange}
                    helperText={t('settings.separatorHelper')}
                    sx={{ mt: 3 }}
                  />
                )}

                {/* 自定义符号分块器特殊设置 */}
                {taskSettings.splitType === 'custom' && (
                  <TextField
                    fullWidth
                    label={t('settings.customSeparator')}
                    name="customSeparator"
                    value={taskSettings.customSeparator || '---'}
                    onChange={handleSettingChange}
                    helperText={t('settings.customSeparatorHelper')}
                    sx={{ mt: 3 }}
                  />
                )}

                {/* Code 分块器特殊设置 */}
                {taskSettings.splitType === 'code' && (
                  <FormControl fullWidth sx={{ mt: 3 }}>
                    <InputLabel id="code-language-label">{t('settings.codeLanguage')}</InputLabel>
                    <Select
                      labelId="code-language-label"
                      value={taskSettings.splitLanguage || 'js'}
                      label={t('settings.codeLanguage')}
                      name="splitLanguage"
                      onChange={handleSettingChange}
                    >
                      <MenuItem value="js">JavaScript</MenuItem>
                      <MenuItem value="python">Python</MenuItem>
                      <MenuItem value="java">Java</MenuItem>
                      <MenuItem value="go">Go</MenuItem>
                      <MenuItem value="ruby">Ruby</MenuItem>
                      <MenuItem value="cpp">C++</MenuItem>
                      <MenuItem value="c">C</MenuItem>
                      <MenuItem value="csharp">C#</MenuItem>
                      <MenuItem value="php">PHP</MenuItem>
                      <MenuItem value="rust">Rust</MenuItem>
                      <MenuItem value="typescript">TypeScript</MenuItem>
                      <MenuItem value="swift">Swift</MenuItem>
                      <MenuItem value="kotlin">Kotlin</MenuItem>
                      <MenuItem value="scala">Scala</MenuItem>
                    </Select>
                    <FormHelperText>{t('settings.codeLanguageHelper')}</FormHelperText>
                  </FormControl>
                )}

                {/* Recursive 分块器特殊设置 */}
                {taskSettings.splitType === 'recursive' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography gutterBottom>{t('settings.separators')}</Typography>
                    <TextField
                      fullWidth
                      label={t('settings.separatorsInput')}
                      name="separatorsInput"
                      value={taskSettings.separatorsInput || '|,##,>,-'}
                      onChange={e => {
                        const value = e.target.value;
                        // 同时更新输入框值和分隔符数组
                        setTaskSettings(prev => ({
                          ...prev,
                          separatorsInput: value,
                          separators: value.split(',').map(item => item.trim())
                        }));
                      }}
                      helperText={t('settings.separatorsHelper')}
                    />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {(taskSettings.separators || ['|', '##', '>', '-']).map((sep, index) => (
                        <Chip key={index} label={sep} variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                  {t('settings.textSplitDescription')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.questionGenSettings')}
              </Typography>
              <Box sx={{ px: 2, py: 1 }}>
                <TextField
                  fullWidth
                  label={t('settings.questionGenLength', { length: taskSettings.questionGenerationLength })}
                  name="questionGenerationLength"
                  value={taskSettings.questionGenerationLength}
                  onChange={handleSettingChange}
                  type="number"
                  InputProps={{ inputProps: { min: 1, step: 10 } }}
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  label={t('settings.questionMaskRemovingProbability', {
                    probability: taskSettings.questionMaskRemovingProbability
                  })}
                  name="questionMaskRemovingProbability"
                  value={taskSettings.questionMaskRemovingProbability}
                  onChange={handleSettingChange}
                  type="number"
                  InputProps={{ inputProps: { min: 0, max: 100, step: 5 } }}
                  sx={{ mb: 2 }}
                />

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('settings.questionGenDescription')}
                </Typography>

                <TextField
                  style={{ marginTop: 20 }}
                  fullWidth
                  label={t('settings.concurrencyLimit')}
                  name="concurrencyLimit"
                  value={taskSettings.concurrencyLimit}
                  onChange={handleSettingChange}
                  type="number"
                  helperText={t('settings.concurrencyLimitHelper')}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.pdfSettings')}
              </Typography>
              <TextField
                fullWidth
                label={t('settings.minerUToken')}
                name="minerUToken"
                value={taskSettings.minerUToken}
                onChange={handleSettingChange}
                type="password"
                helperText={t('settings.minerUHelper')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('settings.minerULocalUrl')}
                name="minerULocalUrl"
                value={taskSettings.minerULocalUrl}
                onChange={handleSettingChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('settings.visionConcurrencyLimit')}
                name="visionConcurrencyLimit"
                value={taskSettings.visionConcurrencyLimit ? taskSettings.visionConcurrencyLimit : 5}
                onChange={handleSettingChange}
                type="number"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* 多轮对话数据集设置 */}
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.multiTurnSettings')}
              </Typography>
              <Box sx={{ px: 2, py: 1 }}>
                {/* 系统提示词 */}
                <TextField
                  fullWidth
                  label={t('settings.multiTurnSystemPrompt')}
                  name="multiTurnSystemPrompt"
                  value={taskSettings.multiTurnSystemPrompt || ''}
                  onChange={handleSettingChange}
                  multiline
                  rows={3}
                  helperText={t('settings.multiTurnSystemPromptHelper')}
                  sx={{ mb: 2 }}
                />

                {/* 对话场景 */}
                <TextField
                  fullWidth
                  label={t('settings.multiTurnScenario')}
                  name="multiTurnScenario"
                  value={taskSettings.multiTurnScenario || ''}
                  onChange={handleSettingChange}
                  helperText={t('settings.multiTurnScenarioHelper')}
                  sx={{ mb: 2 }}
                />

                {/* 对话轮数 */}
                <TextField
                  fullWidth
                  label={t('settings.multiTurnRounds', { rounds: taskSettings.multiTurnRounds || 3 })}
                  name="multiTurnRounds"
                  value={taskSettings.multiTurnRounds || 3}
                  onChange={handleSettingChange}
                  type="number"
                  InputProps={{ inputProps: { min: 1, step: 1 } }}
                  sx={{ mb: 2 }}
                />

                {/* 角色A设定 */}
                <TextField
                  fullWidth
                  label={t('settings.multiTurnRoleA')}
                  name="multiTurnRoleA"
                  value={taskSettings.multiTurnRoleA || ''}
                  onChange={handleSettingChange}
                  multiline
                  rows={2}
                  helperText={t('settings.multiTurnRoleAHelper')}
                  sx={{ mb: 2 }}
                />

                {/* 角色B设定 */}
                <TextField
                  fullWidth
                  label={t('settings.multiTurnRoleB')}
                  name="multiTurnRoleB"
                  value={taskSettings.multiTurnRoleB || ''}
                  onChange={handleSettingChange}
                  multiline
                  rows={2}
                  helperText={t('settings.multiTurnRoleBHelper')}
                  sx={{ mb: 2 }}
                />

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('settings.multiTurnDescription')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* 测试集生成设置 */}
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.evalQuestionSettings')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('settings.evalQuestionSettingsDescription')}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    fullWidth
                    label={t('settings.evalTrueFalseRatio')}
                    type="number"
                    value={taskSettings.evalQuestionTypeRatios?.true_false || 0}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setTaskSettings(prev => ({
                        ...prev,
                        evalQuestionTypeRatios: {
                          ...prev.evalQuestionTypeRatios,
                          true_false: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                {/* 单选题 */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    fullWidth
                    label={t('settings.evalSingleChoiceRatio')}
                    type="number"
                    value={taskSettings.evalQuestionTypeRatios?.single_choice || 0}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setTaskSettings(prev => ({
                        ...prev,
                        evalQuestionTypeRatios: {
                          ...prev.evalQuestionTypeRatios,
                          single_choice: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                {/* 多选题 */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    fullWidth
                    label={t('settings.evalMultipleChoiceRatio')}
                    type="number"
                    value={taskSettings.evalQuestionTypeRatios?.multiple_choice || 0}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setTaskSettings(prev => ({
                        ...prev,
                        evalQuestionTypeRatios: {
                          ...prev.evalQuestionTypeRatios,
                          multiple_choice: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                {/* 固定短答案 */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    fullWidth
                    label={t('settings.evalShortAnswerRatio')}
                    type="number"
                    value={taskSettings.evalQuestionTypeRatios?.short_answer || 0}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setTaskSettings(prev => ({
                        ...prev,
                        evalQuestionTypeRatios: {
                          ...prev.evalQuestionTypeRatios,
                          short_answer: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                {/* 开放式回答 */}
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    fullWidth
                    label={t('settings.evalOpenEndedRatio')}
                    type="number"
                    value={taskSettings.evalQuestionTypeRatios?.open_ended || 0}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setTaskSettings(prev => ({
                        ...prev,
                        evalQuestionTypeRatios: {
                          ...prev.evalQuestionTypeRatios,
                          open_ended: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                {t('settings.evalQuestionRatioHelper')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.huggingfaceSettings')}
              </Typography>
              <TextField
                fullWidth
                label={t('settings.huggingfaceToken')}
                name="huggingfaceToken"
                value={taskSettings.huggingfaceToken || ''}
                onChange={handleSettingChange}
                type="password"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {t('settings.saveSuccess')}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      {/* 吸底保存按钮 */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px',
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'center',
          boxShadow: 3
        }}
      >
        <Button
          variant="contained"
          color="primary"
          size="medium"
          startIcon={<SaveIcon />}
          onClick={handleSaveTaskSettings}
        >
          {t('settings.saveTaskConfig')}
        </Button>
      </Box>
    </Box>
  );
}
