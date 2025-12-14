"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { getClientIp, buildRateLimitKey, checkRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";

const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Ad en az 2 karakter olmalıdır").max(100, "Ad en fazla 100 karakter olabilir").nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut parola gereklidir"),
  newPassword: z.string().min(8, "Yeni parola en az 8 karakter olmalıdır"),
  confirmPassword: z.string().min(1, "Parola onayı gereklidir"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Parolalar eşleşmiyor",
  path: ["confirmPassword"],
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export type UploadAvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; message: string };

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function updateProfileAction(
  input: z.infer<typeof updateProfileSchema>,
): Promise<UpdateProfileResult> {
  const originCheck = await enforceSameOriginForServerAction("updateProfileAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Lütfen alanları kontrol edin.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCachedUser();

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "profile.write", ip, userId: user.id }),
    policy: rateLimitPolicies["profile.write"],
    requestId: originCheck.requestId,
    context: { action: "updateProfileAction", userId: user.id },
  });
  if (!rl.ok) {
    return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };
  }

  const updateData: { full_name?: string | null } = {};
  if (parsed.data.full_name !== undefined) {
    updateData.full_name = parsed.data.full_name || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    logger.error("updateProfileAction.update failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
      userId: user.id,
    });
    return { ok: false, message: "Profil güncellenirken bir hata oluştu." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function uploadAvatarAction(file: File): Promise<UploadAvatarResult> {
  const originCheck = await enforceSameOriginForServerAction("uploadAvatarAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "Lütfen bir resim dosyası seçin." };
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Dosya boyutu 5MB'dan küçük olmalıdır." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCachedUser();

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "profile.write", ip, userId: user.id }),
    policy: rateLimitPolicies["profile.write"],
    requestId: originCheck.requestId,
    context: { action: "uploadAvatarAction", userId: user.id },
  });
  if (!rl.ok) {
    return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };
  }

  // Get old avatar URL before uploading new one
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Path should NOT include bucket name - just the file path within the bucket
  // Format: user-id/timestamp.ext
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;

  // Convert File to ArrayBuffer for server-side upload
  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error("uploadAvatarAction.upload failed", {
      requestId: originCheck.requestId,
      code: uploadError.message,
      userId: user.id,
    });

    // If file already exists, try to update it
    if (uploadError.message.includes("already exists")) {
      const { error: updateError } = await supabase.storage
        .from("avatars")
        .update(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (updateError) {
        return { ok: false, message: "Fotoğraf yüklenirken bir hata oluştu." };
      }
    } else {
      return { ok: false, message: "Fotoğraf yüklenirken bir hata oluştu." };
    }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    logger.error("uploadAvatarAction.update profile failed", {
      requestId: originCheck.requestId,
      code: updateError.code,
      message: updateError.message,
      userId: user.id,
    });
    // Try to delete uploaded file (if it was uploaded)
    if (uploadData?.path) {
      await supabase.storage.from("avatars").remove([uploadData.path]);
    }
    return { ok: false, message: "Profil güncellenirken bir hata oluştu." };
  }

  // Delete old avatar if exists (only if it's different from new one)
  if (oldProfile?.avatar_url && oldProfile.avatar_url !== publicUrl) {
    try {
      // Extract path from old URL
      // URL format: https://project.supabase.co/storage/v1/object/public/avatars/user-id/timestamp.ext
      const urlParts = oldProfile.avatar_url.split("/");
      const avatarsIndex = urlParts.findIndex((part) => part === "avatars");
      if (avatarsIndex !== -1 && avatarsIndex < urlParts.length - 1) {
        // Get path after "avatars" (user-id/timestamp.ext)
        const oldPath = urlParts.slice(avatarsIndex + 1).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    } catch (err) {
      // Log but don't fail if old avatar deletion fails
      logger.warn("uploadAvatarAction.deleteOldAvatar failed", {
        requestId: originCheck.requestId,
        userId: user.id,
        error: err,
      });
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { ok: true, avatarUrl: publicUrl };
}

export async function changePasswordAction(
  input: z.infer<typeof changePasswordSchema>,
): Promise<ChangePasswordResult> {
  const originCheck = await enforceSameOriginForServerAction("changePasswordAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Lütfen alanları kontrol edin.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCachedUser();

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  // Update password via Supabase Auth
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    logger.error("changePasswordAction.updateUser failed", {
      requestId: originCheck.requestId,
      message: error.message,
      userId: user.id,
    });

    // Handle specific Supabase errors
    if (error.message.includes("same")) {
      return { ok: false, message: "Yeni parola mevcut paroladan farklı olmalıdır." };
    }

    return { ok: false, message: "Parola değiştirilirken bir hata oluştu." };
  }

  return { ok: true };
}
