const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();
const cors = require("cors");

const app = express();

// CORS config (allow local + Vercel frontend)
app.use(cors({
  origin: ['https://glbverse-backend.onrender.com' ,
  'http://localhost:3000']
}));

app.use(express.json({ limit: "50mb" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const conn = mongoose.connection;
let gfs;

// Basic route
app.get("/", (req, res) => {
  res.send("Server is up and running 🚀");
});

app.get("/api/hello", (req, res) => {
  res.json({ msg: "Hello from Vercel!" });
});

// Initialize GridFS once DB is open
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "models",
    chunkSizeBytes: 1048576, // 1MB chunks
  });
  console.log("GridFS initialized");
});

// Multer setup (only GLB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "model/gltf-binary" ||
      file.originalname.endsWith(".glb")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only GLB files are allowed"), false);
    }
  },
});

// Upload API
app.post("/api/upload", upload.single("model"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded or invalid file type",
      });
    }

    const filename = encodeURIComponent(req.file.originalname);
    const writeStream = gfs.openUploadStream(filename, {
      metadata: {
        uploadedBy: req.user?.id || "anonymous",
        fileSize: req.file.size,
        uploadDate: new Date(),
      },
    });

    writeStream.write(req.file.buffer);
    writeStream.end();

    writeStream.on("finish", () => {
      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        filename,
        fileId: writeStream.id,
        size: req.file.size,
      });
    });

    writeStream.on("error", (error) => {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, error: "Upload failed" });
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Upload failed" });
  }
});

// List all models
app.get("/api/models", async (req, res) => {
  try {
    const files = await gfs.find().toArray();
    res.json(files);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Error fetching models" });
  }
});

// Middleware to set CORS headers BEFORE streaming
const setCorsHeaders = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
};

// Download model by filename
app.get("/api/models/:filename", setCorsHeaders, (req, res) => {
  try {
    const downloadStream = gfs.openDownloadStreamByName(req.params.filename);

    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      res.status(404).json({ error: "File not found" });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Download model by ID
app.get("/api/model/:id", setCorsHeaders, (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gfs.openDownloadStream(fileId);

    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      res.status(404).json({ error: "File not found" });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Port setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});
