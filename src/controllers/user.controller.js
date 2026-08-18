import asyncHandler from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { json } from "express";
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
   const coverImageLocalPath =  req.files?.coverImage[0]?.path;

   if (!avatarLocalPath) {
    throw new ApiError(400,"Avtar file is required")
   }

   const avtar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!avtar) {
    throw new ApiError(400,"Avtar file is required")
   }
     const User = await User.create({
        fullName,
        avtar : avtar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowercase()

    })

    const createdUSer = await User.findById(username._id).select(
        "-password -refreshToken"
    )

    if (!createdUSer) {
        throw new ApiError(500, "Something went wrong while registering a user!")
    }

    return res.Status(201).json(
        new ApiResponse(200 , createdUSer , "User registered successfully")
    )

})

export {registerUser} ;