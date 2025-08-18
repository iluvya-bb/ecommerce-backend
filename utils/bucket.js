import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { loadConfig } from "../configs/config.js";
const conf = loadConfig();

const s3 = new S3Client({
  region: conf.aws.region, // Change this to your region
  credentials: {
    accessKeyId: conf.aws.accessKeyId,
    secretAccessKey: conf.aws.secretAccessKey,
  },
});

const BUCKET_NAME = conf.aws.s3Bucket;

export const uploadLocalFile = async (filePath, key) => {
  console.log(`Attempting to upload file from ${filePath} to S3 with key ${key}`);

  const fileStream = await fs.createReadStream(filePath);

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: "application/octet-stream",
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    console.log(`File uploaded successfully: ${key}`);
  } catch (error) {
    console.error("Error uploading file:", error);
  }
};

export const getSignedUrlForFile = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
    console.log(`Signed URL: ${url}`);
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
  }
};

export const listFiles = async () => {
  const command = new ListObjectsCommand({
    Bucket: BUCKET_NAME,
  });

  try {
    const { Contents } = await s3.send(command);
    console.log("Files in bucket:");
    Contents.forEach((file) => console.log(file.Key));
  } catch (error) {
    console.error("Error listing files:", error);
  }
};

export const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3.send(command);
    console.log(`File deleted successfully: ${key}`);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};

export const deleteDirectory = async (s3Path) => {
  const listParams = {
    Bucket: BUCKET_NAME,
    Prefix: s3Path,
  };

  const listedObjects = await s3.send(new ListObjectsV2Command(listParams));

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.send(new DeleteObjectCommand(deleteParams));
};

export const uploadDirectory = async (directoryPath, s3Path) => {
  const files = fs.readdirSync(directoryPath);
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const fileKey = `${s3Path}/${file}`;
    if (fs.lstatSync(filePath).isDirectory()) {
      await uploadDirectory(filePath, fileKey);
    } else {
      await uploadLocalFile(filePath, fileKey);
    }
  }
};