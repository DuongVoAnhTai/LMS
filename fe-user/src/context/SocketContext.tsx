// src/contexts/SocketContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface ISocketContext {
  socket: typeof Socket | null;
  isOnline: boolean;
}

const SocketContext = createContext<ISocketContext>({
  socket: null,
  isOnline: false,
});

// Hook tiện ích để sử dụng context
export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { userDetail } = useAuth(); // Lấy userDetail từ context xác thực
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!userDetail || !token) {
      // Nếu không có userDetail hoặc token, ngắt kết nối cũ nếu có
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsOnline(false);
      }
      return;
    }

    console.log("LOG", userDetail);
    console.log("LOG", token);

    // Tạo instance socket mới
    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
      {
        auth: { token },
        reconnectionAttempts: 5, // Tự động kết nối lại 5 lần
      }
    );

    setSocket(newSocket);

    // Lắng nghe các sự kiện cơ bản
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsOnline(true);
    });

    newSocket.on("disconnect", (reason: string) => {
      console.log("❌ Socket disconnected:", reason);
      setIsOnline(false);
    });

    newSocket.on("connect_error", (err: Error) => {
      console.error("Socket connection error:", err.message);
    });

    // Cleanup khi component unmount hoặc userDetail thay đổi
    return () => {
      newSocket.disconnect();
    };
  }, [userDetail]);

  return (
    <SocketContext.Provider value={{ socket, isOnline }}>
      {children}
    </SocketContext.Provider>
  );
};
