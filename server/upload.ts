import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/avatars/";
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = randomBytes(16).toString("hex");
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter to validate uploads
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only image files
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed!"));
    return;
  }
  cb(null, true);
};

// Export configured multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
});