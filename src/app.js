import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(express.static(path.join(process.cwd(), "public")));

app.use(cookieParser());

//routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.router.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

// routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);

export { app };
