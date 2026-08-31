export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'pending' | 'active' | 'blocked';

export interface UserProfile {
  id: string;
  email: string;
  telegram_nickname: string;
  role: UserRole;
  status: UserStatus;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  order: number;
}

export interface Article {
  id: string;
  space_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  parent_id?: string | null;
  order: number;
  tags: string[];
  is_pinned?: boolean;
  views_count: number;
  read_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_telegram: string;
  action: string;
  target_id?: string;
  target_type: 'user' | 'article' | 'space' | 'report' | 'system';
  details: string;
  created_at: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: string;
  article_id?: string;
  order: number;
  duration_minutes: number;
}

export interface UserOnboardingProgress {
  user_id: string;
  completed_step_ids: string[];
  started_at: string;
  updated_at: string;
}

export type ReportStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_clarification';
export type ReportType = 'shift_report' | 'incident_report' | 'handover_report' | 'financial_receipt' | 'custom_report';

export interface EmployeeReport {
  id: string;
  telegram_user_id?: string;
  telegram_username: string; // e.g. @driver_alex
  employee_name: string;
  report_type: ReportType;
  title: string;
  shift_date: string; // YYYY-MM-DD
  status: ReportStatus;
  metrics: {
    hours_worked?: number;
    mileage_km?: number;
    kwh_charged?: number;
    vehicle_plate?: string;
    tasks_count?: number;
    incident_level?: 'low' | 'medium' | 'critical';
    [key: string]: any;
  };
  notes: string;
  attachments?: Array<{
    type: 'photo' | 'document' | 'video';
    url: string;
    caption?: string;
  }>;
  raw_payload?: Record<string, any>;
  reviewer_id?: string;
  reviewer_name?: string;
  review_comment?: string;
  created_at: string;
  updated_at: string;
}
