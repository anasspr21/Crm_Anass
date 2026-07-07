'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { Canvas } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  Plus, Save, Download, Trash2, X, Pen, Square, Circle,
  Type, Eraser, Move, Minus, Maximize2, ChevronLeft
} from 'lucide-react';

// Canvas list (division overview)
function CanvasList({
  canvases,
  onSelect,
  onCreate,
  onDelete,
  division,
}: {
  canvases: Canvas[];
  onSelect: (c: Canvas) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  division: DivisionKey | null;
}) {
  const color = division ? getDivisionColor(division) : '#4A62D8';
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="heading" style={{ fontSize: '1.5rem', marginBottom: 2 }}>Canvas</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tableaux de dessin et cartes mentales</p>
        </div>
        <button className="nm-btn nm-btn-primary" onClick={onCreate}><Plus size={14} /> Nouveau canvas</button>
      </div>
      {canvases.length === 0 ? (
        <div
          className="nm-card"
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Pen size={40} style={{ color: 'var(--text-light)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun canvas. Créez votre premier tableau.</p>
          <button className="nm-btn nm-btn-primary" onClick={onCreate}><Plus size={14} /> Créer</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {canvases.map((c) => (
            <div
              key={c.id}
              className="nm-card-sm"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => onSelect(c)}
            >
              {/* Thumbnail / placeholder */}
              <div
                style={{
                  height: 140,
                  background: `linear-gradient(135deg, ${color}15, ${color}30)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Pen size={32} style={{ color, opacity: 0.4 }} />
                )}
                <button
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: 6,
                    padding: 4,
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                >
                  <Trash2 size={12} style={{ color: '#D85A30' }} />
                </button>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {new Date(c.updated_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fabric.js canvas editor (lazy loaded)
const PALETTE = ['#1D9E75', '#378ADD', '#888780', '#D85A30', '#7F77DD', '#2C2C2A', '#fff', '#ef4444', '#f59e0b'];

type Tool = 'select' | 'pen' | 'rect' | 'circle' | 'text' | 'eraser' | 'line' | 'arrow';

function CanvasEditor({
  canvas,
  division,
  onBack,
  onSaved,
}: {
  canvas: Canvas;
  division: DivisionKey | null;
  onBack: () => void;
  onSaved: (updated: Canvas) => void;
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<unknown>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeColor, setActiveColor] = useState(getDivisionColor(division ?? 'agencement'));
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [canvasName, setCanvasName] = useState(canvas.name);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const supabase = createSupabaseClient();

  useEffect(() => {
    let fc: unknown = null;
    import('fabric').then(({ Canvas: FabricCanvas, PencilBrush }) => {
      if (!canvasElRef.current) return;
      const fabricCanvas = new FabricCanvas(canvasElRef.current!, {
        backgroundColor: '#E2E6EC',
        isDrawingMode: false,
        width: canvasElRef.current!.parentElement?.clientWidth ?? 800,
        height: canvasElRef.current!.parentElement?.clientHeight ?? 600,
      });

      // Load existing JSON
      if (canvas.canvas_json && Object.keys(canvas.canvas_json).length > 0) {
        fabricCanvas.loadFromJSON(canvas.canvas_json, () => fabricCanvas.renderAll());
      }

      const brush = new PencilBrush(fabricCanvas);
      brush.color = activeColor;
      brush.width = strokeWidth;
      fabricCanvas.freeDrawingBrush = brush;

      fc = fabricCanvas;
      fabricRef.current = fabricCanvas;
    });

    return () => {
      if (fc) (fc as { dispose: () => void }).dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tool switching
  useEffect(() => {
    const fc = fabricRef.current as { isDrawingMode: boolean; freeDrawingBrush: { color: string; width: number }; defaultCursor: string } | null;
    if (!fc) return;
    fc.isDrawingMode = activeTool === 'pen' || activeTool === 'eraser';
    if (fc.isDrawingMode) {
      fc.freeDrawingBrush.color = activeTool === 'eraser' ? '#E2E6EC' : activeColor;
      fc.freeDrawingBrush.width = activeTool === 'eraser' ? 20 : strokeWidth;
    }
  }, [activeTool, activeColor, strokeWidth]);

  const addShape = useCallback((type: Tool) => {
    import('fabric').then(({ Rect, Circle, Textbox, Line }) => {
      const fc = fabricRef.current as { add: (obj: unknown) => void; renderAll: () => void } | null;
      if (!fc) return;
      let obj;
      switch (type) {
        case 'rect':
          obj = new Rect({ left: 100, top: 100, fill: activeColor + '40', stroke: activeColor, strokeWidth, width: 150, height: 100, rx: 8 });
          break;
        case 'circle':
          obj = new Circle({ left: 150, top: 150, fill: activeColor + '40', stroke: activeColor, strokeWidth, radius: 60 });
          break;
        case 'text':
          obj = new Textbox('Texte', { left: 100, top: 100, fill: activeColor, fontSize: 16, fontFamily: 'Geist, sans-serif', width: 200 });
          break;
        case 'line':
          obj = new Line([50, 50, 250, 250], { stroke: activeColor, strokeWidth });
          break;
        default: return;
      }
      fc.add(obj);
      fc.renderAll();
    });
  }, [activeColor, strokeWidth]);

  const handleSave = useCallback(async () => {
    const fc = fabricRef.current as { toJSON: () => object; toDataURL: (opts: object) => string } | null;
    if (!fc || saving) return;
    setSaving(true);
    try {
      const json = fc.toJSON();
      const thumbnail = fc.toDataURL({ format: 'png', multiplier: 0.25 });
      // Upload thumbnail
      const blob = await (await fetch(thumbnail)).blob();
      const thumbPath = `thumbnails/${canvas.id}.png`;
      await supabase.storage.from('canvases').upload(thumbPath, blob, { upsert: true });
      const { data: urlData } = supabase.storage.from('canvases').getPublicUrl(thumbPath);
      await supabase.from('canvases').update({
        name: canvasName,
        canvas_json: json,
        thumbnail_url: urlData?.publicUrl ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', canvas.id);
      setLastSaved(new Date());
      onSaved({ ...canvas, name: canvasName, canvas_json: json as Record<string, unknown>, updated_at: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  }, [canvas, canvasName, saving, supabase, onSaved]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(handleSave, 30000);
    return () => clearInterval(interval);
  }, [handleSave]);

  const handleExport = (format: 'png' | 'svg') => {
    const fc = fabricRef.current as { toDataURL: (opts: object) => string; toSVG: () => string } | null;
    if (!fc) return;
    const a = document.createElement('a');
    if (format === 'svg') {
      const svg = fc.toSVG();
      a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      a.download = `${canvasName}.svg`;
    } else {
      a.href = fc.toDataURL({ format: 'png', multiplier: 2 });
      a.download = `${canvasName}.png`;
    }
    a.click();
  };

  const TOOLS: Array<{ key: Tool; icon: React.ElementType; label: string }> = [
    { key: 'select', icon: Move,   label: 'Sélection' },
    { key: 'pen',    icon: Pen,    label: 'Crayon' },
    { key: 'rect',   icon: Square, label: 'Rectangle' },
    { key: 'circle', icon: Circle, label: 'Cercle' },
    { key: 'text',   icon: Type,   label: 'Texte' },
    { key: 'line',   icon: Minus,  label: 'Ligne' },
    { key: 'eraser', icon: Eraser, label: 'Gomme' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div
        className="nm-card"
        style={{
          margin: '16px 16px 0',
          borderRadius: 14,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button className="nm-btn" style={{ padding: '6px 10px' }} onClick={onBack}>
          <ChevronLeft size={14} />
        </button>
        <input
          className="nm-input"
          value={canvasName}
          onChange={e => setCanvasName(e.target.value)}
          style={{ flex: 1, maxWidth: 220 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {lastSaved && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="nm-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleExport('png')}><Download size={13} /> PNG</button>
          <button className="nm-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleExport('svg')}><Download size={13} /> SVG</button>
          <button className="nm-btn nm-btn-primary" style={{ padding: '6px 14px', fontSize: '0.75rem' }} onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? '…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', margin: '8px 16px 16px' }}>
        {/* Left tool palette */}
        <div
          className="nm-card"
          style={{
            width: 52,
            marginRight: 8,
            borderRadius: 14,
            padding: '10px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {TOOLS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              className="nm-btn"
              title={label}
              style={{
                padding: '8px',
                boxShadow: activeTool === key ? 'var(--inset-sm)' : 'var(--raised-xs)',
                color: activeTool === key ? activeColor : 'var(--text-muted)',
              }}
              onClick={() => {
                setActiveTool(key);
                if (['rect', 'circle', 'text', 'line'].includes(key)) addShape(key);
              }}
            >
              <Icon size={16} />
            </button>
          ))}

          <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

          {/* Color swatches */}
          {PALETTE.map(c => (
            <button
              key={c}
              title={c}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: c,
                border: activeColor === c ? `2px solid var(--text-primary)` : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: 'var(--raised-xs)',
                outline: 'none',
                transition: 'transform 0.1s',
                transform: activeColor === c ? 'scale(1.15)' : 'scale(1)',
              }}
              onClick={() => setActiveColor(c)}
            />
          ))}

          <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

          {/* Stroke width */}
          {[1, 2, 4, 8].map(w => (
            <button
              key={w}
              className="nm-btn"
              style={{
                padding: '6px 8px',
                fontSize: '0.65rem',
                fontWeight: 700,
                boxShadow: strokeWidth === w ? 'var(--inset-xs)' : 'var(--raised-xs)',
              }}
              onClick={() => setStrokeWidth(w)}
            >
              {w}px
            </button>
          ))}
        </div>

        {/* Canvas area */}
        <div
          className="nm-card"
          style={{ flex: 1, borderRadius: 14, overflow: 'hidden', position: 'relative' }}
        >
          <canvas ref={canvasElRef} style={{ display: 'block' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Canvas page ──────────────────────────────────────────────────────────
export default function CanvasPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<Canvas | null>(null);
  const supabase = createSupabaseClient();

  const loadCanvases = useCallback(async () => {
    let q = supabase.from('canvases').select('*').order('updated_at', { ascending: false });
    if (activeDivision) q = q.eq('division', activeDivision);
    const { data } = await q;
    setCanvases(data ?? []);
  }, [activeDivision, supabase]);

  useEffect(() => { loadCanvases(); }, [loadCanvases]);

  const handleCreate = async () => {
    const div = activeDivision ?? 'divers';
    const { data } = await supabase.from('canvases').insert({
      division: div,
      name: `Canvas ${new Date().toLocaleDateString('fr-FR')}`,
      canvas_json: {},
    }).select().single();
    if (data) { setActiveCanvas(data); loadCanvases(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('canvases').delete().eq('id', id);
    loadCanvases();
  };

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      {activeCanvas ? (
        <CanvasEditor
          canvas={activeCanvas}
          division={activeDivision}
          onBack={() => { setActiveCanvas(null); loadCanvases(); }}
          onSaved={(updated) => setActiveCanvas(updated)}
        />
      ) : (
        <CanvasList
          canvases={canvases}
          onSelect={setActiveCanvas}
          onCreate={handleCreate}
          onDelete={handleDelete}
          division={activeDivision}
        />
      )}
    </AppShell>
  );
}
