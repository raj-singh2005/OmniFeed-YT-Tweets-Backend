import { v2 as cloudinary } from "cloudinary";
import { unlinkSync } from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("File is Uploaded on Cloudinary", response.url);
     unlinkSync(localFilePath)
    return response;

   
  } catch (error) {
    unlinkSync(localFilePath); // remove the locally saved temporary file as the upload failed
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Cloudinary file deletion failed:", error);
    return null;
  }
};

const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    const publicId = url
      .split("/upload/")[1]       // Get everything after '/upload/'
      .split("/")                 // Split into array
      .slice(1)                   // Drop the version string (e.g., 'v12345')
      .join("/")                  // Join back the remaining path
      .split(".")[0];             // Strip file extension (.jpg/.png)
      
    return publicId;
  } catch (error) {
    console.error("Failed to extract Cloudinary public ID:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary ,extractPublicId };
