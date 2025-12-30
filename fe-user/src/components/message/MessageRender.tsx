import Image from "next/image";
import * as Icon from "@/assets/Image";
import * as MessageHelper from "@/utils/messageHelper";

interface MessageRenderProps {
  messages: Message[];
  fetchedUser: User | null;
}

function MessageRender({ messages, fetchedUser }: MessageRenderProps) {
  return (
    <>
      {messages.map((msg) => {
        const isMe = msg.sender?.id === fetchedUser?.id;

        const hasFile =
          MessageHelper.rawFileFormats.includes(msg.fileFormat || "") ||
          msg.contentType === "FILE";
        const hasImage = msg.contentType === "IMAGE" && !hasFile;
        const hasTextContent = msg.content && msg.content.trim() !== "";

        const renderFileAttachment = () => (
          <a
            href={msg?.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={msg.fileName}
            className={`bg-white border border-gray-200 rounded-lg p-3 flex items-center space-x-3 shadow-sm hover:bg-gray-50 max-w-xs ${
              isMe ? "" : "text-gray-900"
            }`}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon.Paperclip size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {msg.fileName}
              </p>
              {msg.fileSize && (
                <p className="text-xs text-gray-500">
                  {MessageHelper.formatFileSize(msg.fileSize)}
                </p>
              )}
            </div>
          </a>
        );

        const renderImageAttachment = () => (
          <a href={msg?.fileUrl} target="_blank" rel="noopener noreferrer">
            <div className="rounded-lg overflow-hidden shadow-lg max-w-xs sm:max-w-sm cursor-pointer border border-gray-200">
              <Image
                src={msg.fileUrl!}
                alt={msg.fileName || "image"}
                width={300}
                height={300}
                className="object-cover w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png";
                }}
              />
            </div>
          </a>
        );

        const renderTextContent = () => (
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm ${
              isMe ? "bg-blue-600 text-white" : "bg-white text-gray-900"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          </div>
        );

        const renderMessageContent = () => {
          const hasAttachment = hasFile || hasImage;

          if (hasAttachment && hasTextContent) {
            // Có cả file/ảnh và nội dung text
            return (
              <div className="flex flex-col gap-2">
                {hasFile && renderFileAttachment()}
                {hasImage && renderImageAttachment()}
                {renderTextContent()}
              </div>
            );
          } else if (hasFile) {
            return renderFileAttachment();
          } else if (hasImage) {
            return renderImageAttachment();
          } else {
            return renderTextContent();
          }
        };

        return (
          <div
            key={msg.id}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex items-end max-w-2xl ${
                isMe ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {!isMe &&
                (msg.sender?.avatarUrl ? (
                  <Image
                    src={msg.sender?.avatarUrl}
                    alt={msg.sender?.username || "U"}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full mr-2 flex-shrink-0 object-cover"
                  />
                ) : (
                  // Nếu người đó không có avatarUrl, hiển thị chữ cái đầu
                  <div className="w-8 h-8 mr-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">
                      {msg.sender?.fullName?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                ))}

              <div className="group relative">
                {!isMe && (
                  <p className="text-xs text-gray-500 mb-1 ml-2">
                    {msg.sender?.username}
                  </p>
                )}

                {/* Gọi hàm render để hiển thị đúng loại nội dung */}
                {renderMessageContent()}

                {/* có thể thêm phần hiển thị thời gian, status, nút xóa ở đây */}

                <div
                  className={`flex items-center mt-1 space-x-1 text-xs text-gray-500 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{MessageHelper.formatTimestamp(msg.createdAt)}</span>
                  {/* {isMe && <MessageStatus status={msg.status} />} */}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default MessageRender;
