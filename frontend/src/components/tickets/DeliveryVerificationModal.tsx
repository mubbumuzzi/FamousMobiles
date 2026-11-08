"use client";

import { useState, useRef } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  User,
  Phone,
  Smartphone,
  Tag,
  Package,
  ZoomIn,
  Loader2,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { Ticket, DevicePhoto } from "@/lib/types";
import { formatCurrency, formatCustomerMobiles } from "@/lib/utils";
import { getPhotoFullUrl } from "./DevicePhotoGallery";
import { SafeDeviceImage } from "./SafeDeviceImage";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { compressImage } from "@/lib/image-compressor";

interface DeliveryVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelivery: () => Promise<void>;
  ticket: Ticket;
  onQuickUploadPhoto?: (file: File) => Promise<void>;
}

export function DeliveryVerificationModal({
  isOpen,
  onClose,
  onConfirmDelivery,
  ticket,
  onQuickUploadPhoto,
}: DeliveryVerificationModalProps) {
  // Support Android back button to dismiss
  useAndroidBackButton(onClose, isOpen, 25);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [verifiedMatch, setVerifiedMatch] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingNow, setUploadingNow] = useState(false);

  const quickCameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const photos: DevicePhoto[] = ticket.photos || [];
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[Math.min(activePhotoIndex, photos.length - 1)] : null;
  const deviceName = `${ticket.brand || ""} ${ticket.model || "Device"}`.trim();

  const handleQuickCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onQuickUploadPhoto) return;
    e.target.value = "";
    setUploadingNow(true);
    try {
      const optimizedFile = await compressImage(file);
      await onQuickUploadPhoto(optimizedFile);
    } catch (err: any) {
      alert(err?.message || "Failed to upload photo");
    } finally {
      setUploadingNow(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirmDelivery();
      onClose();
    } catch (err) {
      // Error handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Delivery & Hand Over Verification</h2>
              <p className="text-[11px] text-emerald-100">
                Confirm phone appearance before handing over to customer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800">
          {/* Customer & Ticket ID banner */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{ticket.customer.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{formatCustomerMobiles(ticket.customer)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                {ticket.trackingNumber}
              </span>
            </div>
          </div>

          {/* Stored Photo Verification Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-blue-600" />
                <span>Device Intake Photo Reference</span>
              </label>
              {hasPhotos && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Intake Photo Available ✓
                </span>
              )}
            </div>

            {hasPhotos && currentPhoto ? (
              <div className="space-y-2">
                {/* Large Preview */}
                <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-slate-950 shadow-md">
                  <SafeDeviceImage
                    fileUrl={currentPhoto.fileUrl}
                    alt={`${deviceName} Intake Photo`}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-contain cursor-pointer"
                    onClick={() => setIsZoomed(!isZoomed)}
                  />

                  {/* Photo badge */}
                  <span className="absolute top-2 left-2 rounded-lg bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    {currentPhoto.photoType || "DEVICE PHOTO"} {photos.length > 1 ? `(#${activePhotoIndex + 1}/${photos.length})` : ""}
                  </span>

                  {/* Visual reminder overlay */}
                  <div className="absolute bottom-2 inset-x-2 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-white flex items-center justify-between">
                    <span>Match phone details, stickers, back cover & scratches</span>
                    <button
                      type="button"
                      onClick={() => setIsZoomed(!isZoomed)}
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:underline cursor-pointer"
                    >
                      <ZoomIn className="h-3 w-3" />
                      {isZoomed ? "Reset" : "Zoom"}
                    </button>
                  </div>
                </div>

                {/* Multiple Photos Switcher */}
                {photos.length > 1 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">View Intake Photo:</span>
                    {photos.map((p, idx) => (
                      <button
                        key={p.id || idx}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          activePhotoIndex === idx
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Photo #{idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/70 p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-amber-900">No device photo was captured at intake</p>
                <p className="text-[11px] text-amber-700 mt-0.5 mb-3 max-w-sm mx-auto">
                  Carefully check the physical brand, model, and accessories below to ensure you have the right phone.
                </p>

                {onQuickUploadPhoto && (
                  <div>
                    <input
                      ref={quickCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleQuickCameraCapture}
                    />
                    <button
                      type="button"
                      disabled={uploadingNow}
                      onClick={() => quickCameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100/50 active:scale-95 transition-all cursor-pointer"
                    >
                      {uploadingNow ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      <span>Snap Hand-Over Photo Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device Verification Specifications Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200/70 pb-2">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                Physical Device Details
              </span>
              <span className="text-emerald-700 font-bold">{deviceName}</span>
            </div>

            {(ticket.color || ticket.imei) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {ticket.color ? (
                  <div className="rounded-xl bg-white p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Device Color</span>
                    <span className="font-bold text-slate-800 text-xs inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block border border-slate-300" />
                      {ticket.color}
                    </span>
                  </div>
                ) : null}

                {ticket.imei ? (
                  <div className="rounded-xl bg-white p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">IMEI / Serial</span>
                    <span className="font-mono font-semibold text-slate-800 text-xs truncate block">
                      {ticket.imei}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Accessories Taken In */}
            {ticket.accessoriesReceived && ticket.accessoriesReceived.length > 0 && (
              <div className="rounded-xl bg-white p-2 border border-slate-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Accessories to Return to Customer:
                </span>
                <div className="flex flex-wrap gap-1">
                  {ticket.accessoriesReceived.map((acc, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Device Condition noted at intake */}
            {ticket.deviceCondition && ticket.deviceCondition.length > 0 && (
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Intake Condition: </span>
                {ticket.deviceCondition.join(", ")}
              </div>
            )}
          </div>

          {/* Verification Confirmation Checkbox */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedMatch}
                onChange={(e) => setVerifiedMatch(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-emerald-950 leading-snug">
                I visually verified that this phone in hand matches the intake photo & device color specifications for{" "}
                <span className="font-bold underline">{ticket.customer.fullName}</span>.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3.5 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || !verifiedMatch}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Confirm Match & Hand Over Phone</span>
          </button>
        </div>
      </div>
    </div>
  );
}
