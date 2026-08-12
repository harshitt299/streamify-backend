import connectDB from "./db/index.js";
import { app } from "./app.js";



connectDB()
.then(()=>{
    app.listen(process.env.PORT||7000 ,()=>{
        console.log(`Server is running on Port ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("MongoDB connection failed!!" ,error)
})