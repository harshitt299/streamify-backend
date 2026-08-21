import asyncHandler from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { json } from "express";


const generateAcceesTokenAndRefreshToken = async(userId)=>{
    try {
     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken =  user.generateRefreshToken()

     user.refreshToken = refreshToken
     await user.save({validateBeforeSave: false})

     return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating acces and refresh Token")
    }
}
const registerUser = asyncHandler ( async (req,res)=>{
 // get user details from frontend
 // validation- not empty
 // check if user already exists
 // check for images,check for avtar
 // uplo0ad them on cloudinary,avtar
 // create user obejxt in db
 //remove pass and refresh token field from response
 // check for user creation 
 // return response else throw error
 
const {fullName,username,email , password}=req.body;
    if (!username || !email || !fullName || !password) {
        throw new ApiError (400,"All fields are required!");
    }
    const existUser = await User.findOne({
        $or : [ {username} ,{email}]
    })
    if (existUser) {
        throw new ApiError(409, "User with eamil or username already exists")
    }

    const avatarLocalPath =req.files?.avtar[0]?.path
   //const coverImageLocalPath =  req.files?.coverImage[0]?.path;
    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

   if (!avatarLocalPath) {
    throw new ApiError(400,"Avtar file is required")
   }

   const avtar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!avtar) {
    throw new ApiError(400,"Avtar file is required")
   }
     const newUser = await User.create({
        fullName,
        avtar : avtar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUSer = await User.findById(newUser._id).select(
        "-password -refreshToken"
    )

    if (!createdUSer) {
        throw new ApiError(500, "Something went wrong while registering a user!")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUSer , "User registered successfully")
    )

});







const loginUser = asyncHandler(async(req,res)=>{

    const {username,email,password}=req.body;
    if (!username || !email) {
        throw new ApiError(400,"Username or email is required")
    };

    const user = await User.findOne({
        $or : [{username},{email}]
    });
    if(!user){
        throw new ApiError(404,"User does not exist")
    };

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    };

     const {accessToken ,refreshToken} =  await generateAcceesTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken, options)
    .json(
        new ApiResponse (200,
            {
                user: loggedInUser , accessToken, refreshToken
            },
            "User Logged in successfully"
        )
    )

});







const logoutUser = asyncHandler (async(req,res)=>{
    
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    );
    
    const options = {
        httpOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .clearCookie("accessToken" ,accessToken,options)
    .clearCookie("refreshToken" ,refreshToken,options)
    .json(new ApiResponse (200, "User logout successfully"))

});





export {registerUser , loginUser , logoutUser} ;