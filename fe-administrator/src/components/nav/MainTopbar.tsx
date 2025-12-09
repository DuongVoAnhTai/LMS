"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, Menu, Search, X, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import * as authService from "@/services/authServices";

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MainTopbar = ({ sidebarOpen, setSidebarOpen }: TopbarProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const {
    userDetail: fetchedUser,
    loading: isLoading,
    logout: clientLogout,
  } = useAuth();

  const handleProfile = () => {
    setUserMenuOpen(false);
    router.replace("/profile");
  };

  const handleChangePassword = () => {
    setUserMenuOpen(false);
    router.replace("/change-password");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // cập nhật client state bằng hook
      try {
        clientLogout();
      } catch (e) {
        console.warn("client logout failed", e);
      }
      setUserMenuOpen(false);
      router.replace("/login");
    }
  };
  // Thông báo mẫu
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "n1",
      title: "Cập nhật kỹ năng mới",
      message: "Đã thêm bài học AI nâng cao.",
      date: "2025-10-15",
      type: "info",
    },
    {
      id: "n2",
      title: "Hoàn thành bài kiểm tra",
      message: "Bạn vừa hoàn thành bài NLP #1.",
      date: "2025-10-10",
      type: "success",
    },
  ]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 relative">
        {/* Left */}
        <div className="flex items-center">
          {/* Nút mở sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900 mr-4"
          >
            <Menu size={24} />
          </button>

          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              type="text"
              placeholder="Tìm kiếm ..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((s) => !s)}
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">Thông báo</p>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <Info size={18} className="text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-600">{n.message}</p>
                        <p className="text-[11px] text-gray-400">{n.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center space-x-2 relative cursor-pointer"
          >
            {fetchedUser?.avatarUrl ? (
              <Image
                src={fetchedUser?.avatarUrl}
                alt="avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {fetchedUser?.fullName?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}

            <span className="text-sm font-medium text-gray-700">
              {isLoading
                ? "Đang tải..."
                : fetchedUser?.fullName ?? "Người dùng"}
            </span>
          </button>
        </div>
      </div>

      {userMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {userMenuOpen && (
        <div className="absolute right-3 top-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <button
            onClick={handleProfile}
            className="block w-full text-left px-4 py-1 my-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Hồ sơ
          </button>

          <button
            onClick={handleChangePassword}
            className="block w-full text-left px-4 py-1 my-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Đổi mật khẩu
          </button>

          <div className="h-0 my-2 overflow-hidden border-t border-gray-300" />

          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-1 my-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  );
};

export default MainTopbar;
