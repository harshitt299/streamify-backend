import asyncHandler from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { json } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessTokenAndRefreshToken = async(userId)=>{
    try {
     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken =  user.generateRefreshToken()

     user.refreshToken = refreshToken
     await user.save({validateBeforeSave: false})

     return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh Token")
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
    if (!(username || email)) {
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

     const {accessToken ,refreshToken} =  await generateAccessTokenAndRefreshToken(user._id)

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
    .clearCookie("accessToken" ,options)
    .clearCookie("refreshToken" ,options)
    .json(new ApiResponse (200, "User logout successfully"))

});



const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incommingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError (401,"Unauthorized request")
    }
try {
    
        const decodedToken = jwt.verify(incommingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError (401,"Invalid Refresh Token")
        }
    
        if (incommingRefreshToken!==user?.refreshToken) {
         throw new ApiError(401,"Refresh Token is expired or used")   
        }
    
        const opitons = {
            httpOnly : true,
            secure : true,
        }
    
        const {accessToken ,newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,opitons)
        .cookie("refreshToken",newRefreshToken,opitons)
        .json(
            new ApiResponse (
                200,
                {accessToken,refreshToken : newRefreshToken},
                "Access token refresh"
            )
        )
} catch (error) {
    throw new ApiError(401 , error?.message || "Invalid refresh Token")
}

});




const changeCurrentPassword = asyncHandler (async(req,res)=>{
    const {oldPassword ,newPassword} = req.body;
    const user = User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password");
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false});

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "password changed successfully"))
});


const getCurrentUser = asyncHandler (async(req,res)=>{
    return res
    .status(200)
    .json(200, req.user , "current user fetched successfully")
});


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName , email} = req.body;
    if(!fullName || !email){
        throw new ApiError (400 ,"All fields are required")
    };

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
               email ,
               fullName
            }
        },
        {new : true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse (200 ,user , "Account details updated"))

});


const updateUserAvtar = asyncHandler (async(req,res)=>{
    const avtarLocalPath = req.file?.path;
    if (!avtarLocalPath) {
         throw new ApiError (400 ,"Avtar file missing")
    }
    const avatr = await uploadOnCloudinary(avtarLocalPath)

    if(!avatr.url){
        throw new ApiError (400 ,"Something went wrong while uploading avtar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
             $set :{
                avatr : avatr.url
            },
            
        },
        {new:true},
    ).select("-password")

    return res
    .status(200)
    .json(new ApiError(200, user , "Avtar updated successfully"))

});

const updateUserCoverImage = asyncHandler (async(req,res)=>{
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
         throw new ApiError (400 ,"Cover Image file missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImageLocalPath.url){
        throw new ApiError (400 ,"Something went wrong while uploading avtar")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
             $set :{
                coverImage : coverImage.url
            },
            
        },
        {new:true},
    ).select("-password")

     return res
    .status(200)
    .json(new ApiError(200, user , "Cover Image updated successfully"))


}); 

const getUserChannel =asyncHandler(async(req,res)=>{
    const {username} = req.params;
    if (!username?.trim()) {
        throw new ApiError(400,"username is missing");
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            // channel subscribers
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        { 
            // channels u subscribed
            $lookup : {
                 from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        }, 
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]},
                        then : true,
                        else : false,
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribedToCount : 1,
                 isSubscribed : 1,
                 coverImage : 1,
                 avtar : 1,
                 email : 1,



            }
        }
    ]);

    console .log(channel);
    if (!channel?.length) {
        throw new ApiError(400, "channel does not exits")
    }

    return res 
    .status(200)
    .json(
        new ApiResponse(200, channel[0],"User channel fetched successfully")
    )

});

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            form : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline:[{
                                $project : {
                                    fullName:1,
                                    username :1,
                                    avatr:1,
                                }
                            },
                            {
                                $addFields : {
                                    owner : {
                                        $first : "$owner"
                                    }
                                }
                            }
                        ]
                        }
                    }
                ]
            }
        }
    ])


    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export {registerUser ,
    loginUser , 
    logoutUser ,
    refreshAccessToken ,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvtar,
    updateUserCoverImage,
    getUserChannel,
    getWatchHistory,
    } ;