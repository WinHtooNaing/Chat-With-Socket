const users = new Map();
export const getUser = (id) => users.get(id);
export const getOnlineUsers = () => Array.from(users.values(), (user) => user.username);
export const saveUser = (id, username) => {
    const existingUser = users.get(id);
    if (existingUser)
        return existingUser;
    const usernameInUse = Array.from(users.values()).some((user) => user.username.toLowerCase() === username.toLowerCase());
    if (usernameInUse)
        return undefined;
    const user = { id, username };
    users.set(id, user);
    return user;
};
export const getDisconnectUser = (id) => {
    const user = users.get(id);
    users.delete(id);
    return user;
};
//# sourceMappingURL=user.js.map