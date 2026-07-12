import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  extractPublicId,
  deleteFromCloudinary,
} from "../utils/cloudinary.service.js";

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
  //destructure title and description
  //check if title and description exists
  //get local paths for videoFile and thumnail
  //check if local path exists
  //upload videoFile on claudianry
  //check if video is uploaded or not
  //upload thumbnail on claudinary
  //create videoObject with secureUrl
  //search created video document in mongoDB
  //check if video document exists for not
  //return res

  const { title, description } = req.body || {};

  if (!title || !description) {
    throw new ApiError(400, "title and description is required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "videoFile and thumbnail is required");
  }

  const uploadedVideoFile = await uploadOnCloudinary(videoFileLocalPath);

  if (!uploadedVideoFile) {
    throw new ApiError(500, "VideoFile Upload failed");
  }

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!uploadedThumbnail) {
    if (uploadedVideoFile?.public_id) {
      await deleteFromCloudinary(uploadedVideoFile?.public_id, "video");
    }
    throw new ApiError(500, "thumbnail Upload failed");
  }

  const durationInMinutes = Number(uploadedVideoFile.duration) / 60;

  const newVideo = await Video.create({
    videoFile: uploadedVideoFile.secure_url,
    thumbnail: uploadedThumbnail.secure_url,
    owner: req.user?._id,
    title: title,
    description: description,
    duration: durationInMinutes,
  });

  const createdVideo = await Video.findById(newVideo?._id);
  if (!createdVideo) {
    throw new ApiError(501, "failed to publish video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid videoId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
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
  ]);

  if (!video.length) {
    throw new ApiError(404, "video does not exist ");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video fetched succesfully "));
});

const updateVideo = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params
  //Destructure title and description from req.body
  //Check if videoId is a valid MongoDB ObjectId structure
  //Find the video document in MongoDB
  //Check if the video document actually exists (404 guard)
  //Verify authorization (Check if logged-in user owns the video)
  //Capture local path for the new thumbnail if uploaded via Multer (req.file)
  //If new thumbnail exists, upload it to Cloudinary and check for failure
  //Extract public_id of the old thumbnail and delete it from Cloudinary
  //Save updated title, description, and new thumbnail URL to the document
  //Save the document and return the updated video response

  const { videoId } = req.params || {};
  const { title, description } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video with this VideoId does not exist");
  }

  if (!(video.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are not authorized to update this video");
  }

  const thumbnailLocalPath = req.file?.path;
  let uploadedThumbnail;
  if (thumbnailLocalPath) {
    uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!uploadedThumbnail?.secure_url) {
      throw new ApiError(
        500,
        "Failed to upload new thumbnail to cloud storage"
      );
    }
  }

  if (uploadedThumbnail) {
    if (video.thumbnail) {
      const oldPublicId = extractPublicId(video.thumbnail);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, "image");
        console.log("old thumbnail deleted successfully");
      }
    }
  }

  if (title) {
    video.title = title;
  }
  if (description) {
    video.description = description;
  }

  if (uploadedThumbnail) {
    video.thumbnail = uploadedThumbnail?.secure_url;
  }

  const updatedVideo = await video.save({validateBeforeSave:false});

  if (!updatedVideo) {
    throw new ApiError(500, "video Update failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, updatedVideo, "video updated succesfully "));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params
  //Check if videoId is a valid MongoDB ObjectId structure
  //Find the video document in MongoDB
  //Check if the video document actually exists (404 guard)
  //Verify authorization (Check if logged-in user owns the video)
  //Delete the video document from the MongoDB database FIRST (Database-First Pattern)
  //Check if database deletion succeeded, then extract public_id of the video file and delete it from Cloudinary as "video"
  //Extract public_id of the thumbnail file and delete it from Cloudinary as "image" (Wrapped in try/catch guard)
  //Return a success response confirming the deletion

  const { videoId } = req.params || {};

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video does not exist");
  }

  if (!(video.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are not authorized to delete this video");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(500, "video document deletion failed");
  } else {
    try {
      if (deletedVideo?.videoFile) {
        const videoPublicId = extractPublicId(deletedVideo?.videoFile);
        if (videoPublicId) {
          await deleteFromCloudinary(videoPublicId, "video");
        }
      }

      if (deletedVideo?.thumbnail) {
        const thumbnailPublicId = extractPublicId(deletedVideo?.thumbnail);
        if (thumbnailPublicId) {
          await deleteFromCloudinary(thumbnailPublicId, "image");
        }
      }
    } catch (error) {
      console.error(
        "CRITICAL: Video doc deleted from DB, but Cloudinary asset cleanup failed:",
        error
      );
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        deletedVideo,
        "Video and associated assets deleted successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params
  //Check if videoId is a valid MongoDB ObjectId structure
  //Find the video document in MongoDB
  //Check if the video document actually exists (404 guard)
  //Verify authorization (Check if logged-in user owns the video)
  //Toggle the isPublished boolean field value value (invert it)
  //Save the updated document bypassing strict schema checks
  //Return a success response with the updated video details

  const { videoId } = req.params || {};

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video does not exist");
  }

  if (!(video.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(
      403,
      "you are not authorized to update visibilty of this video"
    );
  }

  video.isPublished = !video.isPublished;

  const updatedVideo = await video.save({ validateBeforeSave: false });

  if (!updatedVideo) {
    throw new ApiError(500, "visibilty toggle failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, " visibility toggled successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
