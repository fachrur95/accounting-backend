import path from "path";
import { File } from "../types/file";
import { handleUpload } from "../utils/cloudinary";

const upload = async (files: File[]) => {
  const dataBuffer = files?.map((file) => {
    const currentBuffer = Buffer.from(file.buffer).toString("base64");
    const ext = path.extname(file.originalname).split(".")[1];
    const dataUri = `data:image/${ext};base64,${currentBuffer}`;
    return handleUpload(dataUri);
  });
  const dataUploaded = await Promise.all(dataBuffer);
  // console.log({ dataUploaded });
  return dataUploaded;
}

const uploadWithBase64 = async (files: string[]) => {
  const dataBuffer = files?.map((file) => handleUpload(file));
  const dataUploaded = await Promise.all(dataBuffer);
  // console.log({ dataUploaded });
  return dataUploaded;
}

export default {
  upload,
  uploadWithBase64
};
