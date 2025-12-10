import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { ragService } from "@/services/rag";

const SUPPORTED_FORMATS = ["pdf", "doc", "docx", "txt"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Verify authentication
    const payload = await verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is participant of this conversation
    const participant = await prisma.conversationParticipants.findFirst({
      where: {
        conversationId,
        userId: payload.userId,
        isAi: false,
      },
    });

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized to access this conversation",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { fileUrl, fileName, fileFormat } = body;

    // Validate required fields
    if (!fileUrl || !fileName || !fileFormat) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fileUrl, fileName, fileFormat",
        },
        { status: 400 }
      );
    }

    // Validate file format
    const normalizedFormat = fileFormat.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(normalizedFormat)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format: ${fileFormat}. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Process file and store embeddings
    await ragService.processAndStoreFile(
      conversationId,
      fileUrl,
      fileName,
      normalizedFormat
    );

    return NextResponse.json({
      success: true,
      message: `File "${fileName}" processed and stored for RAG successfully`,
    });
  } catch (error) {
    console.error("Process file for RAG error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process file for RAG",
      },
      { status: 500 }
    );
  }
}
