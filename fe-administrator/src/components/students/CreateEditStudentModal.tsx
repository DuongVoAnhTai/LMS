"use client";

import { useState, useEffect } from "react";
import { createUser, updateUser } from "@/services/adminUserServices";

interface Student {
  id?: string;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  refresh: () => void;
}

export default function CreateEditStudentModal({
  open,
  onClose,
  student,
  refresh,
}: ModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Khi nhấn nút sửa → load dữ liệu vào form
  useEffect(() => {
    if (student) {
      setFullName(student.full_name || "");
      setEmail(student.email || "");
    } else {
      setFullName("");
      setEmail("");
    }
  }, [student]);

  if (!open) return null;

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const payload: Student = {
      full_name: fullName,
      email,
      role: "STUDENT",
    };

    // Nếu có student.id → cập nhật
    if (student?.id) {
      await updateUser(student.id, payload);
    } else {
      // Ngược lại → thêm mới
      await createUser(payload);
    }

    refresh(); // load lại danh sách
    onClose(); // đóng modal
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[400px] space-y-4 animate-fadeIn">
        <h2 className="text-xl font-semibold">
          {student ? "Cập nhật học sinh" : "Thêm học sinh"}
        </h2>

        <div className="space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tên học sinh"
            className="w-full border p-2 rounded-lg"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border p-2 rounded-lg"
            type="email"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
