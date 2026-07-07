'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor, getDivisionLabel } from '@/lib/divisions';
import { Project, Task, Objective } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import { BarChart2, TrendingUp, CheckSquare, Target, Clock, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const supabase = createSupabaseClient();
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: projData } = await supabase.from('projects').select('*');
    const { data: taskData } = await supabase.from('tasks').select('*');
    const { data: objData } = await supabase.from('objectives').select('*');

    setProjects((projData ?? []) as Project[]);
    setTasks((taskData ?? []) as Task[]);
    setObjectives((objData ?? []) as Objective[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
        <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Chargement des données analytiques...</div>
      </AppShell>
    );
  }

  // Filter based on division selection
  const filteredProjects = activeDivision ? projects.filter(p => p.division === activeDivision) : projects;
  const projectIds = new Set(filteredProjects.map(p => p.id));
  const filteredTasks = tasks.filter(t => t.project_id && projectIds.has(t.project_id));
  const filteredObjectives = objectives.filter(o => projectIds.has(o.project_id));

  // Compute stats
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter(p => p.status === 'active').length;
  const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;
  
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
  const pendingTasks = filteredTasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
  const blockedTasks = filteredTasks.filter(t => t.status === 'blocked').length;

  const totalObjectives = filteredObjectives.length;
  const completedObjectives = filteredObjectives.filter(o => o.status === 'done').length;

  const avgProgress = totalProjects > 0 
    ? Math.round(filteredProjects.reduce((acc, p) => acc + (p.progress ?? 0), 0) / totalProjects) 
    : 0;

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const objectiveCompletionRate = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0;

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="heading" style={{ fontSize: '1.75rem', marginBottom: 4 }}>Analytiques & Rapports</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Vue d'ensemble de la performance globale du CRM WorkOS
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
          <div className="nm-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Taux de progression moyen</span>
              <TrendingUp size={16} style={{ color: '#1D9E75' }} />
            </div>
            <h2 className="heading" style={{ fontSize: '1.75rem', color: '#1D9E75' }}>{avgProgress}%</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sur l'ensemble des projets de la division</p>
          </div>

          <div className="nm-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tâches complétées</span>
              <CheckSquare size={16} style={{ color: '#378ADD' }} />
            </div>
            <h2 className="heading" style={{ fontSize: '1.75rem', color: '#378ADD' }}>{taskCompletionRate}%</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{completedTasks} terminées sur {totalTasks} au total</p>
          </div>

          <div className="nm-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Objectifs atteints</span>
              <Target size={16} style={{ color: '#7F77DD' }} />
            </div>
            <h2 className="heading" style={{ fontSize: '1.75rem', color: '#7F77DD' }}>{objectiveCompletionRate}%</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{completedObjectives} atteints sur {totalObjectives} au total</p>
          </div>
        </div>

        {/* Breakdown Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          
          {/* Projects Summary */}
          <div className="nm-card" style={{ padding: '20px' }}>
            <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 16 }}>Statut des projets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Projets actifs</span>
                <span style={{ fontWeight: 700 }}>{activeProjects}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Projets terminés</span>
                <span style={{ fontWeight: 700 }}>{completedProjects}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Total projets</span>
                <span style={{ fontWeight: 700 }}>{totalProjects}</span>
              </div>
            </div>
          </div>

          {/* Tasks Summary */}
          <div className="nm-card" style={{ padding: '20px' }}>
            <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 16 }}>Répartition des tâches</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> En cours / À faire</span>
                <span style={{ fontWeight: 700 }}>{pendingTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={12} style={{ color: '#D85A30' }} /> Bloquées</span>
                <span style={{ fontWeight: 700, color: '#D85A30' }}>{blockedTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Complétées</span>
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>{completedTasks}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
