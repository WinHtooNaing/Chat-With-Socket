export type ChatUser = {
    id: string;
    username: string;
};
export declare const getUser: (id: string) => ChatUser | undefined;
export declare const getOnlineUsers: () => string[];
export declare const saveUser: (id: string, username: string) => ChatUser | undefined;
export declare const getDisconnectUser: (id: string) => ChatUser | undefined;
//# sourceMappingURL=user.d.ts.map