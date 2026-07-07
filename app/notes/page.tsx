'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor, getDivisionLabel } from '@/lib/divisions';
import { Note, Project } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Plus, Trash2, Search, FileText, Save, Clock, ChevronRight } from 'lucide-react';

export default function NotesPage() {
  const supabase = createSupabaseClient();
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  
  // Editor state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('notes').select('*').order('updated_at', { ascending: false });
    if (activeDivision) {
      q = q.eq('division', activeDivision);
    }
    const { data: notesData } = await q;
    const { data: projData } = await supabase.from('projects').select('id, name, division');
    setProjects(projData ?? []);

    const filtered = (notesData ?? []).filter((n: any) => 
      !search || n.title.toLowerCase().includes(search.toLowerCase()) || 
      (n.content?.text ?? '').toLowerCase().includes(search.toLowerCase())
    );
    setNotes(filtered as Note[]);
    setLoading(false);
  }, [activeDivision, search, supabase]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectNote = (note: Note) => {
    // Save current active note first if it exists
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      saveActiveNoteImmediate();
    }
    setActiveNote(note);
    setTitle(note.title);
    setBody(note.content?.text ?? '');
    setSelectedProjectId(note.project_id ?? '');
  };

  const createNote = async () => {
    const { data, error } = await supabase.from('notes').insert({
      title: 'Note sans titre',
      content: { text: '' },
      division: activeDivision || null,
      project_id: null
    }).select().single();
    if (data) {
      await loadNotes();
      selectNote(data as Note);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette note ?')) return;
    await supabase.from('notes').delete().eq('id', id);
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle('');
      setBody('');
      setSelectedProjectId('');
    }
    loadNotes();
  };

  const saveActiveNoteImmediate = async () => {
    if (!activeNote) return;
    setSaving(true);
    const updatedNote = {
      title: title || 'Note sans titre',
      content: { text: body },
      project_id: selectedProjectId || null,
      division: selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.division : activeNote.division
    };
    await supabase.from('notes').update(updatedNote).eq('id', activeNote.id);
    setLastSaved(new Date());
    setSaving(false);
    loadNotes();
  };

  // Auto-save logic on title/body change
  useEffect(() => {
    if (!activeNote) return;
    if (title === activeNote.title && body === (activeNote.content?.text ?? '') && selectedProjectId === (activeNote.project_id ?? '')) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveActiveNoteImmediate();
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, body, selectedProjectId]);

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ height: '100%', display: 'flex', background: 'var(--bg)' }}>
        
        {/* Left Notes List Panel */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.06)', height: '100%' }}>
          <div style={{ padding: '20px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="heading" style={{ fontSize: '1.25rem' }}>Notes</h1>
            <button className="nm-btn" style={{ padding: 6 }} onClick={createNote}>
              <Plus size={15} />
            </button>
          </div>

          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="nm-input" placeholder="Rechercher une note..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: '100%', fontSize: '0.75rem' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 20 }}>Chargement...</p>
            ) : notes.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 20 }}>Aucune note.</p>
            ) : (
              notes.map(note => {
                const isSelected = activeNote?.id === note.id;
                const project = projects.find(p => p.id === note.project_id);
                const divisionColor = project?.division ? getDivisionColor(project.division) : note.division ? getDivisionColor(note.division) : 'transparent';
                return (
                  <div
                    key={note.id}
                    className="nm-card-sm"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? 'var(--inset-xs)' : 'var(--raised-xs)',
                      borderRadius: 10,
                      borderLeft: divisionColor !== 'transparent' ? `3px solid ${divisionColor}` : undefined
                    }}
                    onClick={() => selectNote(note)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <h4 className="truncate" style={{ fontSize: '0.8rem', fontWeight: 650, flex: 1, marginRight: 8 }}>{note.title}</h4>
                      <button style={{ background: 'none', border: 'none', color: '#D85A30', cursor: 'pointer', padding: 0 }} onClick={e => deleteNote(note.id, e)}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <p className="truncate" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {note.content?.text || 'Note vide'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(note.updated_at).toLocaleDateString('fr-FR')}</span>
                      {project && <span className="truncate" style={{ maxWidth: 100 }}>{project.name}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {activeNote ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: 16 }}>
              {/* Header with Save status, project selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <select className="nm-input" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} style={{ width: 'auto', fontSize: '0.75rem', padding: '6px 12px' }}>
                    <option value="">Associer à un projet</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {saving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> Enregistrement...</span>
                  ) : lastSaved ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Save size={10} /> Enregistré à {lastSaved.toLocaleTimeString('fr-FR')}</span>
                  ) : null}
                  <button className="nm-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={saveActiveNoteImmediate}>Enregistrer</button>
                </div>
              </div>

              {/* Title input */}
              <input
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  width: '100%',
                  fontFamily: 'var(--font-heading)'
                }}
                placeholder="Titre de la note"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              {/* Markdown instructions toolbar */}
              <div className="nm-card-sm" style={{ padding: '6px 12px', display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-muted)', borderRadius: 8 }}>
                <span>Astuces Markdown : **Gras**, *Italique*, # Titre, - Liste, `Code`</span>
              </div>

              {/* Body Textarea */}
              <textarea
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  width: '100%',
                  color: 'var(--text-primary)'
                }}
                placeholder="Commencez à écrire ici..."
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ marginBottom: 12, color: 'var(--text-light)' }} />
              <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>Sélectionnez une note ou créez-en une nouvelle.</p>
              <button className="nm-btn nm-btn-primary" onClick={createNote}><Plus size={14} /> Créer une note</button>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
