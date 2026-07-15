import React, { useState, useEffect } from 'react';
import { Box, Button, Snackbar, Alert, Typography, CircularProgress } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import WarningIcon from '@mui/icons-material/Warning';

const UpdateChecker = () => {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState('');

  useEffect(() => {
    if (!window.electron?.updater) return;

    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const checkForUpdates = async (manual = false) => {
    if (!window.electron?.updater) return;

    try {
      setChecking(true);
      const result = await window.electron.updater.checkForUpdates();
      if (result?.disabled && result?.message && manual) {
        setDisabledMessage(result.message);
        setOpen(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        color="primary"
        startIcon={checking ? <CircularProgress size={16} /> : <UpdateIcon />}
        onClick={() => checkForUpdates(true)}
        disabled={checking}
        sx={{ ml: 1 }}
      >
        检查更新
      </Button>

      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity="warning" icon={<WarningIcon />} sx={{ width: '100%', maxWidth: 420 }}>
          <Box sx={{ p: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" /> 更新不可用
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {disabledMessage}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default UpdateChecker;
