export type Role = 'manager' | 'exec';
export type Status = 'pend' | 'prog' | 'done' | 'block';
export type BlockId = 'seo' | 'smm' | 'sem' | 'ops';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  hrs_per_day: number;
  days_per_month: number;
  created_at: string;
}

export interface Site {
  id: string;
  type: string;
  url: string;
  da: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  member_id: string;
  project_id: string;
  site_id: string;
  type: string;
  day: string;
  month: string;
  start_time: string | null;
  end_time: string | null;
  status: 'done' | 'block';
  created_at: string;
}

export interface TimeEntry {
  id: string;
  member_id: string;
  project_id: string | null;
  day: string;
  task: string;
  block: BlockId;
  start_time: string | null;
  end_time: string | null;
  minutes: number;
  status: Status;
  created_at: string;
}

export interface PlanTask {
  id: string;
  project_id: string;
  month: string;
  block: BlockId;
  freq: string;
  task: string;
  minutes: number;
  rate: string;
  notes: string;
  weeks: Status[];
  position: number;
  created_at: string;
}

export interface ActiveTimer {
  member_id: string;
  task: string;
  block: BlockId;
  project_id: string | null;
  day: string;
  start_label: string;
  started_at: string;
}

export interface Quota {
  type: string;
  per_day: number;
}
