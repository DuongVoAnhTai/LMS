import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payload = await verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const take = parseInt(searchParams.get("take") || "20");
    const cursor = searchParams.get("cursor");

    // Check if user is participant
    const participant = await prisma.conversationParticipants.findFirst({
      where: {
        conversationId: id,
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

    const messages = await prisma.messages.findMany({
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,

      where: {
        conversationId: id,
      },
      orderBy: { createdAt: "desc" }, // Sắp xếp từ cũ đến mới
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length === take) {
      // Nếu số lượng tin nhắn lấy được bằng số lượng yêu cầu,
      // có khả năng còn trang tiếp theo.
      // Cursor tiếp theo sẽ là ID của tin nhắn cuối cùng (cũ nhất) trong batch này.
      nextCursor = messages[take - 1].id;
    }

    return NextResponse.json({
      success: true,
      messages: messages.reverse(),
      count: messages.length,
      nextCursor,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get messages",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payload = await verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Message editing logic would go here
    // For now, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: "Message editing not implemented",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Update message error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update message",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payload = await verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Message deletion logic would go here
    // For now, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: "Message deletion not implemented",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete message",
      },
      { status: 500 }
    );
  }
}
