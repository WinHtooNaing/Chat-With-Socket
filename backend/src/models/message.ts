import { Schema, model } from "mongoose";

export interface ChatMessage {
  username: string;
  message: string;
  sent_at: Date;
}

const messageSchema = new Schema<ChatMessage>(
  {
    username: {
      type: String,
      required: true,
      maxlength: 32,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

messageSchema.index({ sent_at: 1 });

const messageModel = model<ChatMessage>("Message", messageSchema);

export default messageModel;
