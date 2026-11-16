export type ChatUser = { id: string; username: string };

const users = new Map<string, ChatUser>();

export const getUser = (id: string): ChatUser | undefined => users.get(id);

export const getOnlineUsers = (): string[] =>
  Array.from(users.values(), (user) => user.username);

export const saveUser = (
  id: string,
  username: string,
): ChatUser | undefined => {
  const existingUser = users.get(id);
  if (existingUser) return existingUser;

  const usernameInUse = Array.from(users.values()).some(
    (user) => user.username.toLowerCase() === username.toLowerCase(),
  );
  if (usernameInUse) return undefined;

  const user = { id, username };
  users.set(id, user);
  return user;
};

export const getDisconnectUser = (id: string): ChatUser | undefined => {
  const user = users.get(id);
  users.delete(id);
  return user;
};
