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
    if (!confirm("Bạn chắc chắn muốn xoá học sinh này?")) return;

    await deleteUser(id);
    fetchUsers();
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Thêm học sinh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">Tên</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center p-4">
                  Đang tải...
                </td>
              </tr>
            ) : (
              students.map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{s.full_name}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setSelected(s);
                          setOpenModal(true);
                        }}
                        className="text-blue-600"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600"
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
