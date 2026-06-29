import "./config.js";

import connectDB from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`server is running on port : ${PORT}`);
    });

    server.on("error", (err) => {
      console.log("Error", err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection Failed", err);
    process.exit(1);
  });
