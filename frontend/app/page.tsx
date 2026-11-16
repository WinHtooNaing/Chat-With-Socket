"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  sent_at: number;
};

type SendMessageAck = { ok: true } | { ok: false; error: string };

interface ServerToClientEvents {
  message: (payload: unknown) => void;
  join_success: (payload: { username: string }) => void;
  join_error: (payload: { message: string }) => void;
  online_users: (payload: unknown) => void;
}

interface ClientToServerEvents {
  joined: (payload: { username: string }) => void;
  send_message: (
    message: string,
    acknowledge: (response: SendMessageAck) => void,
  ) => void;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8000";

function getTimestamp(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= 8.64e15
  ) {
    return value;
  }
  if (typeof value === "string" || value instanceof Date) {
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return Date.now();
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.username !== "string" ||
    typeof record.message !== "string"
  ) {
    return null;
  }

  const sent_at = getTimestamp(record.sent_at);
  const id = record.id ?? record._id;
  return {
    id:
      typeof id === "string"
        ? id
        : `${sent_at}-${record.username}-${Math.random()}`,
    username: record.username,
    message: record.message,
    sent_at,
  };
}

function mergeMessages(
  currentMessages: ChatMessage[],
  newMessages: ChatMessage[],
): ChatMessage[] {
  const messagesById = new Map<string, ChatMessage>();
  for (const message of [...currentMessages, ...newMessages]) {
    messagesById.set(message.id, message);
  }
  return Array.from(messagesById.values()).sort(
    (first, second) =>
      first.sent_at - second.sent_at || first.id.localeCompare(second.id),
  );
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`brand-mark${small ? " brand-mark-small" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75v5.5A2.75 2.75 0 0 1 16.25 15H12l-4.5 4v-4h-.75A2.75 2.75 0 0 1 4 12.25v-5.5A2.75 2.75 0 0 1 6.75 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="9.5" r="1" fill="currentColor" />
        <circle cx="12" cy="9.5" r="1" fill="currentColor" />
        <circle cx="15" cy="9.5" r="1" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [inputError, setInputError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [connectionError, setConnectionError] = useState("");
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!username) return;

    const historyController = new AbortController();
    const socket = io(socketUrl, { autoConnect: false }) as Socket<
      ServerToClientEvents,
      ClientToServerEvents
    >;
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connecting");
      setConnectionError("");
      socket.emit("joined", { username });
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
      setSending(false);
      setConnectionError("Connection lost. Reconnecting…");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
      setConnectionError("Could not connect to chat. Retrying…");
    });

    socket.on("join_success", () => {
      setConnectionStatus("connected");
      setConnectionError("");
      void fetch(`${socketUrl}/chat?limit=100`, {
        signal: historyController.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Chat history request failed.");
          const history: unknown = await response.json();
          if (!Array.isArray(history)) {
            throw new Error("Chat history response was invalid.");
          }
          const parsedHistory = history
            .map(normalizeMessage)
            .filter((message): message is ChatMessage => message !== null);
          setMessages((currentMessages) =>
            mergeMessages(currentMessages, parsedHistory),
          );
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          setConnectionError("Unable to load previous messages.");
        });
    });

    socket.on("join_error", ({ message }) => {
      setLoginError(message);
      setUsername("");
    });

    socket.on("online_users", (payload) => {
      if (
        Array.isArray(payload) &&
        payload.every((user) => typeof user === "string")
      ) {
        setOnlineUsers(payload);
      }
    });

    socket.on("message", (incoming) => {
      const message = normalizeMessage(incoming);
      if (message) {
        setMessages((currentMessages) =>
          mergeMessages(currentMessages, [message]),
        );
      }
    });

    socket.connect();
    return () => {
      historyController.abort();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = usernameInput.trim();
    if (trimmedUsername) {
      setConnectionStatus("connecting");
      setConnectionError("");
      setLoginError("");
      setMessages([]);
      setUsername(trimmedUsername);
    } else {
      setInputError("Please enter a username.");
    }
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = messageInput.trim();
    const socket = socketRef.current;
    if (!message || sending) return;
    if (!socket?.connected || connectionStatus !== "connected") {
      setConnectionError("Wait for the connection to return before sending.");
      return;
    }

    setSending(true);
    setConnectionError("");
    socket.timeout(10000).emit("send_message", message, (error, response) => {
      setSending(false);
      if (error) {
        setConnectionError("Message timed out. Please try sending it again.");
      } else if (!response?.ok) {
        setConnectionError(
          response?.error ?? "Your message could not be sent. Try again.",
        );
      } else {
        setMessageInput((currentMessage) =>
          currentMessage === message ? "" : currentMessage,
        );
      }
    });
  }

  if (!username) {
    return (
      <main className="login-page">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card">
          <div className="login-brand">
            <BrandMark />
            <span>gather</span>
          </div>
          <div className="login-content">
            <p className="eyebrow">YOUR SPACE TO CONNECT</p>

            <form className="login-form" onSubmit={handleLogin}>
              <label className="field-label" htmlFor="username">
                Your username
              </label>
              <input
                autoComplete="nickname"
                autoFocus
                className={`shadcn-input  !focus:border-red-500 ${inputError ? "border-red-500!" : "border-red-500"}`}
                id="username"
                maxLength={32}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="your name"
                value={usernameInput}
              />
              <span className="text-red-500 mt-2 text-sm">{inputError}</span>
              {loginError && (
                <p className="form-error" role="alert">
                  {loginError}
                </p>
              )}
              <button className="shadcn-button login-button" type="submit">
                Join the chat
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4.5 10h11m-4.5-4.5 4.5 4.5-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
            <p className="login-footnote">
              <span className="secure-dot" />
              Your name is all you need to get started
            </p>
          </div>
        </section>
        <p className="page-caption">A little closer, wherever you are.</p>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <section className="chat-window" aria-label="Chat application">
        <aside className="chat-sidebar">
          <div className="sidebar-brand">
            <BrandMark />
            <span>gather</span>
          </div>

          <div className="sidebar-section channel-section">
            <p className="sidebar-heading">CHANNELS</p>
            <div className="channel-button active" aria-current="page">
              <span className="hash-mark">#</span>
              <span>general</span>
            </div>
          </div>
          <div className="sidebar-spacer" />
          <div className="sidebar-profile">
            <span className="avatar avatar-current">
              {username.slice(0, 1).toUpperCase()}
            </span>
            <span className="profile-copy">
              <strong>{username}</strong>
              <span className="profile-status">
                <span
                  className={`online-dot ${connectionStatus}`}
                  aria-hidden="true"
                />
                {connectionStatus === "connected"
                  ? "Online"
                  : connectionStatus === "connecting"
                    ? "Connecting"
                    : "Offline"}
              </span>
            </span>
            <button
              aria-label="Sign out"
              className="icon-button sign-out-button"
              onClick={() => {
                socketRef.current?.disconnect();
                setUsername("");
                setUsernameInput("");
                setMessages([]);
                setOnlineUsers([]);
                setConnectionStatus("disconnected");
                setConnectionError("");
              }}
              title="Sign out"
              type="button"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8m3-3 3-3-3-3m3 3H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </aside>

        <div className="chat-main">
          <header className="chat-header">
            <div className="channel-title">
              <span className="header-hash">#</span>
              <div>
                <h1>general</h1>
                <p>A place for everything and everyone</p>
              </div>
            </div>
            <div className="header-meta">
              <span
                className={`connection-indicator ${connectionStatus}`}
                aria-hidden="true"
              />
              <span className="connection-label">
                {connectionStatus === "connected"
                  ? `${onlineUsers.length} online`
                  : connectionStatus === "connecting"
                    ? "Connecting"
                    : "Offline"}
              </span>
            </div>
          </header>

          <div className="message-list" aria-live="polite">
            {connectionError && (
              <div className="connection-notice" role="status">
                <span className="notice-icon" aria-hidden="true">
                  !
                </span>
                {connectionError}
              </div>
            )}
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-chat-icon">
                  <BrandMark small />
                </div>
                <h2>Welcome to #general</h2>
                <p>
                  This is the beginning of something good. Send the first
                  message and say hello.
                </p>
              </div>
            ) : (
              <div className="messages">
                {messages.map((message) => {
                  const isOwnMessage = message.username === username;
                  return (
                    <article
                      className={`message-row${isOwnMessage ? " own-message" : ""}`}
                      key={message.id}
                    >
                      <span
                        className={`avatar message-avatar${message.username === "Bot" ? " bot-avatar" : ""}`}
                      >
                        {message.username === "Bot" ? (
                          <BrandMark small />
                        ) : (
                          message.username.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <div className="message-body">
                        <div className="message-heading">
                          <strong>
                            {message.username === username
                              ? "you"
                              : message.username}
                          </strong>
                          <time
                            dateTime={new Date(message.sent_at).toISOString()}
                          >
                            {formatTime(message.sent_at)}
                          </time>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    </article>
                  );
                })}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>

          <form className="message-form" onSubmit={handleSendMessage}>
            <label className="visually-hidden" htmlFor="chat-message">
              Write a message
            </label>
            <input
              autoComplete="off"
              className="message-input"
              id="chat-message"
              maxLength={2000}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Message #general"
              value={messageInput}
            />
            <button
              aria-label="Send message"
              className="send-button"
              disabled={
                !messageInput.trim() ||
                sending ||
                connectionStatus !== "connected"
              }
              type="submit"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m17 3-6.2 14-2.4-5.4L3 9.2 17 3Zm0 0-8.6 8.6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <p className="chat-hint">
            <kbd>Enter</kbd> to send <span>·</span> Keep it kind
          </p>
        </div>
      </section>
      <p className="chat-footer">Made for good conversations.</p>
    </main>
  );
}
