import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionGenerationService } from "@/services/questionGeneration";

/**
 * POST /api/v1/resources/[id]/generate-questions
 *
 * Tự động tạo câu hỏi trắc nghiệm từ tài liệu resource.
 *
 * Body params:
 * - useFileName: boolean (optional, default: false)
 *   + true: Sử dụng kiến thức chung của LLM dựa trên tên file (nhanh hơn, không cần đọc file)
 *   + false: Đọc nội dung file và tạo câu hỏi dựa trên nội dung (chính xác hơn nhưng chậm)
 * - numberOfChapters: number (optional, default: 3) - Số chương muốn tạo (chỉ áp dụng khi useFileName=true)
 * - questionsPerChapter: number (optional, default: 5) - Số câu hỏi mỗi chương (chỉ áp dụng khi useFileName=true)
 *
 * Flow:
 * 1. Lấy thông tin resource từ database
 * 2. Download và extract text từ file (nếu useFileName=false)
 * 3. Gọi AI để sinh câu hỏi (chapters + final exercise)
 * 4. Lưu exercises/questions/options vào database
 * 5. Trả về kết quả
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const useFileName = body.useFileName === true;
    const numberOfChapters = body.numberOfChapters || 3;
    const questionsPerChapter = body.questionsPerChapter || 5;

    // 1. Xác thực user
    const payload = await verifyToken(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Lấy thông tin resource
    const resource = await prisma.learningResources.findUnique({
      where: { id: resourceId },
      include: {
        skill: true,
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // 3. Kiểm tra resource có phải là FILE không
    if (resource.resourceType !== "FILE") {
      return NextResponse.json(
        {
          error:
            "Only FILE type resources can generate questions. Found: " +
            resource.resourceType,
        },
        { status: 400 }
      );
    }

    // 4. Kiểm tra URL có tồn tại không
    if (!resource.url) {
      return NextResponse.json(
        { error: "Resource has no file URL" },
        { status: 400 }
      );
    }

    let generatedContent;

    if (useFileName) {
      // Sử dụng kiến thức chung của LLM dựa trên tiêu đề resource
      // Ưu tiên: resource.title > tên file từ URL > "Unknown"
      const topicName = resource.title || extractFileName(resource.url) || "Unknown";
      console.log(`Generating questions from topic: "${topicName}" (using LLM knowledge)...`);

      generatedContent = await questionGenerationService.generateQuestionsFromFileName(
        topicName,
        { numberOfChapters, questionsPerChapter }
      );
    } else {
      // Đọc nội dung file và tạo câu hỏi (phương pháp RAG)
      // 5. Parse file format từ URL hoặc filename
      const fileFormat = extractFileFormat(resource.url);
      if (!fileFormat) {
        return NextResponse.json(
          { error: "Cannot determine file format from URL" },
          { status: 400 }
        );
      }

      // Validate supported formats
      const supportedFormats = ["pdf", "doc", "docx", "txt"];
      if (!supportedFormats.includes(fileFormat.toLowerCase())) {
        return NextResponse.json(
          {
            error: `Unsupported file format: ${fileFormat}. Supported: ${supportedFormats.join(", ")}`,
          },
          { status: 400 }
        );
      }

      console.log(`Generating questions from resource ${resourceId} content...`);
      generatedContent = await questionGenerationService.generateQuestionsFromFile(
        resource.url,
        fileFormat
      );
    }

    // 7. Lưu vào database: tạo exercises, questions, options
    const result = await saveGeneratedContentToDatabase(
      generatedContent,
      resource.skillId!,
      resourceId
    );

    return NextResponse.json(
      {
        success: true,
        message: "Questions generated successfully",
        data: {
          summary: generatedContent.summary,
          chaptersCount: generatedContent.chapters.length,
          totalQuestionsCreated: result.totalQuestionsCreated,
          exercisesCreated: result.exercisesCreated,
          method: useFileName ? "LLM_KNOWLEDGE" : "FILE_CONTENT",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Generate questions error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate questions",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * Extract file format từ URL
 * VD: https://example.com/file.pdf?token=xyz → pdf
 */
function extractFileFormat(url: string): string | null {
  try {
    // Remove query params
    const urlWithoutQuery = url.split("?")[0];

    // Get extension
    const parts = urlWithoutQuery.split(".");
    if (parts.length < 2) return null;

    const extension = parts[parts.length - 1].toLowerCase();
    return extension;
  } catch {
    return null;
  }
}

/**
 * Extract file name từ URL
 * VD: https://example.com/path/Introduction-to-JavaScript.pdf?token=xyz → Introduction-to-JavaScript.pdf
 */
function extractFileName(url: string): string | null {
  try {
    // Remove query params
    const urlWithoutQuery = url.split("?")[0];

    // Get file name from path
    const parts = urlWithoutQuery.split("/");
    const fileName = parts[parts.length - 1];

    // Decode URI component (handle %20, etc.)
    return decodeURIComponent(fileName);
  } catch {
    return null;
  }
}

/**
 * Lưu generated content vào database
 * Sử dụng các query riêng lẻ thay vì transaction để tránh timeout
 */
async function saveGeneratedContentToDatabase(
  content: any,
  skillId: string,
  resourceId: string
) {
  const exercisesCreated: string[] = [];
  let totalQuestionsCreated = 0;

  try {
    // 1. Tạo exercises cho từng chapter
    for (let chapterIndex = 0; chapterIndex < content.chapters.length; chapterIndex++) {
      const chapter = content.chapters[chapterIndex];

      // Tạo exercise cho chapter
      const exercise = await prisma.exercises.create({
        data: {
          skillId: skillId,
          title: chapter.chapterTitle,
          description: chapter.summary,
          timeLimitSeconds: 900, // 15 phút
          passScore: 70,
          ordering: chapterIndex + 1,
        },
      });

      exercisesCreated.push(exercise.id);

      // Tạo questions và options cho exercise này
      for (let qIndex = 0; qIndex < chapter.questions.length; qIndex++) {
        const q = chapter.questions[qIndex];

        const question = await prisma.questions.create({
          data: {
            exerciseId: exercise.id,
            questionType: q.questionType,
            prompt: q.prompt,
            points: q.points,
            ordering: qIndex + 1,
          },
        });

        totalQuestionsCreated++;

        // Tạo tất cả options cùng lúc bằng createMany
        await prisma.questionOptions.createMany({
          data: q.options.map((opt: any, optIndex: number) => ({
            questionId: question.id,
            content: opt.content,
            isCorrect: opt.isCorrect,
            ordering: optIndex + 1,
          })),
        });
      }
    }

    // 2. Tạo final exercise (tổng kết)
    const finalExercise = await prisma.exercises.create({
      data: {
        skillId: skillId,
        title: content.finalExercise.title,
        description: "Bài tập tổng kết toàn bộ chủ đề",
        timeLimitSeconds: 1200, // 20 phút
        passScore: 70,
        ordering: content.chapters.length + 1,
      },
    });

    exercisesCreated.push(finalExercise.id);

    // Tạo questions cho final exercise
    for (let qIndex = 0; qIndex < content.finalExercise.questions.length; qIndex++) {
      const q = content.finalExercise.questions[qIndex];

      const question = await prisma.questions.create({
        data: {
          exerciseId: finalExercise.id,
          questionType: q.questionType,
          prompt: q.prompt,
          points: q.points,
          ordering: qIndex + 1,
        },
      });

      totalQuestionsCreated++;

      // Tạo tất cả options cùng lúc bằng createMany
      await prisma.questionOptions.createMany({
        data: q.options.map((opt: any, optIndex: number) => ({
          questionId: question.id,
          content: opt.content,
          isCorrect: opt.isCorrect,
          ordering: optIndex + 1,
        })),
      });
    }

    return {
      exercisesCreated,
      totalQuestionsCreated,
    };
  } catch (error) {
    // Nếu có lỗi, xóa các exercises đã tạo để rollback thủ công
    if (exercisesCreated.length > 0) {
      console.log("Rolling back created exercises...");
      await prisma.exercises.deleteMany({
        where: { id: { in: exercisesCreated } },
      });
    }
    throw error;
  }
}
