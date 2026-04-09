import { useState, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface VideoUploadProps {
  onUploaded: (url: string, filename: string) => void;
  token: string;
}

export default function VideoUpload({ onUploaded, token }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError("");

      // Validate
      const allowed = ["video/mp4", "video/quicktime", "video/webm"];
      if (!allowed.includes(file.type)) {
        setError("Formato nao suportado. Aceitos: MP4, MOV, WebM.");
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError("Arquivo muito grande. Maximo: 500MB.");
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/video/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const result = await new Promise<{ url: string }>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(xhr.responseText || `Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(formData);
        });

        onUploaded(result.url, file.name);
      } catch (err: any) {
        setError(err.message || "Erro no upload");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [token, onUploaded]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
        ${dragOver ? "border-blue-500 bg-blue-500/10" : "border-zinc-600 hover:border-zinc-400"}
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div className="space-y-2">
          <div className="text-sm text-zinc-300">Enviando video... {progress}%</div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-sm text-zinc-300">
            Arraste um video aqui ou clique para selecionar
          </div>
          <div className="text-xs text-zinc-500">MP4, MOV ou WebM (max 500MB)</div>
        </div>
      )}

      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </div>
  );
}
