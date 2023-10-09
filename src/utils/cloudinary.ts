import cloudinary from 'cloudinary';
import config from '../config/config';
import ApiError from './ApiError';
import httpStatus from 'http-status';

const cloudinaryConfig = cloudinary.v2;

cloudinaryConfig.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.key,
  api_secret: config.cloudinary.secret,
})

export async function handleUpload(file: string) {
  try {
    const res = await cloudinaryConfig.uploader.upload(file, {
      resource_type: "auto",
    });
    // console.log({ res });
    return res;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error upload');
  }
}