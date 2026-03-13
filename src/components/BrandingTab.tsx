import { useState, useEffect, useRef, useCallback } from "react";
import { useBranding, type BrandProfile } from "../hooks/useBranding";
import { uploadBrandLogo } from "../lib/api";

/* Map of display name → { family for CSS, Google Fonts family query, weight } */
const FONTS: { label: string; family: string; gfQuery: string; weight: number }[] = [
  { label: "Inter", family: "Inter", gfQuery: "Inter:wght@400", weight: 400 },
  { label: "Inter Bold", family: "Inter", gfQuery: "Inter:wght@700", weight: 700 },
  { label: "Montserrat", family: "Montserrat", gfQuery: "Montserrat:wght@400", weight: 400 },
  { label: "Montserrat Bold", family: "Montserrat", gfQuery: "Montserrat:wght@700", weight: 700 },
  { label: "Montserrat Light", family: "Montserrat", gfQuery: "Montserrat:wght@300", weight: 300 },
  { label: "Playfair Display", family: "Playfair Display", gfQuery: "Playfair+Display:wght@400", weight: 400 },
  { label: "Lora", family: "Lora", gfQuery: "Lora:wght@400", weight: 400 },
  { label: "Bebas Neue", family: "Bebas Neue", gfQuery: "Bebas+Neue", weight: 400 },
  { label: "Oswald", family: "Oswald", gfQuery: "Oswald:wght@400", weight: 400 },
  { label: "Poppins", family: "Poppins", gfQuery: "Poppins:wght@400", weight: 400 },
  { label: "Raleway", family: "Raleway", gfQuery: "Raleway:wght@400", weight: 400 },
  { label: "Caveat", family: "Caveat", gfQuery: "Caveat:wght@400", weight: 400 },
  { label: "Dancing Script", family: "Dancing Script", gfQuery: "Dancing+Script:wght@400", weight: 400 },
];

const FONT_OPTIONS = FONTS.map((f) => f.label);

/* Load a Google Font on demand (deduplicates by family+weight) */
const _loadedFonts = new Set<string>();

function ensureFontLoaded(label: string) {
  const entry = FONTS.find((f) => f.label === label);
  if (!entry) return;
  const key = `${entry.family}:${entry.weight}`;
  if (_loadedFonts.has(key)) return;
  _loadedFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${entry.gfQuery}&display=swap`;
  document.head.appendChild(link);
}

function fontStyle(label: string): React.CSSProperties {
  const entry = FONTS.find((f) => f.label === label);
  if (!entry) return {};
  return { fontFamily: `"${entry.family}", sans-serif`, fontWeight: entry.weight };
}

const EMPTY_FORM: Omit<BrandProfile, "id" | "user_id" | "created_at" | "updated_at"> = {
  name: "",
  is_default: false,
  primary_color: "#1A1A2E",
  secondary_color: "#16213E",
  accent_color: "#E94560",
  bg_color: "#0F0F0F",
  text_primary_color: "#FFFFFF",
  text_secondary_color: "#D0D0D0",
  font_heading: "Inter Bold",
  font_body: "Inter",
  logo_url: "",
  style_description: "",
  tone_of_voice: "",
  target_audience: "",
};

/* ── Reusable custom dropdown (matches PeriodSelect from AdminDashboard) ── */

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [close]);

  // Pre-load selected font so button renders correctly
  useEffect(() => { ensureFontLoaded(value); }, [value]);

  // When dropdown opens, load all fonts so preview works
  useEffect(() => {
    if (open) FONT_OPTIONS.forEach(ensureFontLoaded);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface-card text-content text-xs hover:border-content-4 transition-colors cursor-pointer"
      >
        <span className="truncate" style={fontStyle(value)}>{value}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-52 overflow-y-auto scrollbar-thin py-1 rounded-xl bg-surface-up border border-line shadow-lg">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { onChange(f); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                f === value ? "text-accent" : "text-content-2 hover:text-content hover:bg-surface-card"
              }`}
              style={fontStyle(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Color field ── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative w-8 h-8 rounded-lg border border-line overflow-hidden cursor-pointer flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-content-4 uppercase tracking-wider">{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-content text-xs font-mono focus:outline-none border-b border-transparent focus:border-line py-0.5"
        />
      </div>
    </div>
  );
}

/* ── Logo upload field ── */

function LogoField({
  logoUrl,
  token,
  onUploaded,
}: {
  logoUrl: string;
  token: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Maximo 5MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await uploadBrandLogo(token, file);
      onUploaded(res.url);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] text-content-4 uppercase tracking-wider">Logo (opcional)</label>
      <div className="mt-1.5 flex items-center gap-3">
        {/* Preview */}
        {logoUrl ? (
          <div className="relative w-12 h-12 rounded-lg border border-line overflow-hidden flex-shrink-0 bg-surface-card">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center text-content-3 hover:text-red-400 transition-colors"
              title="Remover logo"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg border border-dashed border-line flex items-center justify-center flex-shrink-0 bg-surface-card">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-4">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-lg border border-line text-content-2 text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {uploading && <span className="w-3 h-3 rounded-full border-2 border-content-3/40 border-t-content-3 animate-spin" />}
            {uploading ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
          </button>
          {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Slide preview ── */

function SlidePreview({ form }: { form: typeof EMPTY_FORM }) {
  // Ensure selected fonts are loaded for preview
  useEffect(() => {
    ensureFontLoaded(form.font_heading);
    ensureFontLoaded(form.font_body);
  }, [form.font_heading, form.font_body]);

  return (
    <div
      className="rounded-2xl border border-line overflow-hidden aspect-square max-w-[220px] w-full mx-auto flex flex-col items-center justify-center p-5 gap-3 transition-colors duration-300"
      style={{ backgroundColor: form.bg_color }}
    >
      {form.logo_url ? (
        <img src={form.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" />
      ) : (
        <div
          className="w-8 h-1 rounded-full"
          style={{ backgroundColor: form.accent_color }}
        />
      )}
      <div
        className="text-center text-sm leading-tight"
        style={{ color: form.text_primary_color, ...fontStyle(form.font_heading) }}
      >
        Titulo do Slide
      </div>
      <div
        className="text-center text-[10px] leading-relaxed"
        style={{ color: form.text_secondary_color, ...fontStyle(form.font_body) }}
      >
        Descricao de exemplo com o estilo da sua marca aplicado.
      </div>
      <div
        className="mt-1 px-3 py-1 rounded-full text-[9px] uppercase tracking-wider"
        style={{ backgroundColor: form.accent_color, color: form.bg_color, ...fontStyle(form.font_heading) }}
      >
        CTA Exemplo
      </div>
      <div className="flex gap-1.5 mt-1">
        {[form.primary_color, form.secondary_color, form.accent_color].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

/* ── Profile card ── */

interface ProfileCardProps {
  profile: BrandProfile;
  onEdit: (p: BrandProfile) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
  deleting: boolean;
}

function ProfileCard({ profile, onEdit, onDelete, onSetDefault, deleting }: ProfileCardProps) {
  return (
    <div className="rounded-2xl border border-line p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {profile.logo_url && (
            <img src={profile.logo_url} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0" />
          )}
          <span className="text-content text-sm font-medium truncate">{profile.name}</span>
          {profile.is_default && (
            <span className="text-[9px] uppercase tracking-wider text-accent border border-accent/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
              Padrao
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!profile.is_default && (
            <button
              onClick={() => onSetDefault(profile.id)}
              className="text-[10px] text-content-3 hover:text-content px-2 py-1 rounded-lg hover:bg-surface-card transition-colors uppercase tracking-wider"
            >
              Tornar padrao
            </button>
          )}
          <button
            onClick={() => onEdit(profile)}
            className="text-[10px] text-content-3 hover:text-content px-2 py-1 rounded-lg hover:bg-surface-card transition-colors uppercase tracking-wider"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(profile.id)}
            disabled={deleting}
            className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors uppercase tracking-wider disabled:opacity-40"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Color swatches */}
      <div className="flex items-center gap-1.5">
        {[profile.primary_color, profile.secondary_color, profile.accent_color, profile.bg_color, profile.text_primary_color].map(
          (c, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-md border border-line"
              style={{ backgroundColor: c }}
              title={c}
            />
          ),
        )}
        <span className="text-[10px] text-content-4 ml-1">{profile.font_heading}</span>
      </div>
    </div>
  );
}

/* ── Main tab ── */

export function BrandingTab({ token }: { token: string }) {
  const { profiles, loading, create, update, remove } = useBranding(token);
  const [editing, setEditing] = useState<BrandProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const isFormOpen = creating || editing !== null;

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        is_default: editing.is_default,
        primary_color: editing.primary_color,
        secondary_color: editing.secondary_color,
        accent_color: editing.accent_color,
        bg_color: editing.bg_color,
        text_primary_color: editing.text_primary_color,
        text_secondary_color: editing.text_secondary_color,
        font_heading: editing.font_heading,
        font_body: editing.font_body,
        logo_url: editing.logo_url || "",
        style_description: editing.style_description || "",
        tone_of_voice: editing.tone_of_voice || "",
        target_audience: editing.target_audience || "",
      });
    }
  }, [editing]);

  const handleStartCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, is_default: profiles.length === 0 });
    setCreating(true);
    setMessage("");
  };

  const handleCancel = () => {
    setEditing(null);
    setCreating(false);
    setMessage("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage("Nome da marca e obrigatorio.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (editing) {
        await update(editing.id, form);
        setMessage("Perfil atualizado.");
      } else {
        await create(form);
        setMessage("Perfil criado.");
      }
      setEditing(null);
      setCreating(false);
    } catch (err: any) {
      setMessage(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este perfil de marca?")) return;
    setDeleting(true);
    setMessage("");
    try {
      await remove(id);
      if (editing?.id === id) {
        setEditing(null);
        setCreating(false);
      }
      setMessage("Perfil excluido.");
    } catch (err: any) {
      setMessage(err.message || "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await update(id, { is_default: true } as any);
    } catch (err: any) {
      setMessage(err.message || "Erro ao definir padrao.");
    }
  };

  const updateField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-line/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-content-3">Identidade Visual</h3>
          <p className="text-xs text-content-4 mt-0.5">
            Configure cores, fontes e estilo da sua marca
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={handleStartCreate}
            className="px-3 py-1.5 rounded-lg bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Nova marca
          </button>
        )}
      </div>

      {/* Profile list */}
      {!isFormOpen && profiles.length > 0 && (
        <div className="space-y-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={(prof) => { setCreating(false); setEditing(prof); setMessage(""); }}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {!isFormOpen && profiles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center space-y-3">
          <div className="text-content-3 text-sm">Nenhuma marca configurada</div>
          <p className="text-xs text-content-4 max-w-xs mx-auto">
            Crie um perfil de marca para que o Teq use suas cores e fontes automaticamente ao gerar carrosseis e conteudos.
          </p>
          <button
            onClick={handleStartCreate}
            className="px-4 py-2 rounded-xl bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Criar minha marca
          </button>
        </div>
      )}

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-content font-medium">
              {editing ? `Editando: ${editing.name}` : "Novo perfil de marca"}
            </h4>
            <button
              onClick={handleCancel}
              className="text-xs text-content-3 hover:text-content uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Fields */}
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider">Nome da marca *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ex: Foto com Proposito"
                  className="w-full mt-1 bg-transparent border-b border-line-strong focus:border-content py-1.5 text-content placeholder-content-4 focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Colors */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider mb-2 block">Paleta de cores</label>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Primaria" value={form.primary_color} onChange={(v) => updateField("primary_color", v)} />
                  <ColorField label="Secundaria" value={form.secondary_color} onChange={(v) => updateField("secondary_color", v)} />
                  <ColorField label="Accent" value={form.accent_color} onChange={(v) => updateField("accent_color", v)} />
                  <ColorField label="Fundo" value={form.bg_color} onChange={(v) => updateField("bg_color", v)} />
                  <ColorField label="Texto principal" value={form.text_primary_color} onChange={(v) => updateField("text_primary_color", v)} />
                  <ColorField label="Texto secundario" value={form.text_secondary_color} onChange={(v) => updateField("text_secondary_color", v)} />
                </div>
              </div>

              {/* Fonts */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider mb-2 block">Fontes</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-content-4 mb-1">Titulos</div>
                    <FontSelect value={form.font_heading} onChange={(v) => updateField("font_heading", v)} />
                  </div>
                  <div>
                    <div className="text-[10px] text-content-4 mb-1">Corpo</div>
                    <FontSelect value={form.font_body} onChange={(v) => updateField("font_body", v)} />
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <LogoField
                logoUrl={form.logo_url}
                token={token}
                onUploaded={(url) => updateField("logo_url", url)}
              />

              {/* Style description */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider">Descricao do estilo (opcional)</label>
                <textarea
                  value={form.style_description}
                  onChange={(e) => updateField("style_description", e.target.value)}
                  placeholder="Ex: Minimalista, moderno, com bastante espaco negativo..."
                  rows={2}
                  className="w-full mt-1 bg-transparent border border-line rounded-lg px-3 py-2 text-content placeholder-content-4 focus:outline-none focus:border-content transition-colors text-xs resize-none"
                />
              </div>

              {/* Tone of voice */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider">Tom de voz (opcional)</label>
                <input
                  type="text"
                  value={form.tone_of_voice}
                  onChange={(e) => updateField("tone_of_voice", e.target.value)}
                  placeholder="Ex: Profissional e direto, Descontraido e acessivel..."
                  className="w-full mt-1 bg-transparent border-b border-line focus:border-content py-1.5 text-content placeholder-content-4 focus:outline-none transition-colors text-xs"
                />
              </div>

              {/* Target audience */}
              <div>
                <label className="text-[10px] text-content-4 uppercase tracking-wider">Publico-alvo (opcional)</label>
                <input
                  type="text"
                  value={form.target_audience}
                  onChange={(e) => updateField("target_audience", e.target.value)}
                  placeholder="Ex: Fotografos iniciantes, Empreendedores digitais..."
                  className="w-full mt-1 bg-transparent border-b border-line focus:border-content py-1.5 text-content placeholder-content-4 focus:outline-none transition-colors text-xs"
                />
              </div>

              {/* Default toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => updateField("is_default", e.target.checked)}
                  className="w-4 h-4 rounded border-line accent-accent"
                />
                <span className="text-xs text-content-2">Usar como marca padrao</span>
              </label>
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <label className="text-[10px] text-content-4 uppercase tracking-wider block text-center">Preview</label>
              <SlidePreview form={form} />
              <p className="text-[10px] text-content-4 text-center">
                Visualizacao aproximada de como ficaria um slide com esse branding.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-5 py-2.5 rounded-xl bg-content text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
            >
              {saving && <span className="w-3 h-3 rounded-full border-2 border-surface/40 border-t-surface animate-spin" />}
              {editing ? "Salvar alteracoes" : "Criar perfil"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl border border-line text-content-3 text-xs font-medium uppercase tracking-wider hover:text-content transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-xs text-content-3">{message}</p>}
    </div>
  );
}
