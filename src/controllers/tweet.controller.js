import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //Destructure content from req.body
  //Validate content (ensure it exists and isn't just empty spaces)
  //Create the Tweet document in the database, setting the owner to req.user._id
  //Check if the tweet document was successfully created (500 execution guard)
  //Return a 201 Created success response along with the newly created tweet object

  const { content } = req.body || {};

  if (!content?.trim()) {
    throw new ApiError(400, "content is required");
  }

  const newTweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });

  if (!newTweet) {
    throw new ApiError(500, "post creation failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newTweet, "post created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // 1. Destructure userId from req.params and pagination config from req.query
  // 2. Validate if userId matches a correct MongoDB ObjectId structure
  // 3. Initialize an unawaited Mongoose Aggregate query builder instance matching owner fields
  // 4. Wrap numerical pagination options safely using Number casting
  // 5. Hand the pipeline builder directly over to aggregatePaginate to run execution
  // 6. Apply a 404 guard for empty document feeds and a 500 guard for empty runtime objects
  // 7. Return a 200 OK success response wrapped with full paginated metadata results
  const { userId } = req.params || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query || {}; //desc = newest first

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "userId is not valid");
  }

  const tweetPipeline = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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

  const result = await Tweet.aggregatePaginate(
    tweetPipeline,
    paginationOptions
  );

  if (result && result.docs.length === 0) {
    throw new ApiError(404, "No community posts found for this user");
  }

  if (!result) {
    throw new ApiError(
      500,
      "Internal server error during post pagination processing"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "posts fetched succesfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
