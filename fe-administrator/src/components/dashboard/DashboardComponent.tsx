"use client";

import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Loader2,
} from "lucide-react";

import SummaryCard from "./SummaryCard";
import Link from "next/link";

import { getAllUsers, getLessonsCount } from "@/services/adminUserServices";

interface AdminSummary {
  totalStudents: number;
  totalTeachers: number;
  totalExercises: number; // ← FIX
  recentStudents: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
}

export default function DashboardAdmin() {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // USERS
      const users = await getAllUsers();
      console.log("USERS FROM API:", users);

      const students = users?.filter((u: any) => u.role === "STUDENT") || [];
      const teachers = users?.filter((u: any) => u.role === "ADMIN") || [];

      // Bài học (skills)
      const totalLessons = await getLessonsCount();

      // Lấy 5 STUDENT mới nhất
      const sortedStudents = students
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || b.createdAt).getTime() -
            new Date(a.created_at || a.createdAt).getTime()
        )
        .slice(0, 5);

      const formatted: AdminSummary = {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalExercises: totalLessons, // ← FIX
        recentStudents: sortedStudents.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.fullName || "Không tên",
          email: u.email,
          createdAt: u.created_at || u.createdAt,
        })),
      };

      setData(formatted);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <SummaryCard
          title="Tổng học sinh"
          value={data?.totalStudents.toString() || "0"}
          icon={<Users size={32} className="text-blue-200" />}
          gradient="from-blue-500 to-blue-600"
        />

        <SummaryCard
          title="Tổng giáo viên"
          value={data?.totalTeachers.toString() || "0"}
          icon={<GraduationCap size={32} className="text-green-200" />}
          gradient="from-green-500 to-green-600"
        />

        <SummaryCard
          title="Tổng bài tập"
          value={data?.totalExercises.toString() || "0"} // ← FIX
          icon={<BookOpen size={32} className="text-orange-200" />}
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      {/* Recent Students */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Học sinh mới đăng ký
        </h3>

        {data?.recentStudents.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có học sinh nào.</p>
        ) : (
          <div className="space-y-4">
            {data?.recentStudents.map((st) => (
              <Link
                href={`/students/${st.id}`}
                key={st.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{st.name}</h4>
                  <p className="text-sm text-gray-500">{st.email}</p>
                  <p className="text-xs text-gray-400">
                    Ngày tạo: {new Date(st.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
