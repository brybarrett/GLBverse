const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [process.env.CLIENT_URL],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// MongoDB Connection with improved error handling
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
}).then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'models',
    chunkSizeBytes: 1048576 // 1MB chunks
  });
  console.log('GridFS initialized');
});






// File upload with validation
const storage = multer.memoryStorage();


const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'model/gltf-binary' || file.originalname.endsWith('.glb')) {
      cb(null, true);
    } else {
      cb(new Error('Only GLB files are allowed'), false);
    }
  }
});



// Enhanced routes with better error handling
app.post('/api/upload', upload.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded or invalid file type' 
      });
    }

    const filename = encodeURIComponent(req.file.originalname);
    const writeStream = gfs.openUploadStream(filename, {
      metadata: {
        uploadedBy: req.user?.id || 'anonymous',
        fileSize: req.file.size,
        uploadDate: new Date()
      }
    });

    writeStream.write(req.file.buffer);
    writeStream.end();

    writeStream.on('finish', () => {
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        filename: filename,
        fileId: writeStream.id,
        size: req.file.size
      });
    });

    writeStream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Upload failed' 
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Upload failed' 
    });
  }
});

// ... (keep other routes similar with enhanced error handling)

// Production setup
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});