"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Trash2, X, ZoomIn, Eye, Loader2 } from "lucide-react";
import { DevicePhoto } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { getPhotoFullUrl, invalidatePhotoCache } from "@/lib/photo-loader";
import { SafeDeviceImage } from "./SafeDeviceImage";
import { compressImage } from "@/lib/image-compressor";

export { getPhotoFullUrl };

interface DevicePhotoGalleryProps {
  ticketId: string;
  brand?: string;
  model?: string;
  color?: string;
  photos: DevicePhoto[];
  onPhotosUpdated?: () => void;
  canEdit?: boolean;
}

export function DevicePhotoGallery({
  ticketId,
  brand,
  model,
  color,
  photos = [],
  onPhotosUpdated,
  canEdit = true,
}: DevicePhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DevicePhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, photoType: string = "DEVICE") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file fires change event
    e.target.value = "";

    setUploading(true);
    setError(null);

    try {
      // Optimize image on-device (fixes camera >5MB limit & HEIC on iPhone/Samsung)
      const optimizedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("photoType", photoType);

      await api(`/tickets/${ticketId}/photos?photoType=${encodeURIComponent(photoType)}`, {
        method: "POST",
        body: formData,
      });

      invalidatePhotoCache();

      if (onPhotosUpdated) {
        onPhotosUpdated();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to upload photo. Please check image format (JPEG/PNG/HEIC).");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!window.confirm("Are you sure you want to delete this device photo?")) return;
    setDeletingId(photoId);
    try {
      await api(`/tickets/${ticketId}/photos/${photoId}`, {
        method: "DELETE",
      });
      invalidatePhotoCache();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      if (onPhotosUpdated) {
        onPhotosUpdated();
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  const deviceLabel = `${brand || ""} ${model || "Device"}`.trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Device Photos & Shelf ID</h3>
              {photos.length > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {photos.length}/2 Photos
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Visual reference to match the exact phone in shop trays & confirm on delivery
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(e, "DEVICE")}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "DEVICE")}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-[10px] bg-[#121212] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#262626] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              <span>Snap Photo</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#121212] hover:bg-[#F7F7F8] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Upload from Gallery"
            >
              <ImageIcon className="h-3.5 w-3.5 text-[#767676]" />
              <span className="hidden sm:inline">Gallery</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Photo Display / Empty State */}
      <div className="mt-3">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 py-6 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs text-slate-400 mb-2">
              <Camera className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">No device photo stored yet</p>
            <p className="text-[11px] text-slate-500 max-w-sm mt-0.5 mb-3">
              Take a quick photo of the phone (case color, stickers, or scratches) to easily identify it in your shop trays and verify before returning to customer.
            </p>
            {canEdit && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <span>Take Phone Photo</span>
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span>Choose from Gallery</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 relative"
                >
                  {/* Single Image Thumbnail with Zoom */}
                  <div
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative h-28 w-28 sm:h-28 sm:w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-slate-900 shadow-sm"
                  >
                    <SafeDeviceImage
                      fileUrl={photo.fileUrl}
                      alt={`${deviceLabel} photo ${idx + 1}`}
                      className="h-full w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="rounded-full bg-white/95 p-1.5 text-slate-900 shadow-sm">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </div>
                    <span className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                      Photo #{idx + 1}
                    </span>
                    <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                      Tap to zoom
                    </span>
                  </div>

                  {/* Details & Actions */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 border border-emerald-200">
                        Photo #{idx + 1} ✓
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(photo.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium truncate">
                      {deviceLabel} {color ? `(${color})` : ""}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      Visual reference to match phone shelf tray & return securely.
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          disabled={deletingId === photo.id}
                          onClick={() => handleDelete(photo.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 px-2 py-1 text-xs font-medium transition-colors cursor-pointer"
                        >
                          {deletingId === photo.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {photos.length === 1 && canEdit && (
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 text-center cursor-pointer hover:bg-blue-50/70 transition-colors min-h-[120px]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-1.5">
                    <Camera className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-blue-900">+ Add 2nd Photo</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Capture screen, back cover, or IMEI</p>
                </div>
              )}
            </div>
            {photos.length >= 2 && canEdit && (
              <p className="text-[10px] text-slate-500 text-right">
                Maximum 2 photos limit reached. Uploading another replaces the oldest.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-bold">
                  {deviceLabel} {color ? `(${color})` : ""}
                </span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {selectedPhoto.photoType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Large Image */}
            <div className="flex items-center justify-center bg-black/50 p-2 max-h-[75vh] overflow-auto">
              <SafeDeviceImage
                fileUrl={selectedPhoto.fileUrl}
                alt={`${deviceLabel} Full View`}
                className="max-h-[70vh] w-auto max-w-full rounded-lg"
                imgClassName="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs text-white/70 bg-slate-950/50">
              <span>Uploaded {formatDate(selectedPhoto.createdAt)} {selectedPhoto.uploadedByName ? `by ${selectedPhoto.uploadedByName}` : ""}</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="rounded-lg bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
