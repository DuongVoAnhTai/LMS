import * as httpRequest from "@/utils/httpRequest";

export const getSignature = async (
  options: { folder?: string; tags?: string } = {}
): Promise<CloudinarySignature> => {
  try {
    // Bước 1: Lấy chữ ký từ API route
    const res = await httpRequest.post("cloudinary-signature", options);

    return res;
  } catch (error) {
    console.error("Get signature error:", error);
    throw error;
  }
};

export const uploadFile = async (
  file: File,
  folder: string
): Promise<CloudinaryUploadResult> => {
  try {
    // Bước 1: Lấy chữ ký từ API route
    const { signature, timestamp, cloudName, apiKey } = await getSignature({
      folder,
    });

    // Bước 2: Chuẩn bị FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("api_key", apiKey);
    formData.append("folder", folder);

    // 'auto' cho phép Cloudinary tự nhận diện loại file (image, video, raw)
    formData.append("resource_type", "auto");

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data: CloudinaryUploadResult = await response.json();

    if (!data.secure_url) {
      // Upload thành công, lấy URL
      throw new Error(data.error?.message || "Upload failed");
    }

    return data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
