"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

type QuestionFormData = Omit<
  Question,
  "id" | "exerciseId" | "options" | "answerKeys"
>;

interface QuestionFormModalProps {
  initialData?: Question | null;
  onClose: () => void;
  onSave: (data: QuestionFormData) => Promise<void>;
  isSaving: boolean;
}

export default function QuestionFormModal({
  initialData,
  onClose,
  onSave,
  isSaving,
}: QuestionFormModalProps) {
  const [formData, setFormData] = useState<QuestionFormData>({
    prompt: "",
    questionType: "SINGLE_CHOICE",
    points: 1,
    ordering: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        prompt: initialData.prompt || "",
        questionType: initialData.questionType || "SINGLE_CHOICE",
        points: initialData.points || 1,
        ordering: initialData.ordering || 0,
      });
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
      [name]:
        name === "points" || name === "ordering"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData.prompt.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Chỉnh sửa Câu hỏi" : "Tạo Câu hỏi mới"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span>Nội dung câu hỏi</span>
            <textarea
              name="prompt"
              value={formData.prompt}
              onChange={handleChange}
              required
              rows={4}
              className="mt-1 w-full border rounded-md p-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span>Loại câu hỏi</span>
              <select
                name="questionType"
                value={formData.questionType}
                onChange={handleChange}
                className="mt-1 w-full border rounded-md p-2 bg-white"
              >
                <option value="SINGLE_CHOICE">Chọn một</option>
                {/* <option value="MULTIPLE_CHOICE">Chọn nhiều</option> */}
                <option value="SHORT_ANSWER">Trả lời ngắn</option>
                <option value="LONG_ANSWER">Tự luận</option>
                {/* <option value="FILL_BLANK">Điền vào chỗ trống</option> */}
              </select>
            </label>
            <label className="block">
              <span>Điểm</span>
              <input
                name="points"
                type="number"
                value={formData.points}
                onChange={handleChange}
                className="mt-1 w-full border rounded-md p-2"
              />
            </label>
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
          </div>
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
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center disabled:bg-blue-400 cursor-pointer"
            >
              {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
