"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import * as userService from "@/services/userServices";

type AuthContextType = {
  userPayload: UserPayload | null;
  userDetail: User | null;
  loading: boolean;
  refreshUserDetail: () => Promise<void>;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userPayload, setUserPayload] = useState<UserPayload | null>(null);
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const data = await userService.getUser();
      setUserDetail(data ?? null);
    } catch (e) {
      setUserDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserDetail = async () => {
    await fetchUser();
  };

  const login = (token: string) => {
    localStorage.setItem("token", token);
    const decoded = jwtDecode<UserPayload>(token);
    setUserPayload(decoded);
    fetchUser();

    // --- CHUYỂN HƯỚNG BAN ĐẦU SAU KHI ĐĂNG NHẬP ---
    // Chuyển hướng ngay lập tức để người dùng thấy trang mới
    if (decoded.role === "ADMIN" || decoded.role === "TEACHER") {
      router.push("/teacher"); // Ví dụ route của teacher
    } else {
      router.push("/"); // Route mặc định của student
    }
  };

  const logout = () => {
    setUserPayload(null);
    setUserDetail(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        fetchUser();
      } catch (e) {
        setUserDetail(null);
        setUserPayload(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userPayload,
        userDetail,
        loading,
        refreshUserDetail,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
