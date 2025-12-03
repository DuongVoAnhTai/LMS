import { prisma } from "@/lib/prisma";
import { Server, Socket } from "socket.io";
import { ragService } from '../../services/rag';

type ContentType = "TEXT" | "IMAGE" | "FILE";

export const handleSendMessage = async (
  socket: Socket,
  io: Server,
  data: {
    conversationId: string;
    content: string;
    contentType?: ContentType;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileFormat?: string;
  },
  ack: (response: any) => void
) => {
  const {
    conversationId,
    content,
    contentType,
    fileUrl,
    fileName,
    fileSize,
    fileFormat,
  } = data;
  const userId = socket.data.user.userId;

  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return ack({ error: "Message content is required" });
    }
    if (content.length > 5000) {
      return ack({ error: "Message too long (max 5000 characters)" });
    }

    // Kiểm tra conversation tồn tại
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return ack({ error: "Conversation not found" });
    }

    // Kiểm tra user là participant
    const participant = await prisma.conversationParticipants.findFirst({
      where: { conversationId, userId, isAi: false },
    });
    if (!participant) {
      return ack({
        error: "Not authorized to send message in this conversation",
      });
    }
    if (participant.isMuted) {
      return ack({ error: "You are muted in this conversation" });
    }

    // Kiểm tra tin nhắn trùng lặp (dựa trên content và thời gian gần đây)
    const recentMessage = await prisma.messages.findFirst({
      where: {
        conversationId,
        senderUserId: userId,
        content: content.trim(),
        createdAt: { gte: new Date(Date.now() - 1000) }, // Trong 1 giây
      },
    });
    if (recentMessage) {
      return ack({ success: true, message: recentMessage }); // Trả về tin nhắn đã có
    }

    // Tạo message
    const message = await prisma.messages.create({
      data: {
        conversationId,
        senderUserId: userId,
        senderType: "USER",
        content: content.trim(),
        contentType: data.contentType || "TEXT",
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileFormat: data.fileFormat,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    // Cập nhật conversations.updatedAt
    await prisma.conversations.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Broadcast đến room
    io.to(conversationId).emit("new-message", message);

    if (fileUrl && fileName && fileFormat) {
      const supportedFormats = ['pdf', 'docx', 'txt', 'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      const normalizedFormat = fileFormat.toLowerCase();

      if (supportedFormats.some(fmt => normalizedFormat.includes(fmt))) {
        try {
          // Emit processing status
          io.to(conversationId).emit('file-processing', {
            status: 'processing',
            fileName,
          });

          // Xử lý và lưu file vào vector store
          await ragService.processAndStoreFile(
            conversationId,
            fileUrl,
            fileName,
            fileFormat
          );

          // Emit success
          io.to(conversationId).emit('file-processing', {
            status: 'completed',
            fileName,
          });
        } catch (fileError) {
          console.error('File processing error:', fileError);
          io.to(conversationId).emit('file-processing', {
            status: 'failed',
            fileName,
            error: 'Failed to process file',
          });
        }
      }
    }

    // Lưu text message vào vector store (background task)
    if (contentType === 'TEXT' && content.length > 20) {
      ragService.storeTextMessage(
        conversationId,
        content,
        userId
      ).catch(err => {
        console.error('Error storing text message:', err);
      });
    }
    // Emit typing indicator
    // io.to(conversationId).emit('ai-typing', { isTyping: true });

    // Gửi ack cho người dùng ngay, không cần chờ AI
    ack({ success: true, message });

    // Xử lý AI response
    // if (conversation.allowAi) {
    //   processAiResponse(
    //     conversationId,
    //     content,
    //     io,
    //     contentType,
    //     fileUrl,
    //     fileName,
    //     fileSize,
    //     fileFormat
    //   );
    // }

    // Lấy conversation history (tuỳ chọn - để cải thiện context)
    const recentMessages = await prisma.messages.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Lấy 10 tin nhắn gần nhất
      select: {
        senderType: true,
        content: true,
      },
    });

    const conversationHistory = recentMessages
      .reverse()
      .filter((msg): msg is { senderType: 'USER' | 'AI'; content: string } => msg.content !== null)
      .map(msg => ({
        role: msg.senderType === 'USER' ? 'USER' : 'AI',
        content: msg.content,
      }));
    // Tạo AI reply sử dụng RAG
    const aiContent = await ragService.generateReply(
      conversationId,
      content,
      conversationHistory
    );
    // Lưu tin nhắn AI
    const aiMessage = await prisma.messages.create({
      data: {
        conversationId,
        senderType: 'AI',
        content: aiContent,
        contentType: 'TEXT',
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    // Stop typing và gửi tin nhắn AI
    // io.to(conversationId).emit('ai-typing', { isTyping: false });
    // io.to(conversationId).emit('new-message', aiMessage);

    // Lưu AI reply vào vector store (background)
    ragService.storeTextMessage(
      conversationId,
      aiContent,
      aiMessage.id
    ).catch(err => {
      console.error('Error storing AI message:', err);
    });

    ack({ success: true, message });
  } catch (error: any) {
    console.error(`Send message error for user ${userId}:`, error.message);
    ack({ error: `Failed to send message: ${error.message}` });
  }
};

// async function processAiResponse(
//   conversationId: string,
//   userContent: string,
//   io: Server,
//   contentType?: ContentType,
//   fileUrl?: string,
//   fileName?: string,
//   fileSize?: number,
//   fileFormat?: string
// ) {
//   try {
//     // 1. Gọi đến dịch vụ AI của bạn (ví dụ: OpenAI, Gemini)
//     const aiContent = await getAiReply(userContent); // Đây là hàm giả định

//     // 2. Tạo tin nhắn AI trong CSDL
//     const aiMessage = await prisma.messages.create({
//       data: {
//         conversationId,
//         senderType: "AI",
//         content: `AI response to: ${userContent}`,
//         contentType: contentType || "TEXT",
//         fileUrl: fileUrl,
//         fileName: fileName,
//         fileSize: fileSize,
//         fileFormat: fileFormat,
//       },
//       include: {
//         sender: {
//           select: { id: true, username: true, avatarUrl: true },
//         },
//       },
//     });

//     // 3. Gửi tin nhắn AI đến client
//     io.to(conversationId).emit("new-message", aiMessage);
//   } catch (error) {
//     console.error("AI processing error:", error);
//     // Có thể gửi một tin nhắn lỗi về cho client
//     io.to(conversationId).emit("ai-error", {
//       message: "AI is currently unavailable",
//     });
//   }
// }

// function getAiReply(userContent: string) {
//   console.log(userContent);
// }
