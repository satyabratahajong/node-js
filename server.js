const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3001;

const uploadDirectory = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    callback(null, uniqueName);
  }
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp"
];

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Only JPEG, PNG, GIF and WEBP files are allowed."));
    }
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDirectory));

app.get("/api/images", (req, res) => {
  const files = fs
    .readdirSync(uploadDirectory)
    .filter((file) => {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
    })
    .map((file) => {
      const filePath = path.join(uploadDirectory, file);
      const fileStats = fs.statSync(filePath);

      return {
        filename: file,
        url: `/uploads/${file}`,
        size: fileStats.size,
        uploadedAt: fileStats.mtime
      };
    })
    .sort((a, b) => {
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });

  res.json(files);
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Please upload an image."
    });
  }

  res.status(201).json({
    message: "Image uploaded successfully.",
    image: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    }
  });
});

app.delete("/api/images/:filename", (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDirectory, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Image not found."
    });
  }

  fs.unlinkSync(filePath);

  res.json({
    message: "Image deleted successfully."
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size cannot exceed 5 MB."
      });
    }

    return res.status(400).json({
      error: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      error: error.message
    });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Image gallery running at http://localhost:${PORT}`);
}); 