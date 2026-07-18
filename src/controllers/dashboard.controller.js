import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cacheManager } from "../redis/cache.utils.js";

const getChannelStats = asyncHandler(async (req, res) => {
  //1. Grab the channel/user ID from req.user?._id (Ensure user is authenticated)
  //2. Enforce authentication check; throw a 401 Unauthorized guard if userId is missing
  //3. Run an aggregation pipeline on the Video model matching documents where owner equals userId
  //4. Use $facet to split into independent streams: video metrics (count/views), likes ($lookup + $unwind), and subscribers
  //5. Reshape the facet arrays using $project to extract flat values or fallback to 0 using $ifNull
  //6. Handle edge case fallback: if totalVideos is 0, count subscriptions directly via countDocuments
  //7. Return a 200 OK response wrapping the stats object inside ApiResponse

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const channelStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $facet: {
        videoMetrics: [
          {
            $group: {
              _id: null,
              totalVideos: { $sum: 1 },
              totalViews: { $sum: "$views" },
            },
          },
        ],
        likeMetrics: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "videoLikes",
            },
          },
          {
            $unwind: "$videoLikes",
          },
          {
            $count: "totalLikes",
          },
        ],
        subscriberMetrics: [
          {
            $lookup: {
              from: "subscriptions",
              pipeline: [
                {
                  $match: {
                    channel: new mongoose.Types.ObjectId(userId),
                  },
                },
                {
                  $count: "totalSubscribers",
                },
              ],
              as: "subscriberCount",
            },
          },
          {
            $unwind: {
              path: "$subscriberCount",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: null,
              totalSubscribers: { $first: "$subscriberCount.totalSubscribers" },
            },
          },
        ],
      },
    },
    {
      $project: {
        totalVideos: {
          $ifNull: [{ $arrayElemAt: ["$videoMetrics.totalVideos", 0] }, 0],
        },
        totalViews: {
          $ifNull: [{ $arrayElemAt: ["$videoMetrics.totalViews", 0] }, 0],
        },
        totalLikes: {
          $ifNull: [{ $arrayElemAt: ["$likeMetrics.totalLikes", 0] }, 0],
        },
        totalSubscribers: {
          $ifNull: [
            { $arrayElemAt: ["$subscriberMetrics.totalSubscribers", 0] },
            0,
          ],
        },
      },
    },
  ]);

  const stats = channelStats[0] || {
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalSubscribers: 0,
  };

  if (stats.totalVideos === 0) {
    const subCount = await Subscription.countDocuments({ channel: userId });
    stats.totalSubscribers = subCount;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, stats, "Channel statistics retrieved successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  //1. Destructure channelId from req.params with fallback object defense
  //2. Validate if channelId matches a valid MongoDB ObjectId structure (400 guard)
  //3. Fetch all Video documents where the owner field matches the validated channelId
  //4. Return a 200 OK response wrapping the array of videos inside ApiResponse

  const channelId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "channelId is invalid");
  }

  const cacheKey = `dashboard:videos:${channelId}`;

  const cachedResult = await cacheManager.get(cacheKey);
  if (cachedResult) {
    console.log("redis cache hit in get channel videos");
    return res.status(cachedResult.statusCode).json(cachedResult);
  }
  console.log("redis miss in get channel videos !! moving to mongoDB");

  const videos = await Video.find({
    owner: channelId,
  });
  cacheManager.set(cacheKey, videos, 1800);
  if (!videos?.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No videos found for this channel"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
