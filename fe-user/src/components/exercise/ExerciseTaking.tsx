"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import QuestionRenderer from "./QuestionRenderer";
import * as exerciseService from "@/services/exerciseServices";
import * as Icon from "@/assets/Image/exerciseIcon";

interface ExerciseTakingProps {
  skillId: string;
  exerciseId: string;
}

export default function ExerciseTaking({
  skillId,
  exerciseId,
}: ExerciseTakingProps) {
  const router = useRouter();
  const [exercise, setExercise] = useState<
    (Exercise & { questions: Question[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái làm bài
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, SubmissionAnswer>>(
    new Map()
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const endTimeRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);

  // Trạng thái UI
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchExerciseData = async () => {
      setLoading(true);

      const response = await exerciseService.getExerciseById(
        skillId,
        exerciseId
      );

      if ("error" in response) {
        setError(response.error);
        toast.error(response.error);
      } else if ("exercise" in response) {
        setExercise(response.exercise);
        const duration = response.exercise.timeLimitSeconds || 900;
        setTimeRemaining(duration); // 15 phút mặc định
        endTimeRef.current = Date.now() + duration * 1000;
        hasSubmittedRef.current = false;
      }
      setLoading(false);
    };
    fetchExerciseData();
  }, [skillId, exerciseId]);

  const handleSubmit = useCallback(async () => {
    if (!exercise || isSubmitting || hasSubmittedRef.current) return;

    // Đánh dấu là đã bắt đầu nộp bài
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    // 1. Tính toán thời gian làm bài
    const timeSpent = (exercise.timeLimitSeconds || 0) - timeRemaining;

    // 1. Thu thập câu trả lời thành mảng để gửi đi
    const answersToSubmit: SubmissionAnswer[] = [];
    exercise.questions.forEach((question) => {
      const answer = userAnswers.get(question.id);

      if (answer) {
        answersToSubmit.push({
          questionId: question.id,
          selectedOptionId: answer.selectedOptionId,
          // selectedOptionIds: answer.selectedOptionIds, // Cho multiple choice
          answerText: answer.answerText,
        });
      } else {
        answersToSubmit.push({
          questionId: question.id,
        });
      }
    });

    // 2. Gọi API nộp bài
    const result = await exerciseService.submitExercise(skillId, exercise.id, {
      answers: answersToSubmit,
      timeSpentSeconds: timeSpent,
    });

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    } else {
      toast.success("Nộp bài thành công!");
      router.push(`/skills/${skillId}/exercises/${exercise.id}/result`);
    }
  }, [exercise, userAnswers, skillId, timeRemaining, router, isSubmitting]);

  // --- LOGIC HẸN GIỜ ---
  useEffect(() => {
    if (!endTimeRef.current || isSubmitting) return;

    const timer = setInterval(() => {
      // 2. Tính toán lại thời gian còn lại
      const timeLeft = Math.round((endTimeRef.current! - Date.now()) / 1000);

      if (timeLeft <= 0) {
        clearInterval(timer);
        setTimeRemaining(0);
        if (!hasSubmittedRef.current) {
          toast.warn("Hết giờ! Hệ thống đang tự động nộp bài của bạn.");
          handleSubmit();
        }
      } else {
        setTimeRemaining(timeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitting, handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, {
        selectedOptionId: optionId,
        questionId: "",
      });
      return newMap;
    });
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, {
        answerText: text,
        questionId: "",
      });
      return newMap;
    });
  };

  // const handleMultiChoiceSelect = (questionId: string, optionId: string) => {
  //   setUserAnswers((prev) => {
  //     const newMap = new Map(prev);
  //     const currentAnswer = newMap.get(questionId) || {};
  //     const currentSelections = new Set(currentAnswer.selectedOptionIds || []);

  //     // Nếu đã chọn thì bỏ chọn, nếu chưa thì thêm vào
  //     if (currentSelections.has(optionId)) {
  //       currentSelections.delete(optionId);
  //     } else {
  //       currentSelections.add(optionId);
  //     }

  //     newMap.set(questionId, {
  //       selectedOptionIds: Array.from(currentSelections),
  //     });
  //     return newMap;
  //   });
  // };

  const handleNext = () => {
    if (exercise && currentQuestionIndex < exercise.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleExitExercise = () => {
    if (confirm("Bạn có chắc muốn thoát? Tiến trình sẽ không được lưu.")) {
      router.push(`/skills/${skillId}/exercises`);
    }
  };

  const getAnsweredCount = () => userAnswers.size;

  if (!exercise) {
    return (
      <div className="text-center text-gray-500">
        Không thể tải được bài tập.
      </div>
    );
  }

  const progress =
    ((currentQuestionIndex + 1) / exercise.questions.length) * 100;
  const answeredCount = getAnsweredCount();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (!exercise || !exercise.questions || exercise.questions.length === 0) {
    // Giao diện này sẽ được hiển thị thay vì giao diện làm bài
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold">Bài tập không có sẵn</h2>
        <p className="text-gray-600">
          Bài tập này không tồn tại hoặc chưa có câu hỏi nào được thêm vào.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {exercise.title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Câu {currentQuestionIndex + 1} / {exercise.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeRemaining < 300
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <Icon.Clock size={20} />
                <span className="font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <button
                onClick={handleExitExercise}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Thoát
              </button>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-gray-600">
              Đã trả lời:{" "}
              <span className="font-semibold text-gray-900">
                {answeredCount}/{exercise.questions.length}
              </span>
            </span>
            <span className="text-gray-600">
              Còn lại:{" "}
              <span className="font-semibold text-gray-900">
                {exercise.questions.length - answeredCount}
              </span>
            </span>
          </div>
        </div>
      </div>

      <QuestionRenderer
        exercise={exercise}
        userAnswers={userAnswers}
        setCurrentQuestionIndex={setCurrentQuestionIndex}
        currentQuestionIndex={currentQuestionIndex}
        handleAnswerSelect={handleAnswerSelect}
        handleTextAnswerChange={handleTextAnswerChange}
      />

      <div className="bg-white border-t border-gray-200 sticky bottom-0 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Icon.ChevronLeft size={20} />
            <span>Câu trước</span>
          </button>

          {currentQuestionIndex === exercise.questions.length - 1 ? (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              <Icon.Send size={20} />
              <span>Nộp bài</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <span>Câu tiếp theo</span>
              <Icon.ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              {answeredCount < exercise.questions.length ? (
                <Icon.AlertCircle
                  size={48}
                  className="text-yellow-500 mx-auto mb-3"
                />
              ) : (
                <Icon.CheckCircle
                  size={48}
                  className="text-green-500 mx-auto mb-3"
                />
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Xác nhận nộp bài?
              </h3>
              <p className="text-gray-600">
                Bạn đã trả lời{" "}
                <span className="font-semibold text-gray-900">
                  {answeredCount}/{exercise.questions.length}
                </span>{" "}
                câu hỏi
              </p>
              {answeredCount < exercise.questions.length && (
                <p className="text-yellow-600 text-sm mt-2">
                  Còn {exercise.questions.length - answeredCount} câu chưa trả
                  lời!
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Tiếp tục làm
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
