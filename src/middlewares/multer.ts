import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: any, callback: any) => {
  const ext = path.extname(file.originalname);
  if (
    ext !== ".jpg" &&
    ext !== ".jpeg" &&
    ext !== ".png" &&
    ext !== ".webp"
  ) {
    return callback(new Error("Image uploaded is not of type jpg/jpeg, png or webp"), false);
  }
  callback(null, true);
}

const multerUpload = multer({ storage, fileFilter });

export default multerUpload;