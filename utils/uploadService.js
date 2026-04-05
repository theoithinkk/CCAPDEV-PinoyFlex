import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

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

const uploader = multer({ storage: multer.memoryStorage() });

  return (req, res, next) => {
    uploader.single(fieldName)(req, res, async (err) => {
      if (err) return res.status(400).json({ error: uploadErrorMessage });
      if (!req.file) return res.status(400).json({ error: missingFileMessage });
      if (allowedMimeTypes && !allowedMimeTypes.has(req.file.mimetype)) {
        return res.status(400).json({ error: invalidTypeMessage });
      }

      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { 
              folder: `pinoyflex/${folder}`,
              resource_type: "auto",  // this tells Cloudinary to auto-detect image OR video
            },
            (error, result) => error ? reject(error) : resolve(result)
          ).end(req.file.buffer);
        });

        req.file.cloudinaryUrl = result.secure_url;
        req.file.cloudinaryId  = result.public_id;
        return next();
      } catch {
        return res.status(500).json({ error: uploadErrorMessage });
      }
    });
  };
}

export function toUploadedFile(file, folder) {
  return {
    url:          file.cloudinaryUrl,
    filename:     file.cloudinaryId,
    originalName: file.originalname,
    mimeType:     file.mimetype,
    size:         file.size,
  };
}