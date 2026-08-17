import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"
const app = express();


app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true,
}));
app.use(express.json({limit:"20kb"}));   //--> allow to send or recieve json data fromat
app.use(express.urlencoded({extended:true, limit:"20kb"}));  //--> correct url based query and problems
app.use(express.static("public"));  // --> to view static files for all users
app.use(cookieParser());  //--> to manipulate cookie or doing operation on cokiee



// routes 

import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users/" , userRouter)






export {app};