import * as httpRequest from "@/utils/httpRequest";

export const getDashboardSummary = async (): Promise<any> => {
  try {
    const res = await httpRequest.get("dashboard/summary");
    return res;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || "Failed to fetch dashboard data",
    };
  }
};

export const getTeacherDashboardSummary = async (): Promise<any> => {
  try {
    const res = await httpRequest.get("dashboard/teacher-summary");
    return res;
  } catch (error: any) {
    return {
      error:
        error.response?.data?.error || "Failed to fetch teacher dashboard data",
    };
  }
};
