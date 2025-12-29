import { fileProcessorService } from "./fileProcessor";
import { ProviderFactory } from "./providers/ProviderFactory";

interface QuestionOption {
  content: string;
  isCorrect: boolean;
}

interface Question {
  prompt: string;
  ordering: number;
  points: number;
  questionType: "SINGLE_CHOICE";
  options: QuestionOption[];
}

interface Chapter {
  chapterTitle: string;
  summary: string;
  questions: Question[];
}

interface FinalExercise {
  title: string;
  questions: Question[];
}

interface GeneratedContent {
  summary: string;
  chapters: Chapter[];
  finalExercise: FinalExercise;
}

class QuestionGenerationService {
  /**
   * Tải file từ URL và trích xuất văn bản
   */
  async extractTextFromFile(
    fileUrl: string,
    fileFormat: string
  ): Promise<string> {
    try {
      const buffer = await fileProcessorService.downloadFile(fileUrl);
      const text = await fileProcessorService.processFile(buffer, fileFormat);
      return text;
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw new Error("Failed to extract text from file");
    }
  }

  /**
   * Tạo prompt để AI sinh câu hỏi từ tài liệu
   */
  private buildPrompt(documentContent: string): string {
    return `────────────────────────────────────────────────────────
LUỒNG HOẠT ĐỘNG TOÀN BỘ
────────────────────────────────────────────────────────
Bạn là một trợ lý AI chuyên tạo bài tập trắc nghiệm từ tài liệu học tập.
Người dùng đã upload tài liệu và yêu cầu tạo câu hỏi tự động.

Dưới đây là nội dung tài liệu đã được trích xuất:

{{DOCUMENT_CONTENT}}
${documentContent}
{{END_DOCUMENT_CONTENT}}

────────────────────────────────────────────────────────
NHIỆM VỤ CỦA BẠN
────────────────────────────────────────────────────────
Bạn phải thực hiện toàn bộ các bước sau:

1) TÓM TẮT TOÀN BỘ TÀI LIỆU
   - Viết 1 đoạn tóm tắt rõ ràng, đầy đủ ý chính.

2) CHIA TÀI LIỆU THÀNH CÁC CHƯƠNG LOGIC
   - Không giới hạn số chương, nhưng phải hợp lý.
   - Mỗi chương bao gồm:
     • chapterTitle
     • summary
     • nội dung quan trọng (nếu cần)

3) TẠO CÂU HỎI TRẮC NGHIỆM SINGLE_CHOICE CHO MỖI CHƯƠNG
   - Mỗi chương tạo 5–10 câu SINGLE_CHOICE.
   - Cấu trúc 1 câu hỏi:
       ordering
       points = 1
       questionType = "SINGLE_CHOICE"
       options = 4 lựa chọn
       chỉ 1 lựa chọn đúng (isCorrect: true)

4) TẠO EXERCISE TỔNG KẾT CHO TOÀN BỘ TÀI LIỆU
   - Gồm 5–10 câu SINGLE_CHOICE.

5) XUẤT DUY NHẤT MỘT OBJECT JSON THEO ĐÚNG CẤU TRÚC SAU:

{
  "summary": "...",
  "chapters": [
    {
      "chapterTitle": "...",
      "summary": "...",
      "questions": [
        {
          "prompt": "...",
          "ordering": 1,
          "points": 1,
          "questionType": "SINGLE_CHOICE",
          "options": [
            { "content": "...", "isCorrect": false },
            { "content": "...", "isCorrect": true },
            { "content": "...", "isCorrect": false },
            { "content": "...", "isCorrect": false }
          ]
        }
      ]
    }
  ],
  "finalExercise": {
    "title": "Tổng kết tài liệu",
    "questions": [
      {
        "prompt": "...",
        "ordering": 1,
        "points": 1,
        "questionType": "SINGLE_CHOICE",
        "options": [
          { "content": "...", "isCorrect": false },
          { "content": "...", "isCorrect": true },
          { "content": "...", "isCorrect": false },
          { "content": "...", "isCorrect": false }
        ]
      }
    ]
  }
}

────────────────────────────────────────────────────────
QUY TẮC BẮT BUỘC
────────────────────────────────────────────────────────
- Không được viết thêm chữ nào ngoài JSON.
- Không được bao JSON bằng markdown (không dùng \`\`\`json).
- JSON phải hợp lệ tuyệt đối.
- Không được tạo thông tin sai lệch so với tài liệu.
- Mỗi câu chỉ có 1 đáp án đúng.
- Không được tự sáng tạo nội dung không tồn tại trong tài liệu.
- Câu hỏi phải có chất lượng cao, kiểm tra hiểu biết sâu về nội dung.
- Các đáp án sai phải hợp lý và có tính nhiễu (distractors).

HÃY TRẢ VỀ CHỈ JSON, KHÔNG CÓ GÌ KHÁC.`;
  }

  /**
   * Gọi AI để sinh câu hỏi từ nội dung tài liệu
   */
  async generateQuestionsFromContent(
    documentContent: string
  ): Promise<GeneratedContent> {
    try {
      // Lấy AI generation provider
      const provider =
        await ProviderFactory.createGenerationProviderWithFallback();

      // Tạo prompt
      const prompt = this.buildPrompt(documentContent);

      // Gọi AI để sinh câu hỏi
      const response = await provider.generateResponse(prompt);

      // Trích xuất và parse JSON từ response
      const generatedContent = this.extractAndParseJson(response);

      // Validate structure
      this.validateGeneratedContent(generatedContent);

      return generatedContent;
    } catch (error) {
      console.error("Error generating questions from content:", error);
      if (error instanceof SyntaxError) {
        throw new Error(
          "AI returned invalid JSON format. Please try again."
        );
      }
      throw new Error("Failed to generate questions from content");
    }
  }

  /**
   * Trích xuất và parse JSON từ response của AI với nhiều chiến lược
   */
  private extractAndParseJson(response: string): GeneratedContent {
    let content = response.trim();

    // Loại bỏ markdown code block nếu có
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    }

    // Tìm JSON object trong response
    const startIndex = content.indexOf("{");
    const lastIndex = content.lastIndexOf("}");

    if (startIndex === -1 || lastIndex === -1 || lastIndex <= startIndex) {
      console.error("No valid JSON object found in response");
      console.error("Response content:", content.substring(0, 1000));
      throw new SyntaxError("No JSON object found in response");
    }

    let jsonStr = content.substring(startIndex, lastIndex + 1);

    // Thử parse trực tiếp
    try {
      return JSON.parse(jsonStr);
    } catch (firstError) {
      console.log("First parse attempt failed, trying to fix JSON...");
      console.log("Error:", firstError);
    }

    // Nếu thất bại, thử sửa các lỗi phổ biến
    try {
      // Loại bỏ các ký tự điều khiển không hợp lệ (nhưng giữ \n, \r, \t trong strings)
      // Chỉ loại bỏ raw control characters không nằm trong escape sequence
      jsonStr = jsonStr
        // Loại bỏ BOM và các ký tự không in được
        .replace(/^\uFEFF/, "")
        // Thay thế các control characters raw (không phải escape sequence)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

      return JSON.parse(jsonStr);
    } catch (secondError) {
      console.log("Second parse attempt failed");
      console.log("Error:", secondError);
    }

    // Thử dùng cách khác: normalize whitespace trong JSON
    try {
      // Parse từng dòng và rebuild
      const lines = jsonStr.split("\n");
      const cleanedLines = lines.map((line) => line.trim()).filter((line) => line);
      jsonStr = cleanedLines.join(" ");

      return JSON.parse(jsonStr);
    } catch (thirdError) {
      console.log("Third parse attempt failed");
      console.log("Error:", thirdError);
      console.log("JSON string (first 2000 chars):", jsonStr.substring(0, 2000));
    }

    throw new SyntaxError("Failed to parse JSON after multiple attempts");
  }

  /**
   * Validate cấu trúc JSON trả về từ AI
   */
  private validateGeneratedContent(content: GeneratedContent): void {
    if (!content.summary || typeof content.summary !== "string") {
      throw new Error("Invalid summary in generated content");
    }

    if (!Array.isArray(content.chapters) || content.chapters.length === 0) {
      throw new Error("Invalid or empty chapters array");
    }

    for (const chapter of content.chapters) {
      if (!chapter.chapterTitle || !chapter.summary) {
        throw new Error("Invalid chapter structure");
      }

      if (!Array.isArray(chapter.questions) || chapter.questions.length === 0) {
        throw new Error(`Chapter "${chapter.chapterTitle}" has no questions`);
      }

      for (const question of chapter.questions) {
        this.validateQuestion(question);
      }
    }

    if (!content.finalExercise || !content.finalExercise.title) {
      throw new Error("Invalid finalExercise structure");
    }

    if (
      !Array.isArray(content.finalExercise.questions) ||
      content.finalExercise.questions.length === 0
    ) {
      throw new Error("finalExercise has no questions");
    }

    for (const question of content.finalExercise.questions) {
      this.validateQuestion(question);
    }
  }

  /**
   * Validate từng câu hỏi
   */
  private validateQuestion(question: Question): void {
    if (!question.prompt || typeof question.prompt !== "string") {
      throw new Error("Invalid question prompt");
    }

    if (question.questionType !== "SINGLE_CHOICE") {
      throw new Error(
        `Invalid question type: ${question.questionType}. Only SINGLE_CHOICE is supported.`
      );
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(
        `Question must have exactly 4 options. Found: ${question.options?.length || 0}`
      );
    }

    const correctOptions = question.options.filter((opt) => opt.isCorrect);
    if (correctOptions.length !== 1) {
      throw new Error(
        `Question must have exactly 1 correct option. Found: ${correctOptions.length}`
      );
    }

    for (const option of question.options) {
      if (!option.content || typeof option.content !== "string") {
        throw new Error("Invalid option content");
      }
      if (typeof option.isCorrect !== "boolean") {
        throw new Error("Invalid option isCorrect value");
      }
    }
  }

  /**
   * Process toàn bộ: từ file URL → text → AI → generated content
   */
  async generateQuestionsFromFile(
    fileUrl: string,
    fileFormat: string
  ): Promise<GeneratedContent> {
    // 1. Extract text from file
    const documentContent = await this.extractTextFromFile(fileUrl, fileFormat);

    // 2. Generate questions from text
    const generatedContent =
      await this.generateQuestionsFromContent(documentContent);

    return generatedContent;
  }

  /**
   * Tạo prompt để AI sinh câu hỏi từ tên file (sử dụng kiến thức chung của LLM)
   */
  private buildPromptFromFileName(
    fileName: string,
    numberOfChapters: number = 7,
    questionsPerChapter: number = 10
  ): string {
    // Loại bỏ extension và format tên file thành topic
    const topicName = fileName
      .replace(/\.[^/.]+$/, "") // Bỏ extension
      .replace(/[-_]/g, " ") // Thay thế dấu - và _ bằng khoảng trắng
      .replace(/([A-Z])/g, " $1") // Thêm khoảng trắng trước chữ hoa (camelCase)
      .trim();

    return `/no think
Bạn là một trợ lý AI chuyên tạo bài tập trắc nghiệm về các chủ đề học tập.

CHỦ ĐỀ CẦN TẠO CÂU HỎI: "${topicName}"

NHIỆM VỤ: Sử dụng kiến thức của bạn về chủ đề "${topicName}", tạo bộ câu hỏi trắc nghiệm với cấu trúc sau:

1. Tóm tắt chủ đề (2-3 câu)
2. Chia thành ${numberOfChapters} chương, mỗi chương có ${questionsPerChapter} câu hỏi trắc nghiệm
3. Tạo bài tập tổng kết với ${questionsPerChapter} câu hỏi

XUẤT JSON THEO CẤU TRÚC:
{
  "summary": "Tóm tắt ngắn gọn về chủ đề",
  "chapters": [
    {
      "chapterTitle": "Tên chương",
      "summary": "Tóm tắt chương",
      "questions": [
        {
          "prompt": "Nội dung câu hỏi?",
          "ordering": 1,
          "points": 1,
          "questionType": "SINGLE_CHOICE",
          "options": [
            { "content": "Đáp án A", "isCorrect": false },
            { "content": "Đáp án B", "isCorrect": true },
            { "content": "Đáp án C", "isCorrect": false },
            { "content": "Đáp án D", "isCorrect": false }
          ]
        }
      ]
    }
  ],
  "finalExercise": {
    "title": "Tổng kết: ${topicName}",
    "questions": [...]
  }
}

QUY TẮC:
- CHỈ trả về JSON thuần túy, KHÔNG có markdown, KHÔNG có \`\`\`
- Mỗi câu hỏi có đúng 4 options, chỉ 1 đáp án đúng (isCorrect: true)
- Câu hỏi phải chính xác, dựa trên kiến thức thực tế
- Đáp án sai phải hợp lý (distractors)

TRẢ VỀ JSON NGAY BÂY GIỜ:`;
  }

  /**
   * Tạo câu hỏi từ tên file sử dụng kiến thức chung của LLM
   * Không cần đọc nội dung file, chỉ dựa vào tên file để xác định chủ đề
   */
  async generateQuestionsFromFileName(
    fileName: string,
    options?: {
      numberOfChapters?: number;
      questionsPerChapter?: number;
    }
  ): Promise<GeneratedContent> {
    try {
      const numberOfChapters = options?.numberOfChapters ?? 5;
      const questionsPerChapter = options?.questionsPerChapter ?? 10;

      // Lấy AI generation provider
      const provider =
        await ProviderFactory.createGenerationProviderWithFallback();

      // Tạo prompt từ tên file
      const prompt = this.buildPromptFromFileName(
        fileName,
        numberOfChapters,
        questionsPerChapter
      );

      console.log(`Generating questions for topic from file name: ${fileName}`);

      // Gọi AI để sinh câu hỏi
      const response = await provider.generateResponse(prompt);

      // Log response để debug
      console.log("AI Response length:", response.length);
      console.log("AI Response first 500 chars:", response.substring(0, 500));

      // Trích xuất và parse JSON từ response
      const jsonContent = this.extractAndParseJson(response);

      // Validate structure
      this.validateGeneratedContent(jsonContent);

      console.log(
        `Successfully generated ${jsonContent.chapters.length} chapters with questions`
      );

      return jsonContent;
    } catch (error) {
      console.error("Error generating questions from file name:", error);
      if (error instanceof SyntaxError) {
        throw new Error(
          "AI returned invalid JSON format. Please try again."
        );
      }
      throw new Error("Failed to generate questions from file name");
    }
  }
}

export const questionGenerationService = new QuestionGenerationService();
