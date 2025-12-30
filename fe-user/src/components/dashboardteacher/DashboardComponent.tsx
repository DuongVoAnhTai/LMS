"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  FileText,
  Loader2,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import * as dashboardService from "@/services/dashboardServices";

const SummaryCard = ({
  title,
  value,
  icon,
  gradient,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}) => (
  <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}
    ></div>
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-md`}
        >
          {icon}
        </div>
      </div>
      <div
        className={`h-1 w-full bg-gradient-to-r ${gradient} rounded-full opacity-20`}
      ></div>
    </div>
  </div>
);

function DashboardComponentTeacher() {
  const [summary, setSummary] = useState<any>(null);
  const [learningProgress, setLearningProgress] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getTeacherDashboardSummary();

      if (response.error) {
        setError(response.error);
      } else {
        setSummary(response.summary);
        setLearningProgress(response.learningProgress);
        setRecentResults(response.recentResults);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <FileText className="text-red-600" size={32} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Có lỗi xảy ra
        </h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Thống kê giảng dạy</h1>
        <p className="text-blue-100">
          Tổng quan về hoạt động giảng dạy và tiến độ học tập của sinh viên
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Tổng số kỹ năng"
          value={summary?.totalSkillsCount?.toString() || "0"}
          icon={<BookOpen size={28} className="text-white" />}
          gradient="from-blue-500 to-blue-600"
          subtitle="Đang được theo dõi"
        />
        <SummaryCard
          title="Lượt hoàn thành"
          value={summary?.totalCompletedSubmissions?.toString() || "0"}
          icon={<CheckCircle size={28} className="text-white" />}
          gradient="from-green-500 to-green-600"
          subtitle="Tổng số bài sinh viên đã hoàn thành"
        />
        <SummaryCard
          title="Tổng bài tập"
          value={summary?.totalExercises?.toString() || "0"}
          icon={<FileText size={28} className="text-white" />}
          gradient="from-purple-500 to-purple-600"
          subtitle="Trong hệ thống"
        />
        <SummaryCard
          title="Điểm trung bình toàn hệ thống"
          value={summary?.averageScore?.toFixed(1) || "0.0"}
          icon={<Star size={28} className="text-white" />}
          gradient="from-orange-500 to-orange-600"
          subtitle="Điểm TB của sinh viên"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp size={24} />
              Tiến độ học tập
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              Theo dõi tiến độ các kỹ năng
            </p>
          </div>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            {learningProgress.length > 0 ? (
              learningProgress.map((skill) => (
                <Link href={`/teacher/skills/${skill.id}`} key={skill.id}>
                  <div className="group p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {skill.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {skill.description}
                        </p>
                      </div>
                      <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                        {skill.progress || 0}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${skill.progress || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">
                          {skill.completedExercises}/{skill.exerciseCount} bài
                          tập
                        </span>
                        <span className="text-gray-500">
                          Còn lại:{" "}
                          {skill.exerciseCount - skill.completedExercises}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Chưa có tiến độ học tập</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle size={24} />
              Kết quả gần đây
            </h3>
            <p className="text-green-100 text-sm mt-1">
              Bài tập sinh viên hoàn thành gần đây
            </p>
          </div>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            {recentResults.length > 0 ? (
              recentResults.map((r) => (
                <div
                  key={r.id}
                  className="group p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                        {r.exerciseTitle}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {r.skillTitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {new Date(r.submittedAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(r.submittedAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-green-600 mb-1">
                          {r.score}/{r.totalPoints}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full"
                              style={{
                                width: `${(r.score / r.totalPoints) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {((r.score / r.totalPoints) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Chưa có kết quả nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardComponentTeacher;
