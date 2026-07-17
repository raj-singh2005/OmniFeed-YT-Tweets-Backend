import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params with fallback object defense
  //Validate if videoId is a valid MongoDB ObjectId structure (400 guard)
  //Read 'page' and 'limit' from req.query with default values (page=1, limit=10)
  //Build the aggregation pipeline on the Comment model:
  //    - $match: Filter where video matches videoId
  //    - $lookup: Join the 'users' collection to get comment author info (from: "users", localField: "owner", foreignField: "_id", as: "owner")
  //    - $addFields + $first: Flatten the "owner" array into a single object
  //    - $project: Keep the comment content and timestamps, while project-limiting owner fields to username, fullName, and avatar
  //    - $sort: Sort comments by newest first (createdAt: -1)
  //Set up the paginationOptions object parsing page and limit to Numbers
  //Execute using await Comment.aggregatePaginate(commentPipeline, paginationOptions)
  //Return a 200 OK success response wrapping the pagination result inside ApiResponse
  const { videoId } = req.params || {};
  const { page = 1, limit = 10 } = req.query || {};

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "video Id is not valid");
  }

  const commentPipeline = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
        createdAt: -1,
      },
    },
  ]);

  const paginationOptions = {
    page: Number(page),
    limit: Number(limit),
  };

  const videoComments = await Comment.aggregatePaginate(
    commentPipeline,
    paginationOptions
  );

  if (videoComments && !videoComments.docs?.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, [], "there is no comments in this video yet ")
      );
  }

  if (!videoComments) {
    throw new ApiError(500, "comments pagination process failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoComments, "comments fetched succesfully"));
});

const addComment = asyncHandler(async (req, res) => {
  //Destructure videoId from req.params with fallback object defense
  //Extract 'content' string from req.body with fallback object defense
  //Validate if videoId matches a valid MongoDB ObjectId structure (400 guard)
  //Check if content string is empty or contains only spaces after using .trim() (400 guard)
  //Create a new Comment document in the database mapping:
  //    { content: content.trim(), video: videoId, owner: req.user?._id }
  //Return a 201 Created response wrapping the new comment document using ApiResponse

  const { videoId } = req.params || {};
  const { content } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "content is required");
  }

  const newComment = await Comment.create({
    video: videoId,
    content: content.trim(),
    owner: req.user?._id,
  });

  if (!newComment) {
    throw new ApiError(500, "comment upload failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "commnet uploaded successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  //Destructure commentId from req.params with fallback object defense
  //Extract 'content' string from req.body with fallback object defense
  //Validate if commentId matches a valid MongoDB ObjectId structure (400 guard)
  //Check if content string is empty or contains only spaces after using .trim() (400 guard)
  //Query the Comment document by its ID
  //Check if comment exists (404 guard) and verify ownership: comment.owner.toString() === req.user?._id.toString() (403 guard)
  //Update the content field with the trimmed value and save()
  //Return a 200 OK response wrapping the updated comment document inside ApiResponse

  const { commentId } = req.params || {};
  const { content } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment Id is not valid");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "content is required");
  }

  const commentDoc = await Comment.findById(commentId);

  if (!commentDoc) {
    throw new ApiError(404, "comment youre trying to update does not exist ");
  } else {
    if (!(commentDoc?.owner?.toString() === req.user?._id?.toString())) {
      throw new ApiError(403, "you are unathorized to update this comment ");
    }
  }

  commentDoc.content = content.trim() ;
 const updatedComment =  await commentDoc.save({validateBeforeSave : false})

 if(!updatedComment){
    throw new ApiError(500,"comment updation failed")
 }

 return res.status(200).json(
    new ApiResponse(200,updatedComment,"comment updated successfully")
 )


});

const deleteComment = asyncHandler(async (req, res) => {
  //Destructure commentId from req.params with fallback object defense
  //Validate if commentId matches a valid MongoDB ObjectId structure (400 guard)
  //Query the Comment document by its ID
  //Check if comment exists (404 guard) and verify ownership: comment.owner.toString() === req.user?._id.toString() (403 guard)
  //Delete the document using commentDoc.deleteOne() or Comment.findByIdAndDelete(commentId)
  //Return a 200 OK success response wrapping a success message inside ApiResponse

  const {commentId} = req.params || {} 
  if(!mongoose.Types.ObjectId.isValid(commentId)){
    throw new ApiError(400,"commentId is not valid")
  }

  const comment = await Comment.findById(commentId) ;

  if(!comment){
    throw new ApiError(404,"comment you want to delete does not exist")
  }

  if(!(comment?.owner?.toString() === req.user?._id?.toString())){
    throw new ApiError(403,"you are unathorized to delete this comment ")
  }
  const deletedComment = await Comment.findByIdAndDelete(commentId) ;

  if(!deletedComment){
    throw new ApiError(500,"comment deletion failed")
  }

  return res.status(200).json(
    new ApiResponse(200,deletedComment,"comment deleted successfully")
  )
});

export { getVideoComments, addComment, updateComment, deleteComment };
