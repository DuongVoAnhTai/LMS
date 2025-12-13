"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Upload, FileText, Trash2 } from "lucide-react";
import * as cloudinaryService from "@/services/cloudinaryServices";

interface ResourceFormModalProps {
  initialData?: LearningResource | null;
  onClose: () => void;
  onSave: (data: ResourceFormData) => Promise<void>;
  isSaving: boolean;
}

export default function ResourceFormModal({
  initialData,
  onClose,
  onSave,
  isSaving,
}: ResourceFormModalProps) {
  const [formData, setFormData] = useState<ResourceFormData>({
    title: "",
    resourceType: "LINK",
    url: "",
    content: "",
    ordering: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Các định dạng file được hỗ trợ
  const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        resourceType: initialData.resourceType || "LINK",
        url: initialData.url || "",
        content: initialData.content || "",
        ordering: initialData.ordering || 0,
      });
      setSelectedFile(null);
      setUploadError(null);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ordering" ? parseInt(value) || 0 : value,
    }));

    // Reset file khi đổi loại resource
    if (name === "resourceType" && value !== "FILE") {
      setSelectedFile(null);
      setUploadError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      setUploadError(
        `Định dạng không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    // Validate file type by MIME
    if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== "") {
      setUploadError(
        `Loại file không hỗ trợ. Chỉ chấp nhận: PDF, DOC, DOCX, TXT`
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File quá lớn. Kích thước tối đa là 10MB.");
      return;
    }

    setSelectedFile(file);
    // Luôn cập nhật tiêu đề theo tên file (không có đuôi file)
    // Tiêu đề này sẽ được dùng để tạo câu hỏi AI
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, ""); // Bỏ extension
    setFormData((prev) => ({ ...prev, title: fileNameWithoutExt }));

    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  };

  // Hàm loại bỏ extension bị lặp (vd: "file.pdf.pdf" -> "file.pdf")
  const fixDuplicateExtension = (fileName: string): string => {
    const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    if (extensionMatch) {
      const ext = extensionMatch[1].toLowerCase();
      const doubleExtPattern = new RegExp(`\\.${ext}\\.${ext}$`, "i");
      if (doubleExtPattern.test(fileName)) {
        return fileName.replace(doubleExtPattern, `.${ext}`);
      }
    }
    return fileName;
  };

  // Hàm lấy tên file từ URL (dùng để hiển thị khi edit)
  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlWithoutQuery = url.split("?")[0];
      const parts = urlWithoutQuery.split("/");
      let fileName = parts[parts.length - 1];
      fileName = decodeURIComponent(fileName);
      return fixDuplicateExtension(fileName);
    } catch {
      return "Tệp đã tải lên";
    }
  };

  // Hàm lấy tên file để hiển thị (xử lý extension lặp)
  const getDisplayFileName = (file: File): string => {
    return fixDuplicateExtension(file.name);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isUploading || !formData.title?.trim()) return;

    // Validate: Nếu là FILE thì phải có file hoặc URL sẵn
    if (formData.resourceType === "FILE" && !selectedFile && !formData.url) {
      setUploadError("Vui lòng chọn một tệp để tải lên.");
      return;
    }

    let dataToSave = { ...formData };

    // Upload file lên Cloudinary nếu có file mới
    if (formData.resourceType === "FILE" && selectedFile) {
      setIsUploading(true);
      setUploadError(null);

      try {
        const uploadResult = await cloudinaryService.uploadFile(
          selectedFile,
          "resources"
        );

        dataToSave.url = uploadResult.secure_url;
      } catch (error) {
        console.error("Upload error:", error);
        setUploadError("Tải file lên thất bại. Vui lòng thử lại.");
        setIsUploading(false);
        return;
      }

      setIsUploading(false);
    }

    onSave(dataToSave);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "txt":
        return "📃";
      default:
        return "📁";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {initialData ? "Chỉnh sửa Tài nguyên" : "Tạo Tài nguyên mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <label className="block">
            <span>Tiêu đề</span>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="mt-1 w-full border rounded-md p-2"
            />
          </label>
          <label className="block">
            <span>Loại tài nguyên</span>
            <select
              name="resourceType"
              value={formData.resourceType}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2 bg-white"
            >
              <option value="LINK">Link</option>
              <option value="ARTICLE">Bài viết</option>
              {/* <option value="VIDEO">Video</option> */}
              <option value="FILE">Tệp</option>
              <option value="NOTE">Ghi chú</option>
            </select>
          </label>
          {formData.resourceType === "LINK" && (
            <label className="block">
              <span>URL</span>
              <input
                name="url"
                type="url"
                value={formData.url}
                onChange={handleChange}
                className="mt-1 w-full border rounded-md p-2"
              />
            </label>
          )}
          {formData.resourceType === "FILE" && (
            <div className="block">
              <span className="text-sm font-medium">Tệp tài liệu</span>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* File picker area */}
              {!selectedFile && !formData.url ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Nhấn để chọn tệp hoặc kéo thả vào đây
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Hỗ trợ: PDF, DOC, DOCX, TXT (tối đa 10MB)
                  </p>
                </div>
              ) : (
                <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 text-2xl">
                        {selectedFile
                          ? getFileIcon(getDisplayFileName(selectedFile))
                          : formData.url
                            ? getFileIcon(getFileNameFromUrl(formData.url))
                            : <FileText className="h-6 w-6 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {selectedFile
                            ? getDisplayFileName(selectedFile)
                            : formData.url
                              ? getFileNameFromUrl(formData.url)
                              : "Tệp đã tải lên"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedFile
                            ? formatFileSize(selectedFile.size)
                            : formData.url && "Đã có tệp"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Xóa tệp"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Hiển thị URL hiện tại nếu đang edit và có URL */}
              {initialData?.url && formData.url && !selectedFile && (
                <p className="mt-2 text-xs text-gray-500 truncate">
                  URL hiện tại: {formData.url}
                </p>
              )}

              {/* Error message */}
              {uploadError && (
                <p className="mt-2 text-sm text-red-500">{uploadError}</p>
              )}
            </div>
          )}
          {(formData.resourceType === "ARTICLE" ||
            formData.resourceType === "NOTE") && (
              <label className="block">
                <span>Nội dung (hỗ trợ Markdown)</span>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={8}
                  className="mt-1 w-full border rounded-md p-2"
                />
              </label>
            )}
          <label className="block">
            <span>Thứ tự</span>
            <input
              name="ordering"
              type="number"
              value={formData.ordering}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center disabled:bg-blue-400 cursor-pointer"
            >
              {(isSaving || isUploading) && (
                <Loader2 className="animate-spin mr-2" size={16} />
              )}
              {isUploading ? "Đang tải lên..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
