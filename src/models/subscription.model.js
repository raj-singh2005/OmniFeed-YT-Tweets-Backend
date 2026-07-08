import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "subscriber is required"],
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "channel is required"],
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
