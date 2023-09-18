import { File, UploadedFile } from "./file";

export interface FileUpload {
  upload: (files: File[]) => Promise<UploadedFile[]>;
}

export interface FileUploader {
  upload: (
    files: File | File[]
  ) => Promise<UploadedFile | UploadedFile[] | undefined>;
}