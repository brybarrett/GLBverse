import React, { useState } from 'react';
import { 
  Box, Button, CircularProgress, Paper, Typography, 
  Snackbar, Alert, LinearProgress, Avatar 
} from '@mui/material';
import { CloudUpload, CheckCircle, Error } from '@mui/icons-material';
import axios from 'axios';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function ModelUploadForm({ onUpload, apiBaseUrl }) {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
        setSnackbar({
          open: true,
          message: 'File size exceeds 100MB limit',
          severity: 'error'
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setSnackbar({
        open: true,
        message: 'Please select a file first',
        severity: 'warning'
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('model', file);

    try {
      await axios.post(`${apiBaseUrl}/api/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSnackbar({
        open: true,
        message: 'File uploaded successfully!',
        severity: 'success'
      });
      onUpload();
      setFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Upload failed',
        severity: 'error'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper elevation={3} sx={{ 
      p: 3, 
      mb: 4,
      background: 'linear-gradient(145deg, #f5f7fa, #e4e8f0)',
      borderRadius: '12px'
    }}>
      <Typography variant="h5" gutterBottom sx={{ 
        fontWeight: 'bold',
        color: 'primary.main',
        mb: 3
      }}>
        Upload New 3D Model
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          alignItems: 'center',
          p: 3,
          border: '2px dashed',
          borderColor: 'primary.light',
          borderRadius: '8px',
          backgroundColor: 'background.paper',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}>
          <Avatar sx={{ 
            bgcolor: 'primary.light', 
            width: 60, 
            height: 60,
            mb: 1
          }}>
            <CloudUpload fontSize="large" />
          </Avatar>
          
          <Button
            component="label"
            variant="outlined"
            color="primary"
            startIcon={<CloudUpload />}
            disabled={isUploading}
            sx={{ fontWeight: 'bold' }}
          >
            Select GLB File
            <VisuallyHiddenInput 
              type="file"
              accept=".glb"
              onChange={handleFileChange}
            />
          </Button>
          
          {file && (
            <Box sx={{ 
              textAlign: 'center',
              mt: 1
            }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            </Box>
          )}
        </Box>
        
        {uploadProgress > 0 && (
          <Box sx={{ width: '100%', mt: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              color="primary"
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 1
            }}>
              <Typography variant="caption" color="text.secondary">
                Uploading...
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight="bold">
                {uploadProgress}%
              </Typography>
            </Box>
          </Box>
        )}
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!file || isUploading}
          sx={{ 
            mt: 3,
            py: 1.5,
            fontWeight: 'bold',
            fontSize: '1rem',
            width: '100%'
          }}
          startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isUploading ? 'Uploading...' : 'Upload Model'}
        </Button>
      </form>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          iconMapping={{
            success: <CheckCircle fontSize="inherit" />,
            error: <Error fontSize="inherit" />,
            warning: <Error fontSize="inherit" />
          }}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}