import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //1. Extract 'name' and 'description' from req.body with fallback object defense
  //2. Verify both strings are present and not empty after applying .trim() (400 guard)
  //3. Instantiate the Playlist document mapping: { name: name.trim(), description: description.trim(), owner: req.user?._id, videos: [] }
  //4. Perform a 500 safety check to confirm the creation succeeded
  //5. Return a 201 Created response wrapping the new playlist inside ApiResponse

  const { name, description } = req.body || {};
  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "name and description are required");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user?._id,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(500, "playlist creation failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  //1. Destructure userId from req.params with fallback object defense
  //2. Validate if userId matches a valid MongoDB ObjectId structure (400 guard)
  //3. Fetch all Playlist documents where the owner field equals the validated userId
  //4. Return a 200 OK response wrapping the array of playlists inside ApiResponse

  const { userId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "userId is invalid");
  }

  const playlists = await Playlist.find({
    owner: userId,
  });

  if (!playlists.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "404 ! no playlist found for this user "));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "playlists fetched successfuly"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //1. Destructure playlistId from req.params with fallback object defense
  //2. Validate if playlistId matches a valid MongoDB ObjectId structure (400 guard)
  //3. Fetch the Playlist document by its ID
  //4. Check if the playlist exists (404 guard)
  //5. Return a 200 OK response wrapping the playlist document inside ApiResponse
  const { playlistId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playList Id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "playlist you want access does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  //Destructure 'playlistId' and 'videoId' from req.params with fallback object defense
  //Validate both IDs match valid MongoDB ObjectId structures (400 guard)
  //Fetch the Playlist document by its ID and confirm it exists (404 guard)
  //Verify ownership: playlist.owner.toString() === req.user?._id.toString() (403 guard)
  //Check if the videoId is already inside the playlist's videos array to prevent duplicates (400 guard)
  //   Hint: Use .includes() on the array, but remember to convert IDs to strings first!
  //Push the videoId into the playlist.videos array and save() the document
  //Return a 200 OK response wrapping the updated playlist inside ApiResponse
  const { playlistId, videoId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is not valid");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist with this PlaylistId does not exist");
  }

  if (!(playlist.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(
      403,
      "you are unathorized to add video in this playlist"
    );
  }

  const stringVideoIds = playlist.videos.map((id) => id.toString());
  if (stringVideoIds.includes(videoId.toString())) {
    throw new ApiError(400, "video already exists");
  } else {
    playlist.videos?.push(videoId.toString());
  }

  const updatedPlaylist = await playlist.save({validateBeforeSave:false});

  if (!updatedPlaylist) {
    throw new ApiError(500, "video adding to playlist process failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "video added to playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  //1. Destructure 'playlistId' and 'videoId' from req.params with fallback object defense
  //2. Validate both IDs match valid MongoDB ObjectId structures (400 guard)
  //3. Fetch the Playlist document by its ID and confirm it exists (404 guard)
  //4. Verify ownership: playlist.owner.toString() === req.user?._id.toString() (403 guard)
  //5. Use Playlist.findByIdAndUpdate with a atomic $pull operator to slice out the target videoId
  //   Example: { $pull: { videos: videoId } }, with { new: true } to get the updated document back
  //6. Return a 200 OK response wrapping the updated playlist inside ApiResponse

  const { playlistId, videoId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is not valid");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist with this PlaylistId does not exist");
  }

  if (!(playlist.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(
      403,
      "you are unathorized to remove video in this playlist"
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "video removal from playlist failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "video removed from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  //1. Destructure playlistId from req.params with fallback object defense
  //2. Validate if playlistId matches a valid MongoDB ObjectId structure (400 guard)
  //3. Fetch the Playlist document by its ID and confirm it exists (404 guard)
  //4. Verify ownership: playlist.owner.toString() === req.user?._id.toString() (403 guard)
  //5. Delete the document out of the database using Playlist.findByIdAndDelete(playlistId)
  //6. Return a 200 OK response wrapping a success message inside ApiResponse

  const { playlistId } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "playlist youre trying to delete does not exist");
  }

  if (!(playlist.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are unauthorized to delete this playlist");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist) {
    throw new ApiError(500, "playlist deletion failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedPlaylist, "playlist deleted successfuly")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //1. Destructure playlistId from req.params with fallback object defense
  //2. Extract 'name' and 'description' from req.body with fallback object defense
  //3. Validate if playlistId matches a valid MongoDB ObjectId structure (400 guard)
  //4. Verify at least one field (name or description) is provided and not empty after .trim() (400 guard)
  //5. Fetch the Playlist document by its ID and confirm it exists (404 guard)
  //6. Verify ownership: playlist.owner.toString() === req.user?._id.toString() (403 guard)
  //7. Update fields dynamically or use findByIdAndUpdate to push the trimmed updates
  //8. Return a 200 OK response wrapping the updated playlist inside ApiResponse
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "name or description are required");
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlistId is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "playlist does not exist");
  }

  if (!(playlist.owner?.toString() === req.user?._id?.toString())) {
    throw new ApiError(403, "you are unauthorized to update this playlist");
  }

  if (name?.trim()) {
    playlist.name = name.trim();
  }

  if (description?.trim()) {
    playlist.description = description.trim();
  }

  const updatedPlaylist = await playlist.save({ validateBeforeSave: false });

  if (!updatedPlaylist) {
    throw new ApiError(500, "playlist updation failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
