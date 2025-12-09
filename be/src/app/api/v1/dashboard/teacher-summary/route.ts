// src/app/api/v1/dashboard/teacher-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req);
    // Bảo vệ endpoint: Chỉ Admin hoặc Teacher mới có quyền truy cập
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // --- FETCH DỮ LIỆU SONG SONG ---
    const [
      totalSkillsCount,
      totalExercisesCount,
      allSubmissions,
      skillsWithProgress,
    ] = await Promise.all([
      // 1. Đếm tổng số kỹ năng trong hệ thống (không bị xóa)
      prisma.skills.count({ where: { isDeleted: false } }),

      // 2. Đếm tổng số bài tập trong hệ thống
      prisma.exercises.count(),

      // 3. Lấy tất cả các lần nộp bài để tính toán
      prisma.userSubmissions.findMany({
        select: {
          score: true,
          totalPoints: true,
          isPassed: true,
          exerciseId: true,
        },
      }),

      // 4. Lấy tiến độ của tất cả các skill để tính trung bình
      prisma.userSkillProgress.findMany({
        select: {
          progress: true,
          completedExercises: true,
          totalExercises: true,
          skill: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      }),
    ]);

    // --- XỬ LÝ VÀ TÍNH TOÁN CÁC CHỈ SỐ ---

    // A. Dữ liệu cho các Card Tóm tắt (Summary Cards)
    const totalCompletedSubmissions = allSubmissions.filter(
      (s) => s.isPassed
    ).length;

    const totalUserScore = allSubmissions.reduce((sum, s) => sum + s.score, 0);
    const totalMaxScore = allSubmissions.reduce(
      (sum, s) => sum + s.totalPoints,
      0
    );
    const averageScore =
      totalMaxScore > 0 ? (totalUserScore / totalMaxScore) * 100 : 0;

    // B. Dữ liệu cho phần "Tiến độ học tập" - Ở đây là tiến độ trung bình của tất cả user trên mỗi skill
    // Nhóm tiến độ theo skillId và tính trung bình
    const progressBySkill = skillsWithProgress.reduce((acc, p) => {
      if (!p.skill) return acc;
      if (!acc[p.skill.id]) {
        acc[p.skill.id] = {
          ...p.skill,
          totalProgress: 0,
          userCount: 0,
          avgProgress: 0,
          totalCompleted: 0,
          totalExercises: 0,
        };
      }
      acc[p.skill.id].totalProgress += p.progress || 0;
      acc[p.skill.id].userCount += 1;
      acc[p.skill.id].totalCompleted += p.completedExercises || 0;
      acc[p.skill.id].totalExercises += p.totalExercises || 0; // Cần tính toán lại cho đúng
      return acc;
    }, {} as any);

    const learningProgress = Object.values(progressBySkill)
      .map((skill: any) => {
        skill.avgProgress =
          skill.userCount > 0 ? skill.totalProgress / skill.userCount : 0;
        return {
          id: skill.id,
          title: skill.title,
          description: skill.description,
          progress: skill.avgProgress, // Hiển thị tiến độ trung bình
          completedExercises: skill.totalCompleted, // Tổng số bài đã hoàn thành trên toàn hệ thống
          exerciseCount: skill.totalExercises,
        };
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5); // Lấy 5 skill có tiến độ TB cao nhất

    // C. Dữ liệu cho phần "Kết quả gần đây" - Lấy 5 lần nộp bài mới nhất của BẤT KỲ user nào
    const recentResults = await prisma.userSubmissions.findMany({
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        user: { select: { fullName: true } }, // Lấy tên user đã nộp
        exercise: {
          select: {
            title: true,
            skill: { select: { title: true } },
          },
        },
      },
    });

    const formattedRecentResults = recentResults.map((s) => ({
      // exerciseId dùng làm key, có thể thêm userId để key duy nhất hơn
      uniqueKey: `${s.exerciseId}-${s.userId}-${s.submittedAt}`,
      exerciseId: s.exerciseId,
      exerciseTitle: `${s.user.fullName} - ${s.exercise.title}`, // Thêm tên user
      skillTitle: s.exercise.skill?.title || "N/A",
      score: s.score,
      totalPoints: s.totalPoints,
      submittedAt: s.submittedAt,
    }));

    // --- TRẢ VỀ RESPONSE HOÀN CHỈNH ---
    return NextResponse.json({
      summary: {
        totalSkillsCount,
        totalCompletedSubmissions,
        totalExercises: totalExercisesCount,
        averageScore,
      },
      learningProgress,
      recentResults: formattedRecentResults,
    });
  } catch (error) {
    console.error("Get teacher dashboard summary error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard data" },
      { status: 500 }
    );
  }
}
