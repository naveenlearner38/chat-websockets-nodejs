import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";

// Define message interface
interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
}

// Create HTTP server
const httpServer = createServer();

// Create Socket.io server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Default Vite dev server port
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users and messages
const users: Record<string, string> = {};
const messages: ChatMessage[] = [];

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle user joining
  socket.on("join", (username: string) => {
    users[socket.id] = username;
    
    // Notify everyone about the new user
    io.emit("userJoined", { 
      user: "system", 
      text: `${username} has joined the chat!`,
      timestamp: Date.now()
    });
    
    // Send existing messages to the new user
    socket.emit("previousMessages", messages);
    
    // Send current user list
    io.emit("userList", Object.values(users));
  });
  
  // Handle chat messages
  socket.on("sendMessage", (messageText: string) => {
    const username = users[socket.id];
    
    if (!username) return;
    
    const newMessage: ChatMessage = {
      user: username,
      text: messageText,
      timestamp: Date.now()
    };
    
    // Save message to history
    messages.push(newMessage);
    
    // If we have more than 50 messages, remove the oldest
    if (messages.length > 50) {
      messages.shift();
    }
    
    // Broadcast message to all users
    io.emit("newMessage", newMessage);
  });
  
  // Handle typing indicator
  socket.on("typing", (isTyping: boolean) => {
    const username = users[socket.id];
    if (!username) return;
    
    // Broadcast typing status to all except sender
    socket.broadcast.emit("userTyping", {
      user: username,
      isTyping
    });
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    const username = users[socket.id];
    
    if (username) {
      delete users[socket.id];
      
      // Notify everyone about the user leaving
      io.emit("userLeft", {
        user: "system",
        text: `${username} has left the chat`,
        timestamp: Date.now()
      });
      
      // Update user list
      io.emit("userList", Object.values(users));
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access from other devices using your IP address: http://YOUR_IP_ADDRESS:${PORT}`);
});