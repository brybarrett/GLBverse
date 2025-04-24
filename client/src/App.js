import React, { useState, useEffect } from 'react';
import { 
  Container, CssBaseline, Typography, Box, 
  CircularProgress, Grid, AppBar, Toolbar,
  IconButton, ThemeProvider, createTheme,Button
} from '@mui/material';
import { ThreeDRotation, CloudUpload, Brightness4, Brightness7 } from '@mui/icons-material';
import axios from 'axios';
import ModelUploadForm from './components/UploadForm';
import ModelViewerComponent from "./components/ModelViewer"

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function App() {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        '@media (min-width:600px)': {
          fontSize: '3rem',
        },
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'transform 0.3s, box-shadow 0.3s',
          },
        },
      },
    },
  });

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/models`);
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to load models. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/models/${filename}`);
      fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    fetchModels();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <ThreeDRotation sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            3D Model Gallery
          </Typography>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ 
            fontWeight: 'bold',
            background: darkMode 
              ? 'linear-gradient(45deg, #90caf9, #42a5f5)' 
              : 'linear-gradient(45deg, #3f51b5, #2196f3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            Interactive 3D Model Viewer
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Upload, view and manage your 3D models in GLB format
          </Typography>
        </Box>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <ModelUploadForm 
              onUpload={fetchModels} 
              apiBaseUrl={API_BASE_URL} 
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ 
              mb: 3,
              fontWeight: 'medium',
              color: 'text.primary'
            }}>
              Your 3D Collection
            </Typography>
            
            {isLoading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress size={60} />
              </Box>
            ) : error ? (
              <Box sx={{ 
                p: 3,
                backgroundColor: 'error.light',
                borderRadius: 2,
                textAlign: 'center'
              }}>
                <Typography color="error">{error}</Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={fetchModels}
                  sx={{ mt: 2 }}
                >
                  Retry
                </Button>
              </Box>
            ) : models.length === 0 ? (
              <Box sx={{ 
                p: 4,
                textAlign: 'center',
                backgroundColor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1
              }}>
                <CloudUpload sx={{ fontSize: 60, mb: 2, color: 'action.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                  No models found. Upload your first GLB file to get started.
                </Typography>
              </Box>
            ) : (
              models.map((model) => (
                <ModelViewerComponent
                  key={model._id}
                  model={model}
                  onDelete={handleDelete}
                  apiBaseUrl={API_BASE_URL}
                />
              ))
            )}
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}