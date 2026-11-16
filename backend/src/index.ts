import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Server } from "socket.io";
import {
  getMessages,
  normalizeUsername,
  parseMessageInput,
  persistMessage,
  type MessagePayload,
} from "./controller/message.js";
import {
  getDisconnectUser,
  getOnlineUsers,
  getUser,
  saveUser,
} from "./utils/user.js";
import { format } from "./utils/formatMessage.js";

dotenv.config();

type SendMessageAck = { ok: true } | { ok: false; error: string };

interface ClientToServerEvents {
  joined: (payload: unknown) => void;
  send_message: (
    payload: unknown,
    acknowledge?: (response: SendMessageAck) => void,
  ) => void;
}

interface ServerToClientEvents {
  message: (message: MessagePayload | ReturnType<typeof format>) => void;
  join_success: (payload: { username: string }) => void;
  join_error: (payload: { message: string }) => void;
  online_users: (usernames: string[]) => void;
}

const app = express();
const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000";
const port = Number(process.env.PORT ?? 8000);

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: "16kb" }));
app.get("/health", (_req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;
  res.status(isDatabaseReady ? 200 : 503).json({
    status: isDatabaseReady ? "ok" : "database-unavailable",
  });
});
app.get("/chat", getMessages);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("joined", (payload) => {
    const username = normalizeUsername(
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).username
        : undefined,
    );

    if (!username) {
      socket.emit("join_error", {
        message: "Choose a username of up to 32 characters.",
      });
      return;
    }

    const existingUser = getUser(socket.id);
    const user = saveUser(socket.id, username);
    if (!user) {
      socket.emit("join_error", {
        message: "That username is already in use. Try another one.",
      });
      return;
    }

    socket.join("general");
    socket.emit("join_success", { username: user.username });
    socket.emit("message", format("Bot", "Welcome to #general!"));
    if (!existingUser) {
      socket.to("general").emit(
        "message",
        format("Bot", `${user.username} joined the chat`),
      );
    }
    io.emit("online_users", getOnlineUsers());
  });

  socket.on("send_message", async (payload, acknowledge) => {
    const user = getUser(socket.id);
    const input = parseMessageInput({
      username: user?.username,
      message:
        typeof payload === "string"
          ? payload
          : typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>).message
            : undefined,
    });

    if (!user || !input) {
      acknowledge?.({
        ok: false,
        error: "Join the chat and enter a message of up to 2000 characters.",
      });
      return;
    }

    try {
      const savedMessage = await persistMessage(user.username, input.message);
      io.to("general").emit("message", savedMessage);
      acknowledge?.({ ok: true });
    } catch (error) {
      console.error("Failed to persist socket message:", error);
      acknowledge?.({
        ok: false,
        error: "Your message could not be sent. Please try again.",
      });
    }
  });

  socket.on("disconnect", () => {
    const user = getDisconnectUser(socket.id);
    if (!user) return;

    socket.broadcast
      .to("general")
      .emit("message", format("Bot", `${user.username} left`));
    io.emit("online_users", getOnlineUsers());
  });
});

async function startServer() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("MONGO_URL is required to start the chat server.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(mongoUrl);
    httpServer.listen(port, () => {
      console.log(`Chat server listening on port ${port}.`);
    });
  } catch (error) {
    console.error("Unable to connect to MongoDB:", error);
    process.exitCode = 1;
  }
}

void startServer();
