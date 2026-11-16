import { Schema, model } from "mongoose";
const messageSchema = new Schema({
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
}, { versionKey: false });
messageSchema.index({ sent_at: 1 });
const messageModel = model("Message", messageSchema);
export default messageModel;
//# sourceMappingURL=message.js.map