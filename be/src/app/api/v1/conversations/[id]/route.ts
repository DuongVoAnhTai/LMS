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

    // Lấy thông tin chi tiết của conversation
    const conversation = await prisma.conversations.findFirst({
      where: {
        id: id,
        // Điều kiện bảo mật: Đảm bảo người dùng này là một thành viên của cuộc trò chuyện
        participants: {
          some: {
            userId: payload.userId,
          },
        },
      },
      include: {
        // Lấy kèm danh sách người tham gia và thông tin của họ
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Nếu không tìm thấy conversation hoặc người dùng không có quyền truy cập
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error(`Get conversation error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to get conversation details" },
      { status: 500 }
    );
  }
}

// PATCH - Update conversation title
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

    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    // Kiểm tra conversation tồn tại và user là thành viên
    const conversation = await prisma.conversations.findFirst({
      where: {
        id: id,
        participants: {
          some: {
            userId: payload.userId,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Chỉ cho phép cập nhật với conversation nhóm hoặc AI
    if (!conversation.isGroup && !conversation.allowAi) {
      return NextResponse.json(
        { success: false, error: "Cannot update direct conversations" },
        { status: 400 }
      );
    }

    // Cập nhật conversation
    const updatedConversation = await prisma.conversations.update({
      where: { id: id },
      data: { title: title.trim() },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, conversation: updatedConversation });
  } catch (error) {
    console.error(`Update conversation error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete conversation
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

    // Kiểm tra conversation tồn tại và user là thành viên
    const conversation = await prisma.conversations.findFirst({
      where: {
        id: id,
        participants: {
          some: {
            userId: payload.userId,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Xóa tất cả messages trước
    await prisma.messages.deleteMany({
      where: { conversationId: id },
    });

    // Xóa tất cả participants
    await prisma.conversationParticipants.deleteMany({
      where: { conversationId: id },
    });

    // Xóa conversation
    await prisma.conversations.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    console.error(`Delete conversation error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
