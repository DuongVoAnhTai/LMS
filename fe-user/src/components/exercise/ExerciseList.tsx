"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit, Loader2, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import * as Icon from "@/assets/Image/exerciseIcon";
import * as exerciseIcon from "@/assets/Image/exerciseIcon";
import * as exerciseService from "@/services/exerciseServices";
import * as userService from "@/services/userServices";
import ExerciseFormModal from "./ExerciseFormModal";

export default function ExerciseList() {
  const params = useParams();
  const skillId = params.id as string;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseResults, setExerciseResults] = useState<
    Map<string, ExerciseResult>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { userDetail } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canManage =
    userDetail?.role === "ADMIN" || userDetail?.role === "TEACHER";

  useEffect(() => {
    if (!skillId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      // Fetch song song cả hai nguồn dữ liệu
      const [exercisesResponse, resultsResponse] = await Promise.all([
        exerciseService.getExercisesBySkillId(skillId),
        userService.getUserExerciseResults(),
      ]);

      if ("error" in exercisesResponse) {
        setError(exercisesResponse.error);
        setLoading(false);
        return;
      }

      if ("error" in resultsResponse) {
        console.warn("Could not fetch user results:", resultsResponse.error);
      }

      if (exercisesResponse.exercises) {
        setExercises(exercisesResponse.exercises);
      }

      if ("results" in resultsResponse && resultsResponse.results) {
        const resultMap = new Map<string, ExerciseResult>(
          resultsResponse.results.map((res: ExerciseResult) => [
            res.exerciseId,
            res,
          ])
        );
        setExerciseResults(resultMap);
      }

      setLoading(false);
    };

    loadData();
  }, [skillId]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    return exercises.filter(
      (ex) =>
        ex.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exercises, searchQuery]);

  const completedCount = Array.from(exerciseResults.values()).filter(
    (sub) => sub.isPassed
  ).length;

  const handleOpenCreateModal = () => {
    setEditingExercise(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExercise(null);
  };

  const handleSaveExercise = async (data: any) => {
    setIsSaving(true);
    let response: ExerciseServiceResponse;
    if (editingExercise) {
      response = await exerciseService.updateExercise(
        skillId,
        editingExercise.id,
        data
      );
      if (response.exercise) {
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === editingExercise.id ? { ...ex, ...response.exercise } : ex
          )
        );
        toast.success("Cập nhật thành công!");
      }
    } else {
      response = await exerciseService.createExercise(skillId, data);
      if (response.exercise) {
        setExercises((prev) => [...prev, response.exercise!]);
        toast.success("Tạo mới thành công!");
      }
    }

    if (response.error) toast.error(response.error);
    else handleCloseModal();
    setIsSaving(false);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;
    const response = await exerciseService.deleteExercise(skillId, exerciseId);
    if (response.message) {
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
      toast.success("Xóa thành công!");
    } else {
      toast.error(response.error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-red-700">Đã xảy ra lỗi</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-10xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {canManage ? "Quản lý Bài tập" : "Bài tập & Kiểm tra"}
            </h2>
            <p className="text-gray-600 mt-5">
              {canManage ? "" : "Chọn bài tập để bắt đầu luyện tập"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {canManage && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <PlusCircle size={20} /> Tạo bài tập
              </button>
            )}

            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Tìm kiếm bài tập..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Icon.BookOpen size={24} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {exercises.length}
                </p>
                <p className="text-xs text-blue-600">Tổng bài tập</p>
              </div>
            </div>
          </div>

          {!canManage && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Icon.Trophy size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {completedCount}
                  </p>
                  <p className="text-xs text-green-600">Đã hoàn thành</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => {
            const difficulty = exerciseIcon.getDifficultyFromPassScore(
              exercise.passScore
            );
            const diffColors = exerciseIcon.getDifficultyColor(difficulty);
            const userAttempt = exerciseResults.get(exercise.id);
            const bestScorePercent = userAttempt
              ? (userAttempt.score / userAttempt.totalPoints) * 100
              : null;

            const exerciseLinkHref = canManage
              ? `/teacher/skills/${skillId}/exercises/${exercise.id}/manage`
              : `/skills/${skillId}/exercises/${exercise.id}`;

            return (
              <div
                key={exercise.id}
                className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                {canManage && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenEditModal(exercise);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md cursor-pointer"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteExercise(exercise.id);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                <Link href={exerciseLinkHref}>
                  <div
                    className={`h-2 bg-gradient-to-r ${
                      difficulty === "easy"
                        ? "from-green-400 to-green-500"
                        : difficulty === "medium"
                        ? "from-yellow-400 to-yellow-500"
                        : "from-red-400 to-red-500"
                    }`}
                  ></div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {exercise.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {exercise.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${diffColors.bg} ${diffColors.text} border ${diffColors.border}`}
                      >
                        {exerciseIcon.getDifficultyLabel(difficulty)}
                      </span>
                      {userAttempt?.isPassed && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300 flex items-center space-x-1">
                          <Icon.Trophy size={12} />
                          <span>Đã pass</span>
                        </span>
                      )}
                    </div>

                    <div className="flex-grow"></div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Icon.Clock size={16} className="text-gray-400" />
                        <span>
                          {Math.floor((exercise.timeLimitSeconds || 0) / 60)}{" "}
                          phút
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Icon.BookOpen size={16} className="text-gray-400" />
                        <span>{exercise._count?.questions || "N/A"} câu</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Icon.Target size={16} className="text-gray-400" />
                        <span>Pass: {exercise.passScore || 70}%</span>
                      </div>
                      {bestScorePercent !== null && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Icon.Trophy size={16} className="text-yellow-400" />
                          <span className="font-semibold">
                            {bestScorePercent.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <button className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer">
                        <Icon.Play size={18} />
                        <span>{userAttempt ? "Làm lại" : "Bắt đầu"}</span>
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Icon.BookOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Không tìm thấy bài tập
            </h3>
            <p className="text-gray-600">Thử thay đổi từ khóa tìm kiếm</p>
          </div>
        )}

        {isModalOpen && (
          <ExerciseFormModal
            initialData={editingExercise}
            onClose={handleCloseModal}
            onSave={handleSaveExercise}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
