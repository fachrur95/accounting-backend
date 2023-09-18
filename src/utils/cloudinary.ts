import cloudinary from 'cloudinary';
import config from '../config/config';

const cloudinaryConfig = cloudinary.v2;

cloudinaryConfig.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.key,
  api_secret: config.cloudinary.secret,
})

export async function handleUpload(file: string) {
  const res = await cloudinaryConfig.uploader.upload(file, {
    resource_type: "auto",
  });
  return res;
}