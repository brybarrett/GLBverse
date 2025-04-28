import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Bounds, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box, IconButton, Typography, LinearProgress, Tooltip,
  Card, CardHeader, CardContent, Avatar, Chip, Divider, Collapse,
  Snackbar, Alert
} from '@mui/material';
import {
  Delete, Download, Fullscreen, ExpandMore, Info, ThreeDRotation
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ExpandButton = styled(IconButton)(({ theme }) => ({
  transform: 'rotate(0deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const ExpandButtonExpanded = styled(ExpandButton)({
  transform: 'rotate(180deg)',
});

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <Box sx={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        p: 2,
        borderRadius: 2,
        minWidth: 200
      }}>
        <Typography variant="body1" gutterBottom>
          Loading model...
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="caption" display="block" textAlign="center" mt={1}>
          {Math.round(progress)}%
        </Typography>
      </Box>
    </Html>
  );
}

function Model({ url }) {
  const { scene } = useGLTF(url);

  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  scene.position.x = -center.x;
  scene.position.y = -center.y;
  scene.position.z = -center.z;

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1 / maxDim;
  scene.scale.set(scale, scale, scale);

  return <primitive object={scene} />;
}

function Controls() {
  const controls = useRef();
  const { camera, gl } = useThree();

  useFrame(() => controls.current?.update());

  return (
    <OrbitControls
      ref={controls}
      args={[camera, gl.domElement]}
      enableZoom
      enablePan
      enableRotate
      minDistance={1}
      maxDistance={10}
      zoomSpeed={0.5}
      panSpeed={0.5}
      rotateSpeed={0.5}
    />
  );
}

export default function ModelViewerComponent({ model, onDelete, apiBaseUrl }) {
  const [isHovered, setIsHovered] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const canvasRef = useRef();
  const modelUrl = `${apiBaseUrl}/api/models/${model.filename}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(modelUrl);
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', model.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Download started!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Download failed', severity: 'error' });
    }
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      canvasRef.current?.requestFullscreen?.().catch(err => {
        setSnackbar({ open: true, message: 'Fullscreen not supported', severity: 'warning' });
      });
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  const handleExpandClick = () => setExpanded(!expanded);

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  return (
    <Card
      sx={{
        mb: 3,
        transition: 'all 0.3s',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 20px rgba(0, 0, 0, 0.15)'
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader
        avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><ThreeDRotation /></Avatar>}
        action={
          isHovered && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Download"><IconButton onClick={handleDownload} color="primary"><Download /></IconButton></Tooltip>
              <Tooltip title="Delete"><IconButton onClick={() => onDelete(model.filename)} color="error"><Delete /></IconButton></Tooltip>
              <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}><IconButton onClick={toggleFullscreen} color="primary"><Fullscreen /></IconButton></Tooltip>
              {expanded ? <ExpandButtonExpanded onClick={handleExpandClick}><ExpandMore /></ExpandButtonExpanded> : <ExpandButton onClick={handleExpandClick}><ExpandMore /></ExpandButton>}
            </Box>
          )
        }
        title={<Typography variant="h6" noWrap>{model.filename}</Typography>}
        subheader={<Typography variant="caption" color="text.secondary">Uploaded: {new Date(model.uploadDate).toLocaleDateString()}</Typography>}
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ height: fullscreen ? 'calc(100vh - 120px)' : '500px', position: 'relative', backgroundColor: 'background.default', overflow: 'hidden' }}>
          <Canvas
            ref={canvasRef}
            camera={{ position: [0, 0, 3], fov: 50 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Suspense fallback={<Loader />}>
              <Bounds fit clip observe damping={6} margin={1.2}>
                <Model url={modelUrl} />
              </Bounds>
              <Environment preset="studio" />
            </Suspense>
            <Controls />
          </Canvas>
        </Box>
      </CardContent>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
            <Chip icon={<Info />} label={`Size: ${(model.length / (1024 * 1024)).toFixed(2)} MB`} variant="outlined" />
            <Chip label={`Type: GLB`} variant="outlined" color="primary" />
            <Chip label={`Uploaded by: ${model.metadata?.uploadedBy || 'System'}`} variant="outlined" />
          </Box>
        </CardContent>
      </Collapse>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
