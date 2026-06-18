"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import {
  removeMyProfileAvatar,
  uploadMyProfileAvatar,
} from "@/lib/peer-chat/peer-chat-client";
import { resizeProfileImageFile } from "@/lib/profile/resize-profile-image";
import { cn } from "@/lib/utils";

type RimvioProfilePhotoProps = {
  avatarUrl: string | null;
  displayName: string;
  fallbackImageUrl?: string | null;
  editable?: boolean;
  size?: "md" | "lg";
  onAvatarChange?: (url: string | null) => void;
  className?: string;
  showHint?: boolean;
};

export function RimvioProfilePhoto({
  avatarUrl,
  displayName,
  fallbackImageUrl,
  editable = true,
  size = "lg",
  onAvatarChange,
  className,
  showHint = true,
}: RimvioProfilePhotoProps) {
  const copy = useCopy();
  const ap = copy.settings.accountProfile;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const initial =
    displayName.trim().charAt(0) ||
    fallbackImageUrl?.charAt(0) ||
    "?";
  const shownUrl = preview ?? avatarUrl ?? fallbackImageUrl ?? null;
  const dim = size === "lg" ? "size-24" : "size-16";
  const iconDim = size === "lg" ? "size-5" : "size-4";

  const pickPhoto = () => {
    if (!editable || uploading) {
      return;
    }
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const resized = await resizeProfileImageFile(file);
      const objectUrl = URL.createObjectURL(resized);
      setPreview(objectUrl);
      const { avatarUrl: next } = await uploadMyProfileAvatar(resized);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
      onAvatarChange?.(next);
      toast.success(ap.photoChanged);
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const removePhoto = async () => {
    if (!editable || uploading || !shownUrl) {
      return;
    }
    setUploading(true);
    try {
      await removeMyProfileAvatar();
      setPreview(null);
      onAvatarChange?.(null);
      toast.success(ap.photoRemoved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        disabled={!editable || uploading}
        onClick={pickPhoto}
        className={cn(
          "relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rimvio-neon-purple/60",
          editable && "cursor-pointer active:scale-[0.98]",
          !editable && "cursor-default",
        )}
        aria-label={editable ? "프로필 사진 변경" : "프로필 사진"}
      >
        <div
          className={cn(
            dim,
            "overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 p-[3px] shadow-[0_6px_20px_rgba(99,102,241,0.2)]",
          )}
        >
          <div className="relative size-full overflow-hidden rounded-full bg-rimvio-surface">
            {shownUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-semibold text-white">
                {initial}
              </span>
            )}
            {uploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                <Loader2 className={cn(iconDim, "animate-spin text-white")} aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
        {editable ? (
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-rimvio-surface bg-rimvio-neon-purple text-white shadow-md">
            <Camera className="size-4" aria-hidden />
          </span>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {showHint && editable && shownUrl ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => void removePhoto()}
          className="text-[11px] font-medium text-white/55 underline-offset-2 hover:text-white/80 hover:underline disabled:opacity-40"
        >
          {ap.photoRemove}
        </button>
      ) : showHint && editable ? (
        <p className="flex items-center gap-1 text-[11px] text-white/50">
          <User className="size-3" aria-hidden />
          {ap.photoTapHint}
        </p>
      ) : null}
    </div>
  );
}
