import { useState } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: number;
  whatsappUrl?: string;
  shareToken?: string;
}

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  whatsappUrl,
  shareToken,
}: VideoPlayerProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `video_${shareToken || "teq"}.mp4`;
    a.target = "_blank";
    a.click();
  };

  const handleShare = async () => {
    const shareUrl = videoUrl;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      window.open(shareUrl, "_blank");
    }
  };

  const durationStr = duration
    ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
    : "";

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-900 max-w-[320px]">
      {/* Video player */}
      <div className="relative">
        <video
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-[9/16] object-cover bg-black"
        />
      </div>

      {/* Info + actions */}
      <div className="p-3 space-y-2">
        {(title || durationStr) && (
          <div className="flex items-center justify-between text-xs text-zinc-400">
            {title && <span className="truncate">{title}</span>}
            {durationStr && <span>{durationStr}</span>}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Baixar
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {copied ? "Copiado!" : "Compartilhar"}
          </button>
        </div>
      </div>
    </div>
  );
}
