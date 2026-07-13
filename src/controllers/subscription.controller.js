import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  //Destructure channelId from req.params
  //Validate if channelId is a valid MongoDB ObjectId
  //Prevent self-subscribing (Check if channelId matches req.user?._id)
  //Check if the channel user actually exists in the database (404 guard)
  //Query Subscription to find if a record already exists matching:
  //    { subscriber: req.user?._id, channel: channelId }
  //IF IT EXISTS: Delete the document (Unsubscribe) and return a 200 OK success message
  //IF IT DOES NOT EXIST: Create a new Subscription document (Subscribe) and return a 201 Created response

  const { channelId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "channelId is not valid");
  }
  if (channelId?.toString() === req.user?._id?.toString()) {
    throw new ApiError(400, "you cannot subscribe your own channel");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(
      404,
      "channel you are trying to subscribe does not exist "
    );
  }

  const subcriptionObject = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (subcriptionObject) {
    const deletedSubscription = await Subscription.findByIdAndDelete(
      subcriptionObject?._id
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedSubscription,
          "channel unsubscribed successfully"
        )
      );
  } else {
    const newSubscription = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, newSubscription, "channel subscribed succesfully")
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  //Destructure channelId from req.params with fallback object defense
  //Validate if channelId matches a valid MongoDB ObjectId structure (400 guard)
  //Build an aggregation pipeline:
  //$match matching the channel field. wrap it with `new mongoose.Types.ObjectId(channelId)`!
  //$lookup to join the "users" collection (localField: "subscriber", foreignField: "_id", as: "subscriberDetails")
  //$unwind or $project to extract and clean the user profiles (keep username, fullName, avatar; drop password)
  //Execute the aggregation pipeline using await
  //Return a 200 OK success response wrapping the subscribers
  //controller to return channel list to which user has subscribed

  const { channelId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "channelId is not valid");
  }

  const subscriptionPipeline = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
  ]);

  if (!subscriptionPipeline.length) {
    return res.status(200)
    .json(
        new ApiResponse(200,[],"you have zero subscribers")
    )
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptionPipeline,
        "susbcribers fetched successfully "
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  //Destructure subscriberId from req.params with fallback object defense
  //Validate if subscriberId matches a valid MongoDB ObjectId structure (400 guard)
  //Build an aggregation pipeline:
  //$match matching the SUBSCRIBER field this time (new mongoose.Types.ObjectId(subscriberId))
  //$lookup to join the "users" collection (localField: "channel", foreignField: "_id", as: "channelDetails")
  //$addFields + $first to flatten the "channelDetails" array into an object
  //Execute the pipeline using await
  //Handle the 0-subscriptions case gracefully (200 OK with empty array [])
  //Return a 200 OK success response wrapping the full subscribed channels array
  const { _id } = req.user || {};
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new ApiError(400, "subscriberId is not valid");
  }

  const subscriptionPipeline = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
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
        channel: {
          $first: "$channel",
        },
      },
    },
  ]);

  if (!subscriptionPipeline.length) {
    return res.status(200)
    .json(
        new ApiResponse(200,[],"you do not have any subscribed channel")
    )
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptionPipeline,
        "susbcribed channels fetched successfully "
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
