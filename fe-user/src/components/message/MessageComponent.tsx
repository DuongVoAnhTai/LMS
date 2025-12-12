"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import * as conversationService from "@/services/conversationServices";
import * as cloudinaryService from "@/services/cloudinaryServices";
import MessageInput from "./MessageInput";
import MessageTyping from "./MessageTyping";
import MessageRender from "./MessageRender";

interface MessageComponentProps {
  conversationId: string;
}

function MessageComponent({ conversationId }: MessageComponentProps) {
  const { socket } = useSocket();
  const { userDetail: fetchedUser } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const topObserver = useRef<IntersectionObserver | null>(null);
  const topMessageElementRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; username: string }[]
  >([]);
  const [stagedFile, setStagedFile] = useState<File | null>(null); // State mới để lưu file chờ
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => fileInputRef.current?.click();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Hàm cuộn xuống tin nhắn cuối ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      const result = await conversationService.getMessages(conversationId, {
        take: 20,
      });

      if (result.error) {
        setError(result.error);
        toast.error(`Lỗi tải tin nhắn: ${result.error}`);
      } else if (result && result.messages) {
        setMessages(result.messages);
        setNextCursor(result.nextCursor);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [conversationId]);

  const loadPreviousMessages = useCallback(async () => {
    if (loadingPrevious || !nextCursor) return;
    setLoadingPrevious(true);

    const result = await conversationService.getMessages(conversationId, {
      take: 20,
      cursor: nextCursor,
    });

    if (result && result.messages) {
      // Giữ vị trí cuộn
      const scrollContainer = topMessageElementRef.current?.parentElement;
      const oldScrollHeight = scrollContainer?.scrollHeight || 0;

      setMessages((prev) => [...result.messages, ...prev]);
      setNextCursor(result.nextCursor); // Cập nhật cursor mới

      // Điều chỉnh lại vị trí cuộn
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop =
            scrollContainer.scrollHeight - oldScrollHeight;
        }
      });
    }
    setLoadingPrevious(false);
  }, [conversationId, loadingPrevious, nextCursor]);

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && nextCursor) {
        loadPreviousMessages();
      }
    };
    topObserver.current = new IntersectionObserver(handleObserver);

    if (topMessageElementRef.current) {
      topObserver.current.observe(topMessageElementRef.current);
    }

    return () => topObserver.current?.disconnect();
  }, [loadPreviousMessages, nextCursor]);

  // --- XỬ LÝ SOCKET.IO ---
  useEffect(() => {
    if (!socket || !conversationId) return;

    // 1. Tham gia vào phòng chat
    socket.emit("join-room", { conversationId }, (response: any) => {
      if (response.error) {
        console.error("Không thể tham gia phòng:", response.error);
        toast.error(response.error);
      } else {
        console.log(`Đã tham gia phòng: ${conversationId}`);
      }
    });

    // 2. Lắng nghe tin nhắn mới
    const handleNewMessage = (newMessage: Message) => {
      // Chỉ thêm tin nhắn nếu nó thuộc về cuộc trò chuyện hiện tại
      if (newMessage.conversationId === conversationId) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    socket.on("new-message", handleNewMessage);

    // 3. Lắng nghe sự kiện gõ phím
    const handleUserTyping = (data: { userId: string; username: string }) => {
      if (data.userId !== fetchedUser?.id) {
        setTypingUsers((prev) => [
          ...prev.filter((u) => u.userId !== data.userId),
          data,
        ]);
        // Xóa user khỏi danh sách typing sau 3s
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId)
          );
        }, 3000);
      }
    };
    socket.on("user-typing", handleUserTyping);

    // Cleanup: rời phòng và tắt các listener
    return () => {
      socket.emit("leave-room", { conversationId });
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleUserTyping);
    };
  }, [socket, conversationId, fetchedUser?.id]);

  // --- Cuộn xuống khi có tin nhắn mới ---
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Các định dạng file hỗ trợ RAG
  const RAG_SUPPORTED_FORMATS = ["pdf", "doc", "docx", "txt"];

  // --- GỬI TIN NHẮN ---
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !stagedFile) || isSending) return;

    setIsSending(true);

    const textToSend = messageInput.trim();
    const fileToSend = stagedFile;

    setMessageInput("");
    setStagedFile(null);

    try {
      let uploadResult: any = null;

      // 1. Upload file nếu có
      if (fileToSend) {
        uploadResult = await cloudinaryService.uploadFile(
          fileToSend,
          "chat_attachments"
        );
      }

      // 2. Chuẩn bị payload tin nhắn
      if (uploadResult && socket) {
        // Lấy tên file gốc (không có extension) và extension riêng
        const originalName = fileToSend?.name || uploadResult.original_filename;
        const fileExtension = uploadResult.format?.toLowerCase();

        // Loại bỏ extension nếu đã có trong tên file
        const fileNameWithoutExt = originalName.replace(
          new RegExp(`\\.${fileExtension}$`, 'i'),
          ''
        );

        const filePayload = {
          conversationId,
          contentType:
            uploadResult.resource_type === "image" ? "IMAGE" : "FILE",
          // Nếu có text, gửi kèm text; nếu không thì gửi tên file
          content: textToSend || `Tệp đính kèm: ${originalName}`,
          fileUrl: uploadResult.secure_url,
          fileName: fileNameWithoutExt, // Gửi tên không có extension
          fileSize: uploadResult.bytes,
          fileFormat: fileExtension,
        };
        socket.emit("send-message", filePayload, (ack: any) => {
          if (ack.error) toast.error(`Lỗi gửi tệp: ${ack.error}`);
        });
      }

      // 3. Gửi tin nhắn text riêng (chỉ khi không có file đính kèm)
      if (textToSend && !fileToSend && socket) {
        const textPayload = {
          conversationId,
          contentType: "TEXT",
          content: textToSend,
        };
        socket.emit("send-message", textPayload, (ack: any) => {
          if (ack.error) toast.error(`Lỗi gửi tin nhắn: ${ack.error}`);
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Gửi tin nhắn thất bại");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      // Gửi sự kiện typing
      if (socket) socket.emit("typing", { conversationId });
    }
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStagedFile(file);
    e.target.value = "";
  };

  const handleRemoveStagedFile = () => {
    setStagedFile(null);
  };

  // --- RENDER ---
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">Chưa có tin nhắn</p>
                <p className="text-sm">Hãy bắt đầu cuộc trò chuyện!</p>
              </div>
            </div>
          )}
          {loadingPrevious && (
            <div className="flex justify-center p-2">
              <Loader2 className="animate-spin text-gray-400" />
            </div>
          )}

          {nextCursor && <div ref={topMessageElementRef} />}

          <MessageRender messages={messages} fetchedUser={fetchedUser} />
        </div>

        <MessageTyping typingUsers={typingUsers} />

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        stagedFile={stagedFile}
        isSending={isSending}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        fileInputRef={fileInputRef}
        openFilePicker={openFilePicker}
        handlePickFile={handlePickFile}
        handleRemoveStagedFile={handleRemoveStagedFile}
        handleKeyPress={handleKeyPress}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default MessageComponent;
