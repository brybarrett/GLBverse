const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS config (allow local + live frontend)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://server-gbl.vercel.app",
       "https://client-gbl.vercel.app"
    ],
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const conn = mongoose.connection;
let gfs;


app.get("/api/hello", (req, res) => {
  res.json({ msg: "Hello from Vercel!" });
});


conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "models",
    chunkSizeBytes: 1048576, // 1MB chunks
  });
  console.log("GridFS initialized");
});

// Multer setup (only GLB files)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
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

// List all models API
app.get("/api/models", async (req, res) => {
  try {
    const files = await gfs.find().toArray();
    res.json(files);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Error fetching models" });
  }
});

// Download model by filename API
app.get("/api/models/:filename", (req, res) => {
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

// Download model by ID API (✅ NEW)
app.get("/api/model/:id", async (req, res) => {
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

// Production note (if needed later)
if (process.env.NODE_ENV === "production") {
  console.log("Running in production mode");
  // No need to serve frontend manually, Vercel handles it
}

// Port setup

