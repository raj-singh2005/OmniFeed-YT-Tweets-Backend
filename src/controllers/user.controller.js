import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import {
  deleteFromCloudinary,
  extractPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { cacheManager } from "../redis/cache.utils.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went worng while generating refresh and  access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exist : username , email
  // check for images , check for avatar
  // upload them to cloudinary , avatar
  // create user object - create entry in object
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, email, password, username } = req.body || {};

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }
  let avatarLocalPath;
  if (req.files?.avatar?.[0]?.path) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  }

  // const coverImgaeLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  //upload on cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    username: username.toLowerCase(),
    coverImage: coverImage?.url || "",
    email: email.toLowerCase(),
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something Went Worng While Registering User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req.body  -> data
  // username or email
  // find the user
  // check password
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  //  if (!(email || username)) {
  //for login from username or email
  //   throw new ApiError(400, "username or email is required");
  // }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User LoggedIn SuccessFully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  const cacheKey = `user:profile:${req.user?.username?.toLowerCase()}`;
  cacheManager.delete(cacheKey);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "unathorized access request");
    }

    const decodedRefreshToken = JWT.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is used or expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "invalid refreshToken while refreshing access token "
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const user = await User.findById(req.user._id);
  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordCorrect) {
    throw new ApiError(401, "old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched succesfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body || {};

  if (!fullName && !email) {
    throw new ApiError(400, "Fullname , email is required");
  }

  const updateduser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  const cacheKey = `user:profile:${req.user?.username?.toLowerCase()}`;
  cacheManager.delete(cacheKey);
  return res
    .status(200)
    .json(
      new ApiResponse(200, updateduser, "account details updated successfully")
    );
});
//delete images after upload on cloud
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is Missing");
  }

  const currentUser = await User.findById(req.user?._id);
  const oldAvatarUrl = currentUser?.avatar;

  const newAvatar = await uploadOnCloudinary(avatarLocalPath);
  if (!newAvatar.url) {
    throw new ApiError(400, "Error While Uploading New Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: newAvatar.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (oldAvatarUrl) {
    const oldPublicId = extractPublicId(oldAvatarUrl);
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId).catch((err) =>
        console.error(
          `Background asset deletion failed for publicId [${oldPublicId}]:`,
          err
        )
      );
    }
  }

  const cacheKey = `user:profile:${req.user?.username?.toLowerCase()}`;
  cacheManager.delete(cacheKey);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage File is Missing");
  }

  const currentUser = await User.findById(req.user?._id);
  const oldCoverImageUrl = currentUser?.coverImage;

  const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!newCoverImage.url) {
    throw new ApiError(400, "Error While Uploading Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: newCoverImage.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  const oldPublicId = extractPublicId(oldCoverImageUrl);
  if (user?.coverImage) {
    const oldPublicId = extractPublicId(oldCoverImageUrl);
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId).catch((err) =>
        console.error(
          `Background asset deletion failed for publicId [${oldPublicId}]:`,
          err
        )
      );
    }
  }

  const cacheKey = `user:profile:${req.user?.username?.toLowerCase()}`;
  cacheManager.delete(cacheKey);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Usrename is MIssing");
  }

  const isOwnerRequest =
    req.user?.username?.toLowerCase() === username?.toLowerCase();
  const cacheKey = `user:profile:${username?.toLowerCase()}`;

  if (isOwnerRequest) {
    const cachedResult = await cacheManager.get(cacheKey);
    if (cachedResult) {
      console.log("⚡ [Redis Cache Hit]: Serving channel profile to the owner");
      return res.status(cachedResult.statusCode).json(cachedResult);
    }
    console.log("🐢 [Redis Cache Miss]: Loading channel profile from MongoDB");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subsriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      },
    },
  ]);
  //console.log channel

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  if (isOwnerRequest) {
    cacheManager.set(cacheKey, channel[0], 1800); // Cached for 30 mins
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const addToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params || {};

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id Format ");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video Does Not Exists In Our Database");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: {
        watchHistory: videoId,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  video.views += 1;
  await video.save({ validateBeforeSave: false });

  cacheManager.delete(`user:history:${req.user?._id}`);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "Video added to watchHistory Succesfully"
      )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const cacheKey = `user:history:${req.user?._id}`;

  const cachedResult = await cacheManager.get(cacheKey);
  if (cachedResult) {
    console.log("⚡ [Redis Cache Hit]: Serving watch history from memory");
    return res.status(cachedResult.statusCode).json(cachedResult);
  }

  console.log(
    "🐢 [Redis Cache Miss]: Fetching nested watch history from MongoDB"
  );
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (user?.[0]?.watchHistory) {
    cacheManager.set(cacheKey, user[0].watchHistory, 300);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory Fetched succesfully "
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  addToWatchHistory,
};
