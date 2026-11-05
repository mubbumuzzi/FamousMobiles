"use client";

import { useEffect, useState } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { loadPhotoUrl } from "@/lib/photo-loader";

interface SafeDeviceImageProps {
  fileUrl?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
}

export function SafeDeviceImage({
  fileUrl,
  alt,
  className = "",
  imgClassName = "",
  onClick,
}: SafeDeviceImageProps) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(Boolean(fileUrl));
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!fileUrl) {
      setSrc("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    loadPhotoUrl(fileUrl)
      .then((resolved) => {
        if (!active) return;
        setSrc(resolved);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-900/60 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900/80 p-2 text-center ${className}`}>
        <ImageIcon className="h-6 w-6 text-slate-500 mb-1" />
        <span className="text-[10px] text-slate-400">Unable to load image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName || className}
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
}
