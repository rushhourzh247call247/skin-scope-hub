export type TicketStatus = 'open' | 'answered' | 'closed';
export type TicketPriority = 'normal' | 'urgent';

export interface Ticket {
  id: number;
  user_id: number;
  user_name: string;
  company_id: number;
  company_name?: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  is_admin: boolean;
  message: string;
  created_at: string;
  read_at?: string | null;
}
