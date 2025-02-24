import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";
    if (file.fieldname === "music") {
      uploadPath += "music/";
    } else if (file.fieldname === "avatar") {
      uploadPath += "avatars/";
    }
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
  if (file.fieldname === "music") {
    // Allow only audio files
    if (!file.mimetype.startsWith("audio/")) {
      cb(new Error("Only audio files are allowed!"));
      return;
    }
  } else if (file.fieldname === "avatar") {
    // Allow only image files
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed!"));
      return;
    }
  }
  cb(null, true);
};

// Export configured multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for all files
  },
});