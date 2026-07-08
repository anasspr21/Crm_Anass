'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, DragEvent } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  FolderOpen, FolderPlus, Upload, ChevronRight, ChevronDown,
  FileText, FileImage, File, Trash2, Download, Search, Grid3X3,
  List, X, Edit2, Check, Eye, AlertTriangle, Loader2,
  FileBadge, FileVideo, FileSpreadsheet, Folder,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  division: DivisionKey;
  status: string;
}

interface FolderRecord {
  id: string;
  project_id: string | null;
  parent_id: string | null;
  name: string;
  division: DivisionKey;
  created_at: string;
}

interface FileRecord {
  id: string;
  folder_id: string;
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
  progress: number; // 0-100
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

// ── File type icon ─────────────────────────────────────────────────────────────

function FileTypeIcon({ mime, size = 28 }: { mime: string; size?: number }) {
  const s = { flexShrink: 0 as const };
  if (mime?.startsWith('image/'))
    return <FileImage size={size} style={{ ...s, color: '#7254C8' }} />;
  if (mime?.includes('pdf'))
    return <FileText size={size} style={{ ...s, color: '#D85A30' }} />;
  if (mime?.includes('word') || mime?.includes('document'))
    return <FileBadge size={size} style={{ ...s, color: '#378ADD' }} />;
  if (mime?.includes('sheet') || mime?.includes('excel') || mime?.includes('csv'))
    return <FileSpreadsheet size={size} style={{ ...s, color: '#1D9E75' }} />;
  if (mime?.startsWith('video/'))
    return <FileVideo size={size} style={{ ...s, color: '#D85A30' }} />;
  return <File size={size} style={{ ...s, color: '#888780' }} />;
}

// ── Upload Progress Bar ───────────────────────────────────────────────────────

function UploadProgressItem({ item }: { item: UploadProgress }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-primary)' }} className="truncate">
          {item.name}
        </span>
        <span style={{ fontSize: '0.65rem', color: item.error ? '#D85A30' : item.done ? '#1D9E75' : 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
          {item.error ? 'Erreur' : item.done ? 'Terminé' : `${item.progress}%`}
        </span>
      </div>
      <div className="progress-track" style={{ height: 5 }}>
        <div
          className="progress-fill"
          style={{
            width: `${item.progress}%`,
            background: item.error ? '#D85A30' : item.done ? '#1D9E75' : 'linear-gradient(90deg, #4A62D8, #7254C8)',
          }}
        />
      </div>
    </div>
  );
}

// ── Lightbox / Preview Modal ──────────────────────────────────────────────────

function PreviewModal({ file, signedUrl, onClose }: { file: FileRecord; signedUrl: string; onClose: () => void }) {
  const isImage = file.mime_type?.startsWith('image/');
  const isPdf = file.mime_type?.includes('pdf');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw', maxHeight: '90vh',
          background: 'var(--bg)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: 'var(--raised)',
          display: 'flex', flexDirection: 'column',
          minWidth: isPdf ? 700 : undefined,
          width: isPdf ? '80vw' : undefined,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileTypeIcon mime={file.mime_type} size={18} />
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }} className="truncate">{file.name}</span>
          <button className="nm-btn" style={{ padding: '5px 8px' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isImage ? 16 : 0 }}>
          {isImage && (
            <img
              src={signedUrl}
              alt={file.name}
              style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 10, objectFit: 'contain' }}
            />
          )}
          {isPdf && (
            <iframe
              src={signedUrl}
              title={file.name}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          )}
          {!isImage && !isPdf && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <File size={40} style={{ marginBottom: 12, color: 'var(--text-light)' }} />
              <p style={{ fontSize: '0.875rem' }}>Aperçu non disponible pour ce type de fichier.</p>
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
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

// ── File Card (grid view) ─────────────────────────────────────────────────────

function FileCard({
  file, onDownload, onDelete, onPreview, onRename,
}: {
  file: FileRecord;
  onDownload: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    if (name.trim() && name.trim() !== file.name) onRename(name.trim());
    else setName(file.name);
    setEditing(false);
  };

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <div
      style={{
        background: 'var(--bg)', borderRadius: 14, padding: '18px 14px',
        boxShadow: 'var(--raised-sm)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8, cursor: 'default', transition: 'box-shadow 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--raised)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--raised-sm)')}
    >
      <div style={{ cursor: 'pointer' }} onClick={onPreview}>
        <FileTypeIcon mime={file.mime_type} size={36} />
      </div>

      {editing ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            ref={inputRef}
            className="nm-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(file.name); setEditing(false); } }}
            style={{ fontSize: '0.7rem', padding: '5px 8px', textAlign: 'center' }}
          />
          <button className="nm-btn" style={{ padding: '3px 6px', fontSize: '0.65rem', width: '100%', justifyContent: 'center' }} onClick={commitRename}>
            <Check size={10} /> OK
          </button>
        </div>
      ) : (
        <div
          style={{ fontSize: '0.72rem', fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', width: '100%', maxHeight: 40, overflow: 'hidden', cursor: 'pointer' }}
          onDoubleClick={() => setEditing(true)}
          title={file.name}
        >
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

// ── File Row (list view) ──────────────────────────────────────────────────────

function FileRow({
  file, onDownload, onDelete, onPreview, onRename,
}: {
  file: FileRecord;
  onDownload: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    if (name.trim() && name.trim() !== file.name) onRename(name.trim());
    else setName(file.name);
    setEditing(false);
  };

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, boxShadow: 'var(--raised-xs)', background: 'var(--bg)' }}>
      <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onPreview}>
        <FileTypeIcon mime={file.mime_type} size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              ref={inputRef}
              className="nm-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(file.name); setEditing(false); } }}
              style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
            />
            <button className="nm-btn" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={commitRename}><Check size={12} /></button>
          </div>
        ) : (
          <>
            <div
              style={{ fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
              className="truncate"
              onDoubleClick={() => setEditing(true)}
            >
              {file.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {formatSize(file.size_bytes)} · {formatDate(file.created_at)}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <button className="nm-btn" style={{ padding: '5px 8px' }} title="Aperçu" onClick={onPreview}><Eye size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px' }} title="Télécharger" onClick={onDownload}><Download size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px' }} title="Renommer" onClick={() => setEditing(true)}><Edit2 size={13} /></button>
        <button className="nm-btn" style={{ padding: '5px 8px', color: '#D85A30' }} title="Supprimer" onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ── Sidebar Folder Tree Node ──────────────────────────────────────────────────

interface TreeNodeProps {
  label: string;
  level: number;
  isProject: boolean;
  color: string;
  id: string;
  selectedFolderId: string | null;
  onSelect: (id: string, label: string) => void;
  onNewFolder: (parentId: string, divisionKey: DivisionKey) => void;
  children?: React.ReactNode;
  divisionKey: DivisionKey;
}

function TreeNode({ label, level, isProject, color, id, selectedFolderId, onSelect, onNewFolder, children, divisionKey }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level === 0);
  const isSelected = selectedFolderId === id;
  const hasChildren = !!children;

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 8px', paddingLeft: `${8 + level * 14}px`,
          borderRadius: 8, cursor: 'pointer',
          background: isSelected ? `rgba(${getDivisionColorRgb(color)},0.12)` : 'transparent',
          transition: 'background 0.15s',
        }}
        onClick={() => { setExpanded(e => !e); if (!isProject) onSelect(id, label); }}
      >
        <button
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
        >
          {hasChildren
            ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span style={{ width: 11 }} />
          }
        </button>

        {isProject
          ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
          : <Folder size={12} style={{ color, flexShrink: 0 }} />
        }

        <span className="truncate" style={{ fontSize: '0.775rem', fontWeight: isProject ? 600 : 400, flex: 1, color: isSelected ? color : 'var(--text-primary)' }}>
          {label}
        </span>

        {!isProject && (
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', borderRadius: 4, color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.15s', flexShrink: 0 }}
            className="tree-action"
            onClick={e => { e.stopPropagation(); onNewFolder(id, divisionKey); }}
            title="Nouveau sous-dossier"
          >
            <FolderPlus size={10} />
          </button>
        )}
      </div>

      {expanded && children}
    </div>
  );
}

function getDivisionColorRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Main File Manager Page ────────────────────────────────────────────────────

export default function FilesPage() {
  const supabase = createSupabaseClient();

  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // New folder creation
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderDivision, setNewFolderDivision] = useState<DivisionKey>('divers');
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [showUploads, setShowUploads] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview / confirm delete
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    let q = supabase.from('projects').select('id, name, division, status').order('name');
    if (activeDivision) q = q.eq('division', activeDivision);
    const { data } = await q;
    setProjects(data ?? []);
  }, [activeDivision, supabase]);

  const loadFolders = useCallback(async () => {
    let q = supabase.from('folders').select('*').order('name');
    if (activeDivision) q = q.eq('division', activeDivision);
    const { data } = await q;
    setFolders(data ?? []);
  }, [activeDivision, supabase]);

  const loadFiles = useCallback(async () => {
    if (!selectedFolderId) { setFiles([]); return; }
    let q = supabase.from('files').select('*').eq('folder_id', selectedFolderId).order('name');
    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`);
    const { data } = await q;
    setFiles(data ?? []);
  }, [selectedFolderId, searchQuery, supabase]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { if (newFolderInputRef.current) newFolderInputRef.current.focus(); }, [newFolderParentId]);

  // ── Folder CRUD ────────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !newFolderParentId) return;
    await supabase.from('folders').insert({
      parent_id: newFolderParentId === '__project__' ? null : newFolderParentId,
      project_id: selectedProjectId,
      name: newFolderName.trim(),
      division: newFolderDivision,
    });
    setNewFolderParentId(null);
    setNewFolderName('');
    loadFolders();
  };

  // ── File CRUD ──────────────────────────────────────────────────────────────

  const handleDownload = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handlePreview = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewFile(file);
    }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    await supabase.storage.from('files').remove([file.storage_path]);
    await supabase.from('files').delete().eq('id', file.id);
    setDeleteFile(null);
    loadFiles();
    // Log activity
    await supabase.from('activity_log').insert({
      action: 'file_deleted',
      entity: 'file',
      entity_id: file.id,
      metadata: { name: file.name },
    }).throwOnError().catch(() => null);
  };

  const handleRenameFile = async (file: FileRecord, newName: string) => {
    await supabase.from('files').update({ name: newName }).eq('id', file.id);
    loadFiles();
  };

  // ── File Upload ────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!selectedFolderId) return;
    const division = activeDivision ?? 'divers';
    const projectId = selectedProjectId ?? 'general';

    const initialProgress: UploadProgress[] = fileList.map(f => ({
      name: f.name, progress: 0, done: false, error: false,
    }));
    setUploads(initialProgress);
    setShowUploads(true);

    await Promise.all(fileList.map(async (file, i) => {
      const path = `${division}/${projectId}/${selectedFolderId}/${Date.now()}_${file.name}`;
      try {
        const { error: uploadError } = await supabase.storage.from('files').upload(path, file, {
          upsert: true,
          // Supplying upload progress
          onUploadProgress: (progress) => {
            const pct = Math.round((progress.loaded / progress.total) * 90);
            setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u));
          }
        });

        if (uploadError) throw uploadError;

        // Insert DB record
        await supabase.from('files').insert({
          folder_id: selectedFolderId,
          project_id: selectedProjectId,
          name: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          division,
        });

        // Log activity
        await supabase.from('activity_log').insert({
          action: 'file_uploaded',
          entity: 'file',
          metadata: { name: file.name, folder_id: selectedFolderId, size: file.size },
        }).throwOnError().catch(() => null);

        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 100, done: true } : u));
      } catch (err) {
        console.error('Upload error:', err);
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, error: true, progress: 0 } : u));
      }
    }));

    setTimeout(() => {
      loadFiles();
      setUploads([]);
      setShowUploads(false);
    }, 2000);
  }, [selectedFolderId, activeDivision, selectedProjectId, supabase, loadFiles]);

  // ── Drag and Drop overlay ─────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (selectedFolderId) setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!selectedFolderId) return;
    const fileList = Array.from(e.dataTransfer.files);
    if (fileList.length > 0) await uploadFiles(fileList);
  };

  // ── Folder tree building ───────────────────────────────────────────────────

  function buildFolderTree(parentId: string | null, projectId: string): FolderRecord[] {
    return folders.filter(f => f.project_id === projectId && f.parent_id === parentId);
  }

  function renderFolderNode(folder: FolderRecord, level: number): React.ReactNode {
    const color = getDivisionColor(folder.division);
    const children = buildFolderTree(folder.id, folder.project_id ?? '');
    return (
      <TreeNode
        key={folder.id}
        id={folder.id}
        label={folder.name}
        level={level}
        isProject={false}
        color={color}
        divisionKey={folder.division}
        selectedFolderId={selectedFolderId}
        onSelect={(id, name) => { setSelectedFolderId(id); setSelectedFolderName(name); }}
        onNewFolder={(parentId, div) => { setNewFolderParentId(parentId); setNewFolderDivision(div); setSelectedProjectId(folder.project_id); }}
      >
        {children.length > 0 ? <>{children.map(c => renderFolderNode(c, level + 1))}</> : undefined}
      </TreeNode>
    );
  }

  const displayedProjects = activeDivision
    ? projects.filter(p => p.division === activeDivision)
    : projects;

  // ── Breadcrumb ────────────────────────────────────────────────────────────

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      {/* Global tree-action hover effect */}
      <style>{`.tree-action { opacity: 0 !important; } div:hover > div > .tree-action { opacity: 1 !important; }`}</style>

      <div
        style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {/* ── Drag overlay ────────────────────────────────────── */}
        {isDragOver && selectedFolderId && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(55,138,221,0.08)',
            border: '3px dashed #378ADD',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'center' }}>
              <Upload size={48} style={{ color: '#378ADD', marginBottom: 12 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#378ADD' }}>Déposez vos fichiers ici</p>
            </div>
          </div>
        )}

        {/* ── Left sidebar tree ─────────────────────────────── */}
        <div
          className="nm-card"
          style={{ width: 280, flexShrink: 0, margin: '20px 0 20px 20px', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <h2 className="heading" style={{ fontSize: '1rem', margin: 0 }}>Fichiers</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tree */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {displayedProjects.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '12px 8px' }}>Aucun projet trouvé</p>
            )}

            {displayedProjects.map(project => {
              const color = getDivisionColor(project.division);
              const projectFolders = buildFolderTree(null, project.id);

              return (
                <TreeNode
                  key={project.id}
                  id={`proj-${project.id}`}
                  label={project.name}
                  level={0}
                  isProject={true}
                  color={color}
                  divisionKey={project.division}
                  selectedFolderId={selectedFolderId}
                  onSelect={() => { setSelectedProjectId(project.id); setSelectedFolderId(null); }}
                  onNewFolder={() => { setNewFolderParentId('__root__'); setNewFolderDivision(project.division); setSelectedProjectId(project.id); }}
                >
                  {projectFolders.length > 0 ? (
                    <>{projectFolders.map(f => renderFolderNode(f, 1))}</>
                  ) : (
                    <div style={{ paddingLeft: 32, paddingBottom: 6 }}>
                      <button
                        className="nm-btn"
                        style={{ fontSize: '0.65rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                        onClick={() => { setNewFolderParentId('__root__'); setNewFolderDivision(project.division); setSelectedProjectId(project.id); }}
                      >
                        <FolderPlus size={10} /> Nouveau dossier
                      </button>
                    </div>
                  )}
                </TreeNode>
              );
            })}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '20px', overflow: 'hidden', minWidth: 0 }}>

          {/* Toolbar */}
          <div className="nm-card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Breadcrumb */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden' }}>
              <FolderOpen size={14} style={{ flexShrink: 0 }} />
              {selectedProject && (
                <>
                  <span style={{ color: getDivisionColor(selectedProject.division), fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {selectedProject.name}
                  </span>
                  {selectedFolderName && (
                    <>
                      <ChevronRight size={12} style={{ flexShrink: 0 }} />
                      <span className="truncate" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedFolderName}</span>
                    </>
                  )}
                </>
              )}
              {!selectedProject && <span style={{ color: 'var(--text-light)' }}>Sélectionnez un dossier</span>}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="nm-input"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 30, fontSize: '0.8rem', padding: '7px 10px 7px 30px' }}
              />
            </div>

            {/* View toggle */}
            <button className={`nm-btn ${viewMode === 'grid' ? 'nm-btn-primary' : ''}`} style={{ padding: '7px 10px' }} onClick={() => setViewMode('grid')}>
              <Grid3X3 size={14} />
            </button>
            <button className={`nm-btn ${viewMode === 'list' ? 'nm-btn-primary' : ''}`} style={{ padding: '7px 10px' }} onClick={() => setViewMode('list')}>
              <List size={14} />
            </button>

            {/* Upload button */}
            <button
              className="nm-btn nm-btn-primary"
              style={{ padding: '7px 14px', flexShrink: 0 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedFolderId}
            >
              <Upload size={14} /> Importer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) uploadFiles(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </div>

          {/* New folder dialog */}
          {newFolderParentId && (
            <div className="nm-card-sm" style={{ padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <FolderPlus size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={newFolderInputRef}
                className="nm-input"
                placeholder="Nom du dossier…"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setNewFolderParentId(null); setNewFolderName(''); } }}
                style={{ flex: 1, fontSize: '0.8rem' }}
              />
              <button className="nm-btn nm-btn-primary" style={{ padding: '7px 14px', flexShrink: 0 }} onClick={handleCreateFolder}>Créer</button>
              <button className="nm-btn" style={{ padding: '7px 10px', flexShrink: 0 }} onClick={() => { setNewFolderParentId(null); setNewFolderName(''); }}><X size={14} /></button>
            </div>
          )}

          {/* Upload progress */}
          {showUploads && uploads.length > 0 && (
            <div className="nm-card-sm" style={{ padding: '14px 18px', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Import en cours…
                </span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowUploads(false)}>
                  <X size={14} />
                </button>
              </div>
              {uploads.map((u, i) => <UploadProgressItem key={i} item={u} />)}
            </div>
          )}

          {/* Files area */}
          <div className="nm-card" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {!selectedFolderId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                <FolderOpen size={48} style={{ color: 'var(--text-light)' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Sélectionnez un dossier dans l'arborescence</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>pour voir et gérer ses fichiers</p>
              </div>
            ) : files.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <div style={{ border: '2px dashed rgba(0,0,0,0.12)', borderRadius: 20, padding: '40px 60px', textAlign: 'center' }}>
                  <Upload size={36} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ce dossier est vide</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Glissez des fichiers ici ou cliquez sur «&nbsp;Importer&nbsp;»</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                {files.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onDownload={() => handleDownload(file)}
                    onDelete={() => setDeleteFile(file)}
                    onPreview={() => handlePreview(file)}
                    onRename={name => handleRenameFile(file, name)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px auto', gap: 12, padding: '6px 16px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Nom</span>
                  <span>Taille</span>
                  <span>Date</span>
                  <span>Actions</span>
                </div>
                {files.map(file => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onDownload={() => handleDownload(file)}
                    onDelete={() => setDeleteFile(file)}
                    onPreview={() => handlePreview(file)}
                    onRename={name => handleRenameFile(file, name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ─────────────────────────────────── */}
      {previewFile && previewUrl && (
        <PreviewModal file={previewFile} signedUrl={previewUrl} onClose={() => { setPreviewFile(null); setPreviewUrl(''); }} />
      )}

      {/* ── Delete confirmation ───────────────────────────── */}
      {deleteFile && (
        <ConfirmDelete
          name={deleteFile.name}
          onConfirm={() => handleDeleteFile(deleteFile)}
          onCancel={() => setDeleteFile(null)}
        />
      )}

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
