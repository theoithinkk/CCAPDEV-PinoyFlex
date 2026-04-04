import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";
import multer from "multer";

const { CloudinaryStorage } = pkg;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* FUNCTION NOT USED ANYMORE
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
} */

/* FUNCTION NOT USED ANYMORE
function safeExt(originalName = "") {
  return path.extname(originalName).slice(0, 10);
} */

/* FUNCTION NOT USED ANYMORE
function cleanupFile(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup failures for invalid uploads.
  }
} */

export function createUploadHandler({
  folder,
  maxSizeMb,
  fieldName,
  allowedMimeTypes = null,
  uploadErrorMessage = "Upload failed.",
  missingFileMessage = "No file uploaded.",
  invalidTypeMessage = "Invalid file type.",
}) {
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: `pinoyflex/${folder}`,
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ quality: "auto" }],
  },
});

const uploader = multer({
  storage,
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
        cloudinary.uploader.destroy(req.file.filename);
        return res.status(400).json({ error: invalidTypeMessage });
      }
      return next();
    });
  };
}

export function toUploadedFile(file, folder) {
  return {
    url: file.path,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}
