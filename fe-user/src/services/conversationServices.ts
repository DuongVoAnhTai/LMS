import * as httpRequest from "@/utils/httpRequest";

export const getConversations = async (
  params: { take?: number; cursor?: string } = {}
) => {
  try {
    const res = await httpRequest.get("conversations", { params });
    // Service giờ sẽ trả về cả 'conversations' và 'nextCursor'
    return res; // { success: true, conversations: [...], count: number }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to fetch conversations" };
  }
};

export const getConversationById = async (conversationId: string) => {
  try {
    const res = await httpRequest.get(`conversations/${conversationId}`);
    return res; // { success: true, conversation: {...} }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to fetch conversation details" };
  }
};

export const createConversation = async (
  title?: string,
  participantIds: string[] = [],
  isGroup = false,
  allowAi = false
) => {
  try {
    const res = await httpRequest.post("conversations", {
      title,
      participantIds,
      isGroup,
      allowAi,
    });
    console.log("createConversation response:", res);

    return res; // { success: true, conversation: {...} }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return {
        error: error.response.data.error,
        existingConversationId: error.response.data.existingConversationId,
      };
    }
    return { error: "Failed to create conversation" };
  }
};

export const getMessages = async (
  conversationId: string,
  params: { take?: number; cursor?: string } = {}
) => {
  try {
    const res = await httpRequest.get(
      `conversations/${conversationId}/message`,
      { params }
    );
    return res; // { success: true, messages: [...], count: number }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to fetch messages" };
  }
};

export const processFileForRAG = async (
  conversationId: string,
  fileData: { fileUrl: string; fileName: string; fileFormat: string }
) => {
  try {
    const res = await httpRequest.post(
      `conversations/${conversationId}/rag/process-file`,
      fileData
    );
    return res; // { success: true, message: "..." }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to process file for RAG" };
  }
};

export const updateConversation = async (
  conversationId: string,
  title: string
) => {
  try {
    const res = await httpRequest.patch(`conversations/${conversationId}`, {
      title,
    });
    return res; // { success: true, conversation: {...} }
  } catch (error: any) {
    console.error("Update conversation error:", error);
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    if (error.message) {
      return { error: error.message };
    }
    return { error: "Failed to update conversation" };
  }
};

export const deleteConversation = async (conversationId: string) => {
  try {
    const res = await httpRequest.del(`conversations/${conversationId}`);
    return res; // { success: true, message: "..." }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to delete conversation" };
  }
};
