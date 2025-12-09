import * as httpRequest from "@/utils/httpRequest";

/* =====================================================
   🔵 1. Đếm số bài học (skills)
===================================================== */
export const getLessonsCount = async () => {
  try {
    const res = await httpRequest.get("skills");

    // Trường hợp API trả mảng trực tiếp
    if (Array.isArray(res)) return res.length;

    // Trường hợp dạng { data: [...] }
    if (Array.isArray(res?.data)) return res.data.length;

    // Trường hợp dạng { skills: [...] }
    if (Array.isArray(res?.skills)) return res.skills.length;

    return 0;
  } catch (err) {
    console.log("LESSON COUNT ERROR:", err);
    return 0;
  }
};

/* =====================================================
   🔵 2. Lấy toàn bộ user
===================================================== */
export const getAllUsers = async () => {
  try {
    const res = await httpRequest.get("users");

    // Supabase REST trả mảng
    if (Array.isArray(res)) return res;

    // Một số API trả dạng { users: [...] }
    if (Array.isArray(res?.users)) return res.users;

    return [];
  } catch (error) {
    console.log("GET ALL USERS ERROR:", error);
    return [];
  }
};

/* =====================================================
   🔵 3. Tạo user mới
===================================================== */
export const createUser = async (data: any) => {
  try {
    return await httpRequest.post("users", data);
  } catch (error) {
    console.log("CREATE USER ERROR:", error);
    return null;
  }
};


export const updateUser = async (id: string, data: any) => {
  try {
    return await httpRequest.put(`users/${id}`, data);
  } catch (error) {
    console.log("UPDATE USER ERROR:", error);
    return null;
  }
};


export const deleteUser = async (id: string) => {
  try {
    return await httpRequest.del(`users/${id}`);
  } catch (error) {
    console.log("DELETE USER ERROR:", error);
    return null;
  }
};
