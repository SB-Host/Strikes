export type Role = "MEMBER" | "LEADER" | "OWNER";
export type StrikeStatus = "ACTIVE" | "CLEARED" | "EXPIRED" | "VOIDED";

export type Member = {
  id: string;
  name: string;
  handle: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  accent: string;
  must_change_pin: number;
  created_at: number;
  last_seen_at: number | null;
};

export type Strike = {
  id: string;
  member_id: string;
  reason: string;
  category: string;
  weight: number;
  note: string | null;
  task: string | null;
  issued_by: string;
  issued_at: number;
  expires_at: number | null;
  status: StrikeStatus;
  resolved_at: number | null;
  resolved_by: string | null;
  resolution_note: string | null;
  task_submitted_at: number | null;
  task_submitted_note: string | null;
};

export type StrikeView = Strike & {
  member_name: string;
  member_handle: string;
  member_accent: string;
  issued_by_name: string | null;
  resolved_by_name: string | null;
  appeal_status: string | null;
};

export type Standing = {
  member: Member;
  active: number;      // count of active strikes
  weight: number;      // summed severity of active strikes
  lifetime: number;    // every strike ever issued that wasn't voided
  cleared: number;
  cleanSince: number | null;  // timestamp of the most recent strike, or null
  oldestActiveAt: number | null;
  nextExpiry: number | null;
  pendingTasks: number;
  tier: "CLEAR" | "CARRYING" | "WATCH" | "WARNING" | "OVER";
};

export type GroupEvent = {
  id: string;
  kind: string;
  actor_id: string | null;
  member_id: string | null;
  strike_id: string | null;
  summary: string;
  detail: string | null;
  created_at: number;
};

export type Appeal = {
  id: string;
  strike_id: string;
  member_id: string;
  message: string;
  status: "OPEN" | "UPHELD" | "GRANTED";
  created_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
  response: string | null;
  member_name?: string;
  reason?: string;
};
