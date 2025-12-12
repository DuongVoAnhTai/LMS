"use client";

import { useEffect, useState } from "react";
import { getAllUsers, deleteUser } from "@/services/adminUserServices";
import { Plus, Pencil, Trash } from "lucide-react";
import CreateEditStudentModal from "@/components/students/CreateEditStudentModal";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);

    const users = await getAllUsers();

    setStudents(
      users.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        full_name: u.fullName,
        role: u.role,
        avatarUrl: u.avatarUrl,
        created_at: u.createdAt,
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xoá người dùng này?")) return;

    await deleteUser(id);
    fetchUsers();
  };

  // Helper để hiển thị badge role
  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return (
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
          ADMIN
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
        STUDENT
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quản lý học sinh</h1>

        <button
          onClick={() => {
            setSelected(null);
            setOpenModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Thêm học sinh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">Tên</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-center">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  Chưa có học sinh nào
                </td>
              </tr>
            ) : (
              students.map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3">{s.full_name}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{getRoleBadge(s.role)}</td>
                  <td className="p-3">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setSelected(s);
                          setOpenModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Sửa"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Xóa"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateEditStudentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        student={selected}
        refresh={fetchUsers}
      />
    </div>
  );
}