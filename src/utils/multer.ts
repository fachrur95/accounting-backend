import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, callback: any) => {
  const ext = path.extname(file.originalname);
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    callback(null, true);
  } else {
    callback(new Error("Image uploaded is not of type jpg/jpeg or png"), false);
  }
}

const multerUpload = multer({ storage, fileFilter });

export default multerUpload;