import { useState, useEffect, useRef } from "react";
import {
  listAvatars,
  createAvatar,
  activateAvatar,
  deleteAvatar,
  addVoiceToAvatar,
  removeVoiceFromAvatar,
} from "../lib/api";

interface Avatar {
  id: string;
  media_type: string;
  media_urls: string[];
  reference_frames: string[];
  is_active: boolean;
  label: string | null;
  voice_id: string | null;
  voice_name: string | null;
  voice_sample_url: string | null;
  has_voice: boolean;
  created_at: string;
}

interface Props {
  token: string;
}

export default function AvatarManager({ token }: Props) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cloningVoice, setCloningVoice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatarForVoice, setSelectedAvatarForVoice] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      const data = await listAvatars(token);
      setAvatars(data.avatars || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [token]);

  const handleCreate = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCreating(true);
    setError("");
    try {
      await createAvatar(token, Array.from(files), newLabel || undefined);
      setNewLabel("");
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateAvatar(token, id);
      await reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que quer apagar este avatar?")) return;
    try {
      await deleteAvatar(token, id);
      await reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleVoiceUpload = async (avatarId: string, file: File) => {
    setCloningVoice(avatarId);
    setError("");
    try {
      await addVoiceToAvatar(token, avatarId, file);
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCloningVoice(null);
    }
  };

  const handleRemoveVoice = async (avatarId: string) => {
    try {
      await removeVoiceFromAvatar(token, avatarId);
      await reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startRecording = async (avatarId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice_sample.webm", { type: "audio/webm" });
        await handleVoiceUpload(avatarId, file);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setSelectedAvatarForVoice(avatarId);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (e: any) {
      setError("Erro ao acessar microfone: " + e.message);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin p-4">
      <h2 className="text-lg font-bold text-content mb-4">Meus Avatares</h2>
      <p className="text-sm text-content-3 mb-6">
        Configure seu avatar com fotos e voz para gerar videos realisticos.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            fechar
          </button>
        </div>
      )}

      {/* Create new avatar */}
      <div className="mb-6 p-4 rounded-xl border border-line bg-surface-card">
        <h3 className="text-sm font-semibold text-content mb-3">Criar novo avatar</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-content-3 block mb-1">Nome (opcional)</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Eu profissional"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-content focus:border-accent outline-none"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {creating ? "Enviando..." : "Upload fotos (1-4)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleCreate(e.target.files)}
          />
        </div>
      </div>

      {/* Avatar list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : avatars.length === 0 ? (
        <p className="text-center text-content-3 py-8">
          Nenhum avatar configurado. Envie fotos para criar seu primeiro avatar.
        </p>
      ) : (
        <div className="space-y-4">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`p-4 rounded-xl border transition ${
                avatar.is_active
                  ? "border-accent bg-accent/5"
                  : "border-line bg-surface-card hover:border-content-4"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-content">
                      {avatar.label || "Avatar"}
                    </span>
                    {avatar.is_active && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                        Ativo
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-content-3">
                    {avatar.media_type === "photo"
                      ? `${avatar.reference_frames.length} foto(s)`
                      : "Video"}{" "}
                    | {new Date(avatar.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!avatar.is_active && (
                    <button
                      onClick={() => handleActivate(avatar.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-line text-content-3 hover:border-accent hover:text-accent transition"
                    >
                      Ativar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(avatar.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line text-content-3 hover:border-red-500 hover:text-red-400 transition"
                    title="Apagar avatar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Photo previews */}
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {avatar.reference_frames.slice(0, 4).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Ref ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-line flex-shrink-0"
                  />
                ))}
              </div>

              {/* Voice section */}
              <div className="flex items-center gap-3 pt-3 border-t border-line">
                {avatar.has_voice ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-green-400">
                        Voz clonada
                      </span>
                      <span className="text-xs text-content-3 ml-1">
                        ({avatar.voice_name || "Sem nome"})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveVoice(avatar.id)}
                      className="ml-auto text-xs text-red-400 hover:text-red-300"
                    >
                      Remover voz
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-content-4/20 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-content-3">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    </div>
                    <span className="text-xs text-content-3">Sem voz clonada</span>

                    {cloningVoice === avatar.id ? (
                      <span className="ml-auto text-xs text-accent animate-pulse">
                        Clonando voz...
                      </span>
                    ) : isRecording && selectedAvatarForVoice === avatar.id ? (
                      <button
                        onClick={stopRecording}
                        className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white animate-pulse"
                      >
                        <span className="w-2 h-2 rounded-full bg-white" />
                        Parar ({recordingDuration}s)
                      </button>
                    ) : (
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => startRecording(avatar.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-line text-content-3 hover:border-accent hover:text-accent transition"
                        >
                          Gravar voz
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAvatarForVoice(avatar.id);
                            voiceInputRef.current?.click();
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-line text-content-3 hover:border-accent hover:text-accent transition"
                        >
                          Upload audio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden voice file input */}
      <input
        ref={voiceInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedAvatarForVoice) {
            handleVoiceUpload(selectedAvatarForVoice, file);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
