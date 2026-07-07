import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import JWT from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // console.log("DEBUG TOKEN:", token, "| TYPE:", typeof token);

    if (
      !token ||
      typeof token !== "string" ||
      token.trim() === "" ||
      token === "undefined"
    ) {
      throw new ApiError(
        401,
        "Unauthorized request - Invalid token format received"
      );
    }

    const decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // next : discuss about frontend
      throw new ApiError(401, "invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, error?.message || "Invalid Access Token"));
  }
});

export { verifyJWT };
