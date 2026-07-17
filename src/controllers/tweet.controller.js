import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
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
  //Destructure tweetId from req.params and content from req.body
  //Check if tweetId matches a valid MongoDB ObjectId structure (400 guard)
  //Validate content (ensure it exists and isn't just empty spaces)
  //Find the tweet document in MongoDB (404 guard)
  //Verify authorization (Check if logged-in user owns the tweet - 403 lock)
  //Update tweet.content and save using { validateBeforeSave: false }
  //Return a 200 OK success response along with the updated tweet details

  const { tweetId } = req.params || {};
  const { content } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "tweetId is not valid");
  }

  if (!content.trim()) {
    throw new ApiError(400, "content is required");
  }
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "this tweet does not exist");
  }

  if (!(tweet.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are unathorized to update this tweet");
  }

  if (content.trim() && tweet) {
    tweet.content = content;
  }

  const updatedTweet = await tweet.save({ validateBeforeSave: false });

  if (!updatedTweet) {
    throw new ApiError(500, "tweet updation failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //Destructure tweetId from req.params
  //Validate if tweetId is a correct MongoDB ObjectId structure
  //Find the tweet document in MongoDB (404 guard)
  //Verify authorization (Check if logged-in user owns the tweet - 403 lock)
  //Delete the tweet document using Tweet.findByIdAndDelete or tweet.deleteOne()
  //Return a 200 OK success response confirming the deletion

  const { tweetId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "tweetId is not valid");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "tweet does not exist");
  }

  if (!(tweet.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are unathorized to delete this tweet");
  }
  let deletedTweet;
  if (tweet) {
    deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  }

  if (!deletedTweet) {
    throw new ApiError(500, "tweet deletion failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "tweet deleted succesfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
