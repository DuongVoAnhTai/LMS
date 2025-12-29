"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/context/PresenceContext";
import * as Icon from "@/assets/Image";
import * as conversationService from "@/services/conversationServices";
import * as messageHelper from "@/utils/messageHelper";

const MessageTopbar = () => {
  const params = useParams();
  const router = useRouter();
  const activeConversationId = params.id as string;

  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { userDetail: fetchedUser } = useAuth();
  const { isUserOnline } = usePresence();

  // Dropdown menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Nếu không có conversation nào được chọn, reset state
    if (!activeConversationId) {
      setActiveConversation(null);
      setLoading(false);
      return;
    }

    const fetchConversationDetails = async () => {
      setLoading(true);

      const result = await conversationService.getConversationById(
        activeConversationId
      );

      if (result.error) {
        console.error(result.error);
        setActiveConversation(null);
      } else {
        setActiveConversation(result.conversation);
      }

      setLoading(false);
    };

    fetchConversationDetails();
  }, [activeConversationId]); // Chạy lại mỗi khi ID active thay đổi

  // Handle rename conversation
  const handleRename = async () => {
    if (!newTitle.trim() || !activeConversationId) return;

    setIsUpdating(true);
    const result = await conversationService.updateConversation(
      activeConversationId,
      newTitle.trim()
    );

    if (result.error) {
      alert("Không thể đổi tên cuộc hội thoại: " + result.error);
    } else {
      setActiveConversation(result.conversation);
      setIsRenameModalOpen(false);
      setNewTitle("");
    }
    setIsUpdating(false);
  };

  // Handle delete conversation
  const handleDelete = async () => {
    if (!activeConversationId) return;

    setIsUpdating(true);
    const result = await conversationService.deleteConversation(activeConversationId);

    if (result.error) {
      alert("Không thể xóa cuộc hội thoại: " + result.error);
      setIsUpdating(false);
      return;
    }

    // Fetch conversations to get the most recent one
    const conversationsResult = await conversationService.getConversations({ take: 1 });
    setIsDeleteModalOpen(false);
    setIsUpdating(false);

    // Determine base route based on user role
    const baseRoute = fetchedUser?.role === "ADMIN" || fetchedUser?.role === "TEACHER"
      ? "/teacher/messages"
      : "/messages";

    if (conversationsResult.conversations && conversationsResult.conversations.length > 0) {
      // Navigate to the most recent conversation
      router.push(`${baseRoute}/${conversationsResult.conversations[0].id}`);
    } else {
      // No conversations left, go to base message route
      router.push(baseRoute);
    }
  };

  // Render trạng thái loading
  if (loading) {
    return (
      <div className="bg-white border-b border-gray-200 p-4 h-[77px] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-gray-200 animate-pulse"></div>
          <div className="w-24 h-3 rounded bg-gray-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Render khi không có conversation nào được chọn
  if (!activeConversation) {
    return (
      <div className="bg-white border-b border-gray-200 p-4 h-[77px] flex items-center">
        <p className="text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
      </div>
    );
  }

  // Lấy các thông tin cần thiết từ conversation thật
  const type = messageHelper.getConversationType(activeConversation);
  const name = messageHelper.getConversationName(
    activeConversation,
    fetchedUser?.id
  );
  const IconAvatar = messageHelper.getConversationIcon(type);

  const otherParticipant =
    type === "direct"
      ? activeConversation.participants.find(
        (p) => p.user.id !== fetchedUser?.id
      )
      : null;

  const isOnline = otherParticipant
    ? isUserOnline(otherParticipant.user.id)
    : false;

  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center">
        {/* Logic hiển thị Avatar thật */}
        <div className="relative">
          {type === "direct" && otherParticipant ? (
            otherParticipant.user.avatarUrl ? (
              <Image
                src={otherParticipant.user.avatarUrl}
                alt={name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              // Nếu người đó không có avatarUrl, hiển thị chữ cái đầu
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {otherParticipant.user.fullName?.charAt(0).toUpperCase() ||
                    "U"}
                </span>
              </div>
            )
          ) : (
            /* Điều kiện 2: Fallback cho chat Nhóm hoặc AI */
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-r ${messageHelper.getAvatarGradient(
                type
              )}`}
            >
              <IconAvatar size={20} className="text-white" />
            </div>
          )}
        </div>

        <div className="ml-3">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p
            className="text-sm text-gray-500
            "
          >
            {type === "group"
              ? `${activeConversation.participants.length} thành viên`
              : type === "ai"
                ? "Đang hoạt động"
                : isOnline
                  ? "Đang hoạt động"
                  : "Ngoại tuyến"}
          </p>
        </div>
      </div>

      {/* Menu dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon.MoreVertical size={20} className="text-gray-600" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* Đổi tên - chỉ hiển thị với AI và group */}
            {(type === "ai" || type === "group") && (
              <button
                onClick={() => {
                  setNewTitle(activeConversation.title || name);
                  setIsRenameModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Icon.Edit size={16} />
                <span>Đổi tên</span>
              </button>
            )}
            {/* Xóa cuộc hội thoại - hiển thị với tất cả loại */}
            <button
              onClick={() => {
                setIsDeleteModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Icon.Trash size={16} />
              <span>Xóa cuộc hội thoại</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal đổi tên */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold mb-4">Đổi tên cuộc hội thoại</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nhập tên mới..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setNewTitle("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isUpdating}
              >
                Hủy
              </button>
              <button
                onClick={handleRename}
                disabled={isUpdating || !newTitle.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isUpdating ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold mb-2">Xóa cuộc hội thoại</h3>
            <p className="text-gray-600 mb-4">
              Bạn có chắc chắn muốn xóa cuộc hội thoại này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isUpdating}
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isUpdating ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTopbar;
