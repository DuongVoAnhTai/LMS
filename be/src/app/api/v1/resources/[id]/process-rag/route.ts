import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ragService } from "@/services/rag";

/**
 * POST /api/v1/resources/[id]/process-rag
 *
 * Xử lý file resource và lưu vào vector store cho RAG.
 *
 * Flow:
 * 1. Xác thực user (ADMIN hoặc TEACHER)
 * 2. Lấy thông tin resource từ database
 * 3. Download và extract text từ file
 * 4. Lưu vào vector store với resource_id
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;

    // 1. Xác thực user
    const payload = await verifyToken(req);
    if (!payload || !["ADMIN", "TEACHER"].includes(payload.role)) {
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
            "Only FILE type resources can be processed for RAG. Found: " +
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

    // 5. Parse file format từ URL
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

    // 6. Process RAG
    console.log(`[API] Processing RAG for resource ${resourceId}...`);
    await ragService.processAndStoreResource(
      resourceId,
      resource.url,
      resource.title || "Untitled",
      fileFormat
    );

    return NextResponse.json(
      {
        success: true,
        message: "Resource processed for RAG successfully",
        data: {
          resourceId,
          fileName: resource.title,
          skillId: resource.skillId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Process RAG error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process resource for RAG",
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
