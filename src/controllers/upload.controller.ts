import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { handleUpload } from '../utils/cloudinary';
import path from "path";
import { File } from '../types/file';

const upload = catchAsync(async (req, res) => {
  const files = req.files as File[];
  const dataBuffer = files?.map((file) => {
    const currentBuffer = Buffer.from(file.buffer).toString("base64");
    const ext = path.extname(file.originalname).split(".")[1];
    const dataUri = `data:image/${ext};base64,${currentBuffer}`;
    return handleUpload(dataUri);
  });
  const data = await Promise.all(dataBuffer);
  console.log({ data })
  res.status(httpStatus.CREATED).send({ data });
});

export default {
  upload
};
