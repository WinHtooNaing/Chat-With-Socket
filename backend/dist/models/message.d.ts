export interface ChatMessage {
    username: string;
    message: string;
    sent_at: Date;
}
declare const messageModel: import("mongoose").Model<ChatMessage, {}, {}, {}, import("mongoose").Document<unknown, {}, ChatMessage, {}, import("mongoose").DefaultSchemaOptions> & ChatMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ChatMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export default messageModel;
//# sourceMappingURL=message.d.ts.map