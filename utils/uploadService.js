import fs from "fs";
import multer from "multer";
import path from "path";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeExt(originalName = "") {
  return path.extname(originalName).slice(0, 10);
}

function cleanupFile(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup failures for invalid uploads.
  }
}

export function createUploadHandler({
  folder,
  maxSizeMb,
  fieldName,
  allowedMimeTypes = null,
  uploadErrorMessage = "Upload failed.",
  missingFileMessage = "No file uploaded.",
  invalidTypeMessage = "Invalid file type.",
}) {
  const destinationDir = path.join(process.cwd(), "uploads", folder);
  ensureDir(destinationDir);

  const uploader = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destinationDir),
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt(file.originalname)}`);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
  });

  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: uploadErrorMessage });
      }
      if (!req.file) {
        return res.status(400).json({ error: missingFileMessage });
      }
      if (allowedMimeTypes && !allowedMimeTypes.has(req.file.mimetype)) {
        cleanupFile(req.file.path);
        return res.status(400).json({ error: invalidTypeMessage });
      }
      return next();
    });
  };
}

export function toUploadedFile(file, folder) {
  return {
    url: `/uploads/${folder}/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}
