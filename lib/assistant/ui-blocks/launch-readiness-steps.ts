import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';

export const LAUNCH_READINESS_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'prepare', label: 'Vorbereitung', status: 'pending' },
  { id: 'create_project', label: 'Plattform-Projekt', status: 'pending' },
  { id: 'sync_diagnose', label: 'Sync & Konnektivität', status: 'pending' },
  { id: 'parallel_research', label: 'Research', status: 'pending' },
  { id: 'audit_pagespeed', label: 'PageSpeed', status: 'pending' },
  { id: 'audit_quick_scan', label: 'Accessibility-Scan', status: 'pending' },
  { id: 'audit_ssl', label: 'SSL-Check', status: 'pending' },
  { id: 'persona_bootstrap', label: 'Persona-Bootstrap', status: 'pending' },
  { id: 'project_summary', label: 'Projekt-Zusammenfassung', status: 'pending' },
  { id: 'aggregate', label: 'Launch-Report', status: 'pending' },
];
