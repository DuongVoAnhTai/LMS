"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import * as userService from "@/services/userServices";

function ResultComponent() {
  const [results, setResults] = useState<ExerciseResultHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      const response = await userService.getUserExerciseResults();

      if (response.error) {
        setError(response.error);
      } else if (response.results) {
        setResults(response.results);
      }
      setLoading(false);
    };
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-6">{error}</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bảng kết quả</h3>

      {results.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa hoàn thành.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2">Bài tập</th>
                <th className="py-2">Kỹ năng</th>
                <th className="py-2">Điểm</th>
                <th className="py-2">%</th>
                <th className="py-2">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const percentage =
                  r.totalPoints > 0 ? (r.score / r.totalPoints) * 100 : 0;
                return (
                  <tr key={r.exerciseId} className="border-t">
                    <td className="py-2 font-medium text-gray-900">
                      {r.exerciseTitle}
                    </td>
                    <td className="py-2 text-gray-600">{r.skillTitle}</td>
                    <td className="py-2">
                      {r.score}/{r.totalPoints}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          percentage >= 0.7
                            ? "bg-green-100 text-green-700"
                            : percentage >= 0.5
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(r.submittedAt).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ResultComponent;
