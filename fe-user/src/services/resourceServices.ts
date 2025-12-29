// src/services/resourceServices.ts
import * as httpRequest from "@/utils/httpRequest";

type ResourceData = Omit<
  LearningResource,
  "id" | "skillId" | "createdAt" | "updatedAt"
>;

export const createResource = async (
  skillId: string,
  data: ResourceData
): Promise<ResourceServiceResponse> => {
  try {
    const res = await httpRequest.post(`skills/${skillId}/resources`, data);
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to create resource",
    };
  }
};

export const updateResource = async (
  resourceId: string,
  data: Partial<ResourceData>
): Promise<ResourceServiceResponse> => {
  try {
    const res = await httpRequest.put(`resources/${resourceId}`, data);
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to update resource",
    };
  }
};

export const deleteResource = async (
  resourceId: string
): Promise<ResourceServiceResponse> => {
  try {
    const res = await httpRequest.del(`resources/${resourceId}`);
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to delete resource",
    };
  }
};

export const generateQuestions = async (
  resourceId: string,
  options?: {
    useFileName?: boolean;
    numberOfChapters?: number;
    questionsPerChapter?: number;
  }
): Promise<{
  success?: boolean;
  message?: string;
  data?: {
    summary: string;
    chaptersCount: number;
    totalQuestionsCreated: number;
    exercisesCreated: string[];
    method?: string;
  };
  error?: string;
}> => {
  try {
    const res = await httpRequest.post(
      `resources/${resourceId}/generate-questions`,
      {
        // Sử dụng kiến thức chung của LLM thay vì đọc nội dung file (RAG)
        useFileName: options?.useFileName ?? true,
        numberOfChapters: options?.numberOfChapters ?? 7,
        questionsPerChapter: options?.questionsPerChapter ?? 10,
      }
    );
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to generate questions",
    };
  }
};

export const processRAG = async (
  resourceId: string
): Promise<{
  success?: boolean;
  message?: string;
  data?: {
    resourceId: string;
    fileName: string;
    skillId: string;
  };
  error?: string;
}> => {
  try {
    const res = await httpRequest.post(
      `resources/${resourceId}/process-rag`,
      {}
    );
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to process RAG",
    };
  }
};
