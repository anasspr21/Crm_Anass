'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, DragEvent } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, DIVISION_MAP, getDivisionColor } from '@/lib/divisions';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  Upload, FileText, FileImage, File, Trash2, Download,
  Search, Grid3X3, List, X, Eye, AlertTriangle, Loader2,
  FileBadge, FileVideo, FileSpreadsheet, Check, Edit2, FolderOpen,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileRecord {
  id: string;
  folder_id: string | null;
  project_id: string | null;
  name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  division: DivisionKey;
  created_at: string;
}

interface UploadProgress {
  name: string;
  progress: number;
  done: boolean;
  error: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function FileTypeIcon({ mime, size = 28 }: { mime: string; size?: number }) {
  const s = { flexShrink: 0 as const };
  if (mime?.startsWith('image/')) return <FileImage size={size} style={{ ...s, color: '#7254C8' }} />;
  if (mime?.includes('pdf')) return <FileText size={size} style={{ ...s, color: '#D85A30' }} />;
  if (mime?.includes('word') || mime?.includes('document')) return <FileBadge size={size} style={{ ...s, color: '#378ADD' }} />;
  if (mime?.includes('sheet') || mime?.includes('excel') || mime?.includes('csv')) return <FileSpreadsheet size={size} style={{ ...s, color: '#1D9E75' }} />;
  if (mime?.startsWith('video/')) return <FileVideo size={size} style={{ ...s, color: '#D85A30' }} />;
  return <File size={size} style={{ ...s, color: '#888780' }} />;
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({
  files,
  defaultDivision,
  onConfirm,
  onCancel,
}: {
  files: File[];
  defaultDivision?: DivisionKey | null;
  onConfirm: (division: DivisionKey) => void;
  onCancel: () => void;
}) {
  const [selectedDivision, setSelectedDivision] = useState<DivisionKey>(defaultDivision ?? 'divers');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onCancel}
    >
      <div
        className="nm-card"
        style={{ padding: '32px', maxWidth: 480, width: '100%', borderRadius: 24 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 className="heading" style={{ fontSize: '1.25rem', margin: 0 }}>Importer des fichiers</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
            </p>
          </div>
          <button className="nm-btn" style={{ padding: '6px 10px' }} onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        {/* File list preview */}
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 14,
            boxShadow: 'var(--inset-xs)',
            padding: '12px 16px',
            marginBottom: 24,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < files.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <FileTypeIcon mime={f.type} size={18} />
              <span style={{ fontSize: '0.8rem', flex: 1 }} className="truncate">{f.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(f.size)}</span>
            </div>
          ))}
        </div>

        {/* Division picker */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Enregistrer dans la division
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          {DIVISIONS.map((div) => {
          const key = div.key;
            const color = getDivisionColor(key);
            const isSelected = selectedDivision === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedDivision(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--inset-sm)' : 'var(--raised-xs)',
                  background: isSelected ? `${color}12` : 'var(--bg)',
                  border: isSelected ? `1.5px solid ${color}40` : '1.5px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? color : 'var(--text-primary)' }}>
                  {div.label}
                </span>
                {isSelected && <Check size={12} style={{ marginLeft: 'auto', color }} />}
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          className="nm-btn nm-btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.9rem' }}
          onClick={() => onConfirm(selectedDivision)}
        >
          <Upload size={16} /> Importer dans {DIVISION_MAP[selectedDivision]?.label}
        </button>
      </div>
    </div>
  );
}

// ── Upload Progress Panel ─────────────────────────────────────────────────────

function UploadProgressPanel({ uploads, onClose }: { uploads: UploadProgress[]; onClose: () => void }) {
  const allDone = uploads.every(u => u.done || u.error);
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1500,
        background: 'var(--bg)', borderRadius: 18,
        boxShadow: 'var(--raised)', padding: '18px 20px',
        minWidth: 320, maxWidth: 380,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {allDone ? <Check size={14} style={{ color: '#1D9E75' }} /> : <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {allDone ? 'Import terminé !' : 'Import en cours…'}
        </span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      {uploads.map((u, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 500 }} className="truncate">{u.name}</span>
            <span style={{ fontSize: '0.65rem', color: u.error ? '#D85A30' : u.done ? '#1D9E75' : 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
              {u.error ? 'Erreur' : u.done ? '✓' : `${u.progress}%`}
            </span>
          </div>
          <div className="progress-track" style={{ height: 4 }}>
            <div
              className="progress-fill"
              style={{
                width: `${u.progress}%`,
                background: u.error ? '#D85A30' : u.done ? '#1D9E75' : undefined,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ file, signedUrl, onClose }: { file: FileRecord; signedUrl: string; onClose: () => void }) {
  const isImage = file.mime_type?.startsWith('image/');
  const isPdf = file.mime_type?.includes('pdf');
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--raised)', display: 'flex', flexDirection: 'column', minWidth: isPdf ? 700 : undefined, width: isPdf ? '80vw' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileTypeIcon mime={file.mime_type} size={18} />
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }} className="truncate">{file.name}</span>
          <button className="nm-btn" style={{ padding: '5px 8px' }} onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isImage ? 16 : 0 }}>
          {isImage && <img src={signedUrl} alt={file.name} style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 10, objectFit: 'contain' }} />}
          {isPdf && <iframe src={signedUrl} title={file.name} style={{ width: '100%', height: '75vh', border: 'none' }} />}
          {!isImage && !isPdf && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <File size={40} style={{ marginBottom: 12, color: 'var(--text-light)' }} />
              <p style={{ fontSize: '0.875rem' }}>Aperçu non disponible.</p>
              <a href={signedUrl} download={file.name} className="nm-btn nm-btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex' }}>
                <Download size={14} /> Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div className="nm-card" style={{ padding: '28px 32px', maxWidth: 380, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <AlertTriangle size={32} style={{ color: '#D85A30', marginBottom: 12 }} />
        <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 8 }}>Supprimer le fichier ?</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          «&nbsp;<strong>{name}</strong>&nbsp;» sera définitivement supprimé.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="nm-btn" onClick={onCancel}>Annuler</button>
          <button className="nm-btn" style={{ background: '#D85A30', color: '#fff', boxShadow: 'none' }} onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── File Card (grid) ──────────────────────────────────────────────────────────

function FileCard({ file, onDownload, onDelete, onPreview, onRename }: {
  file: FileRecord; onDownload: () => void; onDelete: () => void; onPreview: () => void; onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = getDivisionColor(file.division);

  const commitRename = () => {
    if (name.trim() && name.trim() !== file.name) onRename(name.trim());
    else setName(file.name);
    setEditing(false);
  };
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <div
      style={{ background: 'var(--bg)', borderRadius: 14, padding: '18px 14px', boxShadow: 'var(--raised-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'box-shadow 0.2s', position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--raised)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--raised-sm)')}
    >
      {/* Division dot */}
      <div style={{ position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: '50%', background: color }} title={file.division} />

      <div style={{ cursor: 'pointer' }} onClick={onPreview}>
        <FileTypeIcon mime={file.mime_type} size={36} />
      </div>

      {editing ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input ref={inputRef} className="nm-input" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(file.name); setEditing(false); } }}
            style={{ fontSize: '0.7rem', padding: '5px 8px', textAlign: 'center' }} />
          <button className="nm-btn" style={{ padding: '3px 6px', fontSize: '0.65rem', width: '100%', justifyContent: 'center' }} onClick={commitRename}><Check size={10} /> OK</button>
        </div>
      ) : (
        <div style={{ fontSize: '0.72rem', fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', width: '100%', maxHeight: 40, overflow: 'hidden', cursor: 'pointer' }} onDoubleClick={() => setEditing(true)} title={file.name}>
          {file.name}
        </div>
      )}

      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{formatSize(file.size_bytes)}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-light)' }}>{formatDate(file.created_at)}</div>

      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
        <button className="nm-btn" style={{ padding: '4px 7px' }} title="Aperçu" onClick={onPreview}><Eye size={11} /></button>
        <button className="nm-btn" style={{ padding: '4px 7px' }} title="Télécharger" onClick={onDownload}><Download size={11} /></button>
        <button className="nm-btn" style={{ padding: '4px 7px' }} title="Renommer" onClick={() => setEditing(true)}><Edit2 size={11} /></button>
        <button className="nm-btn" style={{ padding: '4px 7px', color: '#D85A30' }} title="Supprimer" onClick={onDelete}><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

// ── File Row (list) ───────────────────────────────────────────────────────────

function FileRow({ file, onDownload, onDelete, onPreview, onRename }: {
  file: FileRecord; onDownload: () => void; onDelete: () => void; onPreview: () => void; onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = getDivisionColor(file.division);

  const commitRename = () => {
    if (name.trim() && name.trim() !== file.name) onRename(name.trim());
    else setName(file.name);
    setEditing(false);
  };
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, boxShadow: 'var(--raised-xs)', background: 'var(--bg)' }}>
      <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onPreview}><FileTypeIcon mime={file.mime_type} size={20} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input ref={inputRef} className="nm-input" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(file.name); setEditing(false); } }}
              style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }} />
            <button className="nm-btn" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={commitRename}><Check size={12} /></button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }} className="truncate" onDoubleClick={() => setEditing(true)}>{file.name}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {DIVISION_MAP[file.division]?.label} · {formatSize(file.size_bytes)} · {formatDate(file.created_at)}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <button className="nm-btn" style={{ padding: '5px 8px' }} onClick={onPreview}><Eye size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px' }} onClick={onDownload}><Download size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px' }} onClick={() => setEditing(true)}><Edit2 size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px', color: '#D85A30' }} onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const supabase = createSupabaseClient();

  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Upload flow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null);

  // ── Load files ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true;

    const loadFiles = async () => {
      let q = supabase.from('files').select('*').order('created_at', { ascending: false });
      if (activeDivision) q = q.eq('division', activeDivision);
      if (searchQuery) q = q.ilike('name', `%${searchQuery}%`);

      const { data } = await q;
      if (isActive) setFiles(data ?? []);
    };

    void loadFiles();

    return () => {
      isActive = false;
    };
  }, [activeDivision, searchQuery, supabase, refreshTick]);

  // ── Upload logic ───────────────────────────────────────────────────────────

  const handleImporterClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      setPendingFiles(selected);
      setShowUploadModal(true);
    }
    e.target.value = '';
  };

  const handleConfirmUpload = async (division: DivisionKey) => {
    setShowUploadModal(false);
    const initialProgress: UploadProgress[] = pendingFiles.map(f => ({ name: f.name, progress: 0, done: false, error: false }));
    setUploads(initialProgress);
    setShowProgress(true);

    await Promise.all(pendingFiles.map(async (file, i) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${division}/general/${crypto.randomUUID()}_${safeName}`;
      try {
        const { error: uploadError } = await supabase.storage.from('files').upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;

        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 80 } : u));

        await supabase.from('files').insert({
          folder_id: null,
          project_id: null,
          name: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          division,
        });

        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 100, done: true } : u));
      } catch (err) {
        console.error('Upload error:', err);
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, error: true, progress: 0 } : u));
      }
    }));

    setPendingFiles([]);
    setTimeout(() => {
      setRefreshTick(t => t + 1);
      setShowProgress(false);
      setUploads([]);
    }, 2500);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      setPendingFiles(dropped);
      setShowUploadModal(true);
    }
  };

  // ── File actions ───────────────────────────────────────────────────────────

  const handleDownload = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handlePreview = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) { setPreviewUrl(data.signedUrl); setPreviewFile(file); }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    await supabase.storage.from('files').remove([file.storage_path]);
    await supabase.from('files').delete().eq('id', file.id);
    setDeleteFile(null);
    setRefreshTick(t => t + 1);
  };

  const handleRenameFile = async (file: FileRecord, newName: string) => {
    await supabase.from('files').update({ name: newName }).eq('id', file.id);
    setRefreshTick(t => t + 1);
  };

  // ── Group files by division for display ───────────────────────────────────



  const filteredFiles = files;
  const totalCount = filteredFiles.length;

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div
        style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ── Drag overlay ── */}
        {isDragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(55,138,221,0.08)', border: '3px dashed #378ADD',
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)', pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'center' }}>
              <Upload size={56} style={{ color: '#378ADD', marginBottom: 12 }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#378ADD' }}>Déposez vos fichiers ici</p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="heading" style={{ fontSize: '2rem', marginBottom: 4 }}>Fichiers</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {totalCount} fichier{totalCount !== 1 ? 's' : ''} {activeDivision ? `· ${DIVISION_MAP[activeDivision]?.label}` : '· toutes les divisions'}
            </p>
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="nm-input"
                placeholder="Rechercher un fichier…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 30, fontSize: '0.8rem', padding: '8px 12px 8px 30px', width: 220 }}
              />
            </div>

            {/* View toggle */}
            <button className={`nm-btn ${viewMode === 'grid' ? 'nm-btn-primary' : ''}`} style={{ padding: '8px 12px' }} onClick={() => setViewMode('grid')}><Grid3X3 size={15} /></button>
            <button className={`nm-btn ${viewMode === 'list' ? 'nm-btn-primary' : ''}`} style={{ padding: '8px 12px' }} onClick={() => setViewMode('list')}><List size={15} /></button>

            {/* IMPORT BUTTON — always active */}
            <button
              className="nm-btn nm-btn-primary"
              style={{ padding: '9px 20px', fontSize: '0.9rem' }}
              onClick={handleImporterClick}
            >
              <Upload size={16} /> Importer
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              accept="*/*"
            />
          </div>
        </div>

        {/* ── Empty state ── */}
        {filteredFiles.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div
              onClick={handleImporterClick}
              style={{
                border: '2px dashed rgba(0,0,0,0.12)', borderRadius: 24, padding: '60px 80px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,98,216,0.04)'; e.currentTarget.style.borderColor = '#4A62D8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
            >
              <FolderOpen size={52} style={{ color: 'var(--text-light)', marginBottom: 16 }} />
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                {searchQuery ? 'Aucun fichier trouvé' : 'Aucun fichier pour le moment'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Cliquez ici ou glissez des fichiers pour commencer
              </p>
            </div>
          </div>
        )}

        {/* ── Files — grouped by division ── */}
        {filteredFiles.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeDivision ? (
              // Single division view
              viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                  {filteredFiles.map(file => (
                    <FileCard key={file.id} file={file}
                      onDownload={() => handleDownload(file)} onDelete={() => setDeleteFile(file)}
                      onPreview={() => handlePreview(file)} onRename={n => handleRenameFile(file, n)} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {filteredFiles.map(file => (
                    <FileRow key={file.id} file={file}
                      onDownload={() => handleDownload(file)} onDelete={() => setDeleteFile(file)}
                      onPreview={() => handlePreview(file)} onRename={n => handleRenameFile(file, n)} />
                  ))}
                </div>
              )
            ) : (
              // All divisions — group by division
              DIVISIONS.map((div) => {
                const divKey = div.key;
                const divFiles = filteredFiles.filter(f => f.division === divKey);
                if (divFiles.length === 0) return null;
                const color = getDivisionColor(divKey);
                return (
                  <div key={divKey} style={{ marginBottom: 32 }}>
                    {/* Division header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <h3 className="heading" style={{ fontSize: '0.9rem', margin: 0, color }}>{div.label}</h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg)', boxShadow: 'var(--raised-xs)', borderRadius: 999, padding: '2px 8px' }}>
                        {divFiles.length} fichier{divFiles.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {viewMode === 'grid' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                        {divFiles.map(file => (
                          <FileCard key={file.id} file={file}
                            onDownload={() => handleDownload(file)} onDelete={() => setDeleteFile(file)}
                            onPreview={() => handlePreview(file)} onRename={n => handleRenameFile(file, n)} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {divFiles.map(file => (
                          <FileRow key={file.id} file={file}
                            onDownload={() => handleDownload(file)} onDelete={() => setDeleteFile(file)}
                            onPreview={() => handlePreview(file)} onRename={n => handleRenameFile(file, n)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Upload modal ── */}
      {showUploadModal && pendingFiles.length > 0 && (
        <UploadModal
          files={pendingFiles}
          defaultDivision={activeDivision}
          onConfirm={handleConfirmUpload}
          onCancel={() => { setShowUploadModal(false); setPendingFiles([]); }}
        />
      )}

      {/* ── Upload progress ── */}
      {showProgress && uploads.length > 0 && (
        <UploadProgressPanel uploads={uploads} onClose={() => setShowProgress(false)} />
      )}

      {/* ── Preview modal ── */}
      {previewFile && previewUrl && (
        <PreviewModal file={previewFile} signedUrl={previewUrl} onClose={() => { setPreviewFile(null); setPreviewUrl(''); }} />
      )}

      {/* ── Delete confirm ── */}
      {deleteFile && (
        <ConfirmDelete
          name={deleteFile.name}
          onConfirm={() => handleDeleteFile(deleteFile)}
          onCancel={() => setDeleteFile(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
