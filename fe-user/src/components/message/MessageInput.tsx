import * as Icon from "@/assets/Image";
import { Loader2 } from "lucide-react";

interface MessageInputProps {
  stagedFile: File | null;
  isSending: boolean;
  messageInput: string;
  setMessageInput: (value: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  handlePickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveStagedFile: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
}

function MessageInput({
  stagedFile,
  isSending,
  messageInput,
  setMessageInput,
  fileInputRef,
  openFilePicker,
  handlePickFile,
  handleRemoveStagedFile,
  handleKeyPress,
  handleSendMessage,
}: MessageInputProps) {
  return (
    <>
      {/* Phần input tin nhắn */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        {stagedFile && (
          <div className="mb-2 p-2 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between animate-in fade-in-50 pr-1 py-1 max-w-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                <Icon.Paperclip size={16} className="text-gray-600" />
              </div>
              <span className="text-sm text-gray-800 truncate">
                {stagedFile.name}
              </span>
            </div>
            <button
              onClick={handleRemoveStagedFile}
              className="p-1 hover:bg-gray-300 rounded-full flex-shrink-0"
              title="Bỏ chọn tệp"
            >
              <Icon.X size={14} className="text-gray-700" />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          {/* ... Các nút đính kèm file ... */}
          <button
            onClick={openFilePicker}
            disabled={isSending}
            className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
          >
            <Icon.Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handlePickFile}
          />

          <div className="flex-1 relative">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={(!messageInput.trim() && !stagedFile) || isSending}
            className="p-3 bg-blue-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center w-[48px] h-[48px]"
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Icon.Send size={20} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default MessageInput;
