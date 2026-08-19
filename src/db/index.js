import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import "dotenv/config";


const connectDB = async()=>{
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDbconnected !! `);
        
    } catch (error) {
        console.log("MongoDb connection failed ", error);
        process.exit(1);
    }
}


export default connectDB;