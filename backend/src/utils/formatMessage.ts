export const format = (username: string, message: string) => {
  return {
    username,
    message,
    sent_at: Date.now(),
  };
};
