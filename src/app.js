import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import redis from "./redis/redis.js";

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
import tweetRouter from "./routes/tweet.routes.js";
import healthcheckRouter from "./routes/healthCheck.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/healthCheck", healthcheckRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// //redis testing endpoints

// app.get("/api/v1/cache-test",async (req,res)=>{
//   await redis.setex("framework",60,"express.js") ;
//   return res.json({
//     message : "data successfully saved to redis for the 60 sescs"
//   })
// }) ;

// app.get("/api/v1/get-test",async (req,res) => {
//   const cachedValue = await redis.get("framework") ;

//   if(!cachedValue){
//     return res.json({
//       message : "Cache Miss ! The data has expired or doesnt exist" 
//     })
//   }

//   return res.json({
//     message : "cahche Hit" ,
//     data : cachedValue
//   })
// })

export { app };
