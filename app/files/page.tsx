'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { Folder, FileRecord } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  FolderOpen, FolderPlus, Upload, ChevronRight, ChevronDown,
  File, FileText, FileImage, Trash2, Download, Search, Grid, List,
  MoreVertical, X
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

// ── Folder tree item ──────────────────────────────────────────────────────────
function FolderNode({
  folder,
  level,
  selected,
  onSelect,
  onNewFolder,
  onDelete,
}: {
  folder: Folder;
  level: number;
  selected: string | null;
  onSelect: (id: string) => void;
  onNewFolder: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(level === 0);
  const color = getDivisionColor(folder.division);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          paddingLeft: `${8 + level * 16}px`,
          borderRadius: 8,
          cursor: 'pointer',
          background: selected === folder.id ? 'rgba(0,0,0,0.04)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onClick={() => { setExpanded(!expanded); onSelect(folder.id); }}
      >
        <button
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {level === 0
          ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          : <FolderOpen size={13} style={{ color, flexShrink: 0 }} />
        }
        <span className="truncate" style={{ fontSize: '0.8rem', fontWeight: level === 0 ? 600 : 400, flex: 1 }}>
          {folder.name}
        </span>
        <div style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}
          className="folder-actions"
        >
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, color: 'var(--text-muted)' }}
            onClick={(e) => { e.stopPropagation(); onNewFolder(folder.id); }}
            title="Nouveau dossier"
          >
            <FolderPlus size={11} />
          </button>
          {level > 0 && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, color: 'var(--text-muted)' }}
              onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
              title="Supprimer"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
      {expanded && folder.children?.map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          level={level + 1}
          selected={selected}
          onSelect={onSelect}
          onNewFolder={onNewFolder}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// ── File icon ─────────────────────────────────────────────────────────────────
function FileIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image/')) return <FileImage size={20} style={{ color: '#378ADD' }} />;
  if (mime?.includes('pdf')) return <FileText size={20} style={{ color: '#D85A30' }} />;
  return <File size={20} style={{ color: 'var(--text-muted)' }} />;
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function UploadDropzone({ folderId, division, onUpload }: { folderId: string; division: string; onUpload: () => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!folderId || uploading) return;
    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      for (const file of acceptedFiles) {
        const path = `${division}/${folderId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('files').upload(path, file);
        if (upErr) continue;
        await supabase.from('files').insert({
          folder_id: folderId,
          name: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
          division,
        });
      }
      onUpload();
    } finally {
      setUploading(false);
    }
  }, [folderId, division, onUpload, uploading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? '#378ADD' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive ? 'rgba(55,138,221,0.04)' : 'transparent',
        transition: 'all 0.2s',
        boxShadow: isDragActive ? 'var(--inset-sm)' : 'none',
      }}
    >
      <input {...getInputProps()} />
      <Upload size={28} style={{ color: isDragActive ? '#378ADD' : 'var(--text-muted)', marginBottom: 10 }} />
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
        {uploading ? 'Envoi en cours…' : isDragActive ? 'Déposez ici' : 'Glissez des fichiers ou cliquez'}
      </p>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', margin: 0 }}>PDF, DOCX, PNG, DWG, XLSX…</p>
    </div>
  );
}

// ── Main File Manager page ────────────────────────────────────────────────────
export default function FilesPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const supabase = createSupabaseClient();

  const loadFolders = useCallback(async () => {
    const div = activeDivision;
    let q = supabase.from('folders').select('*').order('name');
    if (div) q = q.eq('division', div);
    const { data } = await q;
    if (!data) return;
    // Build tree
    const map: Record<string, Folder> = {};
    data.forEach((f: any) => { map[f.id] = { ...f, children: [] }; });
    const roots: Folder[] = [];
    data.forEach((f: any) => {
      if (f.parent_id && map[f.parent_id]) {
        map[f.parent_id].children!.push(map[f.id]);
      } else if (!f.parent_id) {
        roots.push(map[f.id]);
      }
    });
    setFolders(roots);
  }, [activeDivision, supabase]);

  const loadFiles = useCallback(async () => {
    if (!selectedFolder) { setFiles([]); return; }
    let q = supabase.from('files').select('*').eq('folder_id', selectedFolder);
    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`);
    const { data } = await q;
    setFiles(data ?? []);
  }, [selectedFolder, searchQuery, supabase]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleNewFolder = async () => {
    if (!newFolderName.trim() || !newFolderParent) return;
    const div = activeDivision ?? 'divers';
    await supabase.from('folders').insert({
      parent_id: newFolderParent,
      name: newFolderName.trim(),
      division: div,
    });
    setNewFolderParent(null);
    setNewFolderName('');
    loadFolders();
  };

  const handleDeleteFolder = async (id: string) => {
    await supabase.from('folders').delete().eq('id', id);
    loadFolders();
  };

  const handleDeleteFile = async (file: FileRecord) => {
    await supabase.storage.from('files').remove([file.storage_path]);
    await supabase.from('files').delete().eq('id', file.id);
    loadFiles();
  };

  const handleDownload = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  // Root division folders (virtual)
  const divisionRoots = (activeDivision ? DIVISIONS.filter(d => d.key === activeDivision) : DIVISIONS).map(div => ({
    id: `root-${div.key}`,
    parent_id: null,
    name: div.label,
    division: div.key,
    created_at: '',
    children: folders.filter(f => f.division === div.key && !f.parent_id),
  } as Folder));

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* ── Left tree panel ─────────────────────────────── */}
        <div
          className="nm-card"
          style={{
            width: 260,
            flexShrink: 0,
            margin: '20px 0 20px 20px',
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <h2 className="heading" style={{ fontSize: '1rem', margin: 0 }}>Fichiers</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {divisionRoots.map(root => (
              <FolderNode
                key={root.id}
                folder={root}
                level={0}
                selected={selectedFolder}
                onSelect={id => id.startsWith('root-') ? null : setSelectedFolder(id)}
                onNewFolder={id => setNewFolderParent(id.startsWith('root-') ? null : id)}
                onDelete={handleDeleteFolder}
              />
            ))}
          </div>
        </div>

        {/* ── Main content ────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '20px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div className="nm-card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="nm-input"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button className="nm-btn" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List size={14} /> : <Grid size={14} />}
            </button>
          </div>

          {/* New folder dialog */}
          {newFolderParent !== null && (
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 16,
                boxShadow: 'var(--raised-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <input
                className="nm-input"
                placeholder="Nom du dossier…"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNewFolder()}
                autoFocus
                style={{ flex: 1 }}
              />
              <button className="nm-btn nm-btn-primary" onClick={handleNewFolder}>Créer</button>
              <button className="nm-btn" onClick={() => setNewFolderParent(null)}><X size={14} /></button>
            </div>
          )}

          {/* Files area */}
          <div
            className="nm-card"
            style={{ flex: 1, overflow: 'auto', padding: '20px' }}
          >
            {!selectedFolder ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <FolderOpen size={40} style={{ color: 'var(--text-light)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Sélectionnez un dossier pour voir son contenu
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <UploadDropzone folderId={selectedFolder} division={activeDivision ?? 'divers'} onUpload={loadFiles} />
                </div>

                {files.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 20 }}>
                    Ce dossier est vide
                  </p>
                ) : viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                    {files.map(file => (
                      <div
                        key={file.id}
                        style={{
                          background: 'var(--bg)',
                          borderRadius: 14,
                          padding: '16px 12px',
                          boxShadow: 'var(--raised-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--raised)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--raised-sm)')}
                      >
                        <FileIcon mime={file.mime_type} />
                        <div style={{ fontSize: '0.7rem', fontWeight: 500, textAlign: 'center', wordBreak: 'break-word' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{formatSize(file.size_bytes)}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button className="nm-btn" style={{ padding: '4px 8px' }} onClick={() => handleDownload(file)}>
                            <Download size={11} />
                          </button>
                          <button className="nm-btn" style={{ padding: '4px 8px' }} onClick={() => handleDeleteFile(file)}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {files.map(file => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 16px',
                          borderRadius: 10,
                          boxShadow: 'var(--raised-xs)',
                          background: 'var(--bg)',
                        }}
                      >
                        <FileIcon mime={file.mime_type} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{file.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {formatSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <button className="nm-btn" style={{ padding: '5px 10px' }} onClick={() => handleDownload(file)}>
                          <Download size={13} />
                        </button>
                        <button className="nm-btn" style={{ padding: '5px 10px' }} onClick={() => handleDeleteFile(file)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
