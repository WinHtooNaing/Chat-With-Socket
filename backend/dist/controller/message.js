import messageModel, {} from "../models/message.js";
const MAX_USERNAME_LENGTH = 32;
const MAX_MESSAGE_LENGTH = 2000;
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export function normalizeUsername(value) {
    if (typeof value !== "string")
        return null;
    const username = value.trim();
    if (username.length === 0 ||
        username.length > MAX_USERNAME_LENGTH ||
        /[\u0000-\u001f\u007f]/.test(username)) {
        return null;
    }
    return username;
}
export function parseMessageInput(value) {
    if (!isRecord(value))
        return null;
    const username = normalizeUsername(value.username);
    const message = typeof value.message === "string" ? value.message.trim() : "";
    if (!username || message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
        return null;
    }
    return { username, message };
}
function serializeMessage(message) {
    return {
        id: message._id.toString(),
        username: message.username,
        message: message.message,
        sent_at: message.sent_at.getTime(),
    };
}
export async function persistMessage(username, message) {
    const savedMessage = await messageModel.create({ username, message });
    return serializeMessage(savedMessage);
}
export const getMessages = async (req, res) => {
    const rawLimit = req.query.limit;
    let limit = 100;
    if (rawLimit !== undefined) {
        if (typeof rawLimit !== "string" ||
            !/^\d+$/.test(rawLimit) ||
            Number(rawLimit) < 1 ||
            Number(rawLimit) > 100) {
            res.status(400).json({ error: "limit must be an integer from 1 to 100." });
            return;
        }
        limit = Number(rawLimit);
    }
    try {
        const messages = await messageModel
            .find()
            .sort({ sent_at: -1, _id: -1 })
            .limit(limit)
            .exec();
        res.status(200).json(messages.reverse().map(serializeMessage));
    }
    catch (error) {
        console.error("Failed to load chat history:", error);
        res.status(500).json({ error: "Unable to load chat history." });
    }
};
//# sourceMappingURL=message.js.map