import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  //reading input from query params
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query; //desc = newest first

  //FEATURE 1: THE HOME PAGE (Default State)
  const filterConditions = {
    isPublished: true,
  };

  //FEATURE 2: THE GLOBAL SEARCH BAR
  if (query) {
    filterConditions.$or = [
      {
        title: {
          $regex: query,
          $options: "i",
        },
      },
      {
        description: {
          $regex: query,
          $options: "i",
        },
      },
    ];
  }
  // filter by owner
  //FEATURE 3: CREATOR CHANNEL PAGE
  //FEATURE 4: SEARCHING INSIDE A SPECIFIC CHANNEL
  if (userId) {
    filterConditions.owner = new mongoose.Types.ObjectId(userId);
  }
  //video aggregation pipeline
  const videoPipeline = Video.aggregate([
    {
      $match: filterConditions,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $project: {
        ownerDetails: 0, //dropping ownerdetails array
        "owner.password": 0,
        "owner.refreshToken": 0,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const paginationOptions = {
    page: Number(page),
    limit: Number(limit),
  };

  const result = await Video.aggregatePaginate(
    videoPipeline,
    paginationOptions
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched succesfully "));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
