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
  const [role, setRole] = useState("STUDENT");

  useEffect(() => {
    if (student) {
      setFullName(student.full_name || "");
      setEmail(student.email || "");
      setRole(student.role || "STUDENT");
    } else {
      setFullName("");
      setEmail("");
      setRole("STUDENT");
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
      role,
    };

    if (student?.id) {
      await updateUser(student.id, payload);
    } else {
      await createUser(payload);
    }

    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[450px] space-y-4 animate-fadeIn">
        <h2 className="text-xl font-semibold text-gray-900">
          {student ? "Cập nhật tài khoản" : "Thêm tài khoản mới"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đầy đủ
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập tên đầy đủ"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="STUDENT">Student </option>
              <option value="ADMIN">Admin </option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Hủy
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {student ? "Cập nhật" : "Thêm mới"}
          </button>
        </div>
      </div>
    </div>
  );
}