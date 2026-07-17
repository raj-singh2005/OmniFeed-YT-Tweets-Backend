import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  const healthStatus = {
    status: "OK",
    message: "Server is healthy and running smoothly",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, healthStatus, "Healthcheck passed successfully")
    );
});

export { healthcheck };
