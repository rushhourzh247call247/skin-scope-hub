export interface ContactReply {
  id: number;
  contact_request_id: number;
  admin_user_id: number;
  admin_name: string;
  subject: string;
  body: string;
  direction: 'outbound' | 'inbound';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRequest {
  id: number;
  name: string;
  email: string;
  company: string | null;
  message: string;
  ip_address: string | null;
  locale: string;
  confirmed_at: string;
  replied_at: string | null;
  replied_by_user_id: number | null;
  last_admin_seen_at: string | null;
  created_at: string;
  updated_at: string;
  replies: ContactReply[];
}
