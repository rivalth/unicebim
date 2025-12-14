"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatarAction } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

type AvatarUploadProps = {
  currentAvatarUrl?: string | null;
  fullName?: string | null;
  userId: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function AvatarUpload({ currentAvatarUrl, fullName, size = "xl" }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentAvatarUrl ?? null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir resim dosyası seçin.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const result = await uploadAvatarAction(file);
      if (!result.ok) {
        setError(result.message);
        setPreviewUrl(currentAvatarUrl ?? null);
      } else {
        // Update preview with new URL if provided
        if (result.avatarUrl) {
          setPreviewUrl(result.avatarUrl);
        }
        setError(null); // Clear any previous errors on success
      }
    } catch (error) {
      // Handle network errors or other unexpected errors
      const errorMessage =
        error instanceof Error && error.message.includes("413")
          ? "Dosya boyutu çok büyük. Lütfen daha küçük bir dosya seçin (maksimum 5MB)."
          : "Yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.";
      setError(errorMessage);
      setPreviewUrl(currentAvatarUrl ?? null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar src={previewUrl} fallback={fullName ?? undefined} size={size} />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          id="avatar-upload"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          <Camera className="size-4" />
          {isUploading ? "Yükleniyor..." : previewUrl ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
        </Button>
        {error && (
          <p className={cn("text-xs text-destructive", "text-center max-w-xs")} role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          JPEG, PNG, WebP veya GIF. Maksimum 5MB.
        </p>
      </div>
    </div>
  );
}
