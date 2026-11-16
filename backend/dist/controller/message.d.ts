import type { Request, Response } from "express";
export type MessagePayload = {
    id: string;
    username: string;
    message: string;
    sent_at: number;
};
type MessageInput = {
    username: string;
    message: string;
};
export declare function normalizeUsername(value: unknown): string | null;
export declare function parseMessageInput(value: unknown): MessageInput | null;
export declare function persistMessage(username: string, message: string): Promise<MessagePayload>;
export declare const getMessages: (req: Request, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=message.d.ts.map