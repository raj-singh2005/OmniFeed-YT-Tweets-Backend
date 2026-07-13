import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params
  //Validate if videoId is a valid MongoDB ObjectId
  //Query the Like collection to see if a record already exists:
  //{ video: videoId, likedBy: req.user?._id }
  //IF IT EXISTS: Delete the document (unlike) and return a 200 response
  //IF IT DOES NOT EXIST: Create a new Like document and return a 201 response

  const { videoId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const likeDoc = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (likeDoc) {
    const deletedLikeDoc = await Like.findByIdAndDelete(likeDoc?._id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLikeDoc, "video unliked successfully"));
  } else {
    const newLikeDoc = await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newLikeDoc, "video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "commentId is not valid");
  }

  const likeDoc = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (likeDoc) {
    const deletedLikeDoc = await Like.findByIdAndDelete(likeDoc?._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedLikeDoc, "comment unliked successfully")
      );
  } else {
    const newLikeDoc = await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newLikeDoc, "comment liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //Destructure tweetId from req.params with fallback object defense
  //Validate if tweetId is a valid MongoDB ObjectId structure (400 guard)
  //Query the Like collection to find if a record already exists matching:
  //    { tweet: tweetId, likedBy: req.user?._id }
  //IF IT EXISTS: Delete the document (Unlike) and return a 200 OK success message wrapping the deleted document using ApiResponse
  //IF IT DOES NOT EXIST: Create a new Like document (Like) and return a 201 Created response wrapping the new document using ApiResponse
  const { tweetId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "tweetId is not valid");
  }

  const likeDoc = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (likeDoc) {
    const deletedLikeDoc = await Like.findByIdAndDelete(likeDoc?._id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLikeDoc, "tweet unliked successfully"));
  } else {
    const newLikeDoc = await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newLikeDoc, "tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
