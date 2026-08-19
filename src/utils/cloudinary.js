import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.CLOUD_API_KEY,
    api_secret : process.env.CLOUD_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if (!localFilePath) return null 
        
  // upload on cloudinary
 let response = await cloudinary.uploader.upload(localFilePath, {
    resource_type : "auto"
 })
  // console.log("file upload succesfuly on cloudinary" ,response.url)
  fs.unlinkSync(localFilePath)
   return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  // remove file if uplopading got error
    }
}


export default uploadOnCloudinary;