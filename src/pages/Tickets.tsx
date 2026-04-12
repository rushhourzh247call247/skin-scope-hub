import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Ticket, TicketMessage, TicketPriority } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Send, CheckCircle2, ArrowLeft, Trash2, RotateCcw,
  AlertTriangle, Check, CheckCheck, Search, MoreVertical,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- WhatsApp-green tokens (mapped to design system where possible) ---
const WA_BG = "bg-[hsl(200,15%,92%)]"; // chat background like WhatsApp light gray
const WA_BUBBLE_OUT = "bg-[hsl(152,60%,90%)]"; // outgoing bubble - green tint
const WA_BUBBLE_IN = "bg-card"; // incoming bubble - white

function formatTime(d: string) {
  try { return format(new Date(d), "HH:mm"); } catch { return ""; }
}

function formatChatDate(d: string) {
  try {
    const date = new Date(d);
    if (isToday(date)) return "Heute";
    if (isYesterday(date)) return "Gestern";
    return format(date, "dd.MM.yyyy", { locale: de });
  } catch { return d; }
}

function formatListDate(d: string) {
  try {
    const date = new Date(d);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Gestern";
    return format(date, "dd.MM.yy");
  } catch { return ""; }
}

/** Group messages by date */
function groupByDate(messages: TicketMessage[]) {
  const groups: { date: string; msgs: TicketMessage[] }[] = [];
  messages.forEach(m => {
    const d = formatChatDate(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.date === d) { last.msgs.push(m); }
    else { groups.push({ date: d, msgs: [m] }); }
  });
  return groups;
}

/** Read receipt ticks */
function ReadTicks({ msg, isAdmin }: { msg: TicketMessage; isAdmin: boolean }) {
  // Only show ticks on YOUR sent messages
  const isMine = isAdmin ? msg.is_admin : !msg.is_admin;
  if (!isMine) return null;

  if (msg.read_at) {
    return <CheckCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  }
  return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

export default function Tickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normal");
  const [creating, setCreating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTickets = async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  // Mark as read when opening a ticket
  useEffect(() => {
    if (selected && (selected.unread_count ?? 0) > 0) {
      api.markTicketRead(selected.id).catch(() => {});
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, unread_count: 0 } : t));
    }
  }, [selected?.id]);

  const refreshSelected = async (ticketId: number) => {
    try {
      const updated = await api.getTicket(ticketId);
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...updated, unread_count: 0 } : t));
    } catch {}
  };

  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const ticket = await api.createTicket({ subject: newSubject.trim(), message: newMessage.trim(), priority: newPriority });
      setTickets(prev => [ticket, ...prev]);
      setCreateOpen(false);
      setNewSubject(""); setNewMessage(""); setNewPriority("normal");
      setSelected(ticket);
      toast({ title: "Ticket erstellt" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await api.replyTicket(selected.id, replyText.trim());
      setReplyText("");
      await refreshSelected(selected.id);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleClose = async (id: number) => {
    try { await api.closeTicket(id); await refreshSelected(id); await fetchTickets(); toast({ title: "Ticket geschlossen" }); }
    catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
  };

  const handleReopen = async (id: number) => {
    try { await api.reopenTicket(id); await refreshSelected(id); await fetchTickets(); toast({ title: "Ticket wieder geöffnet" }); }
    catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Ticket gelöscht" });
    } catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // Filter tickets
  const filtered = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.subject.toLowerCase().includes(q)
      || t.user_name.toLowerCase().includes(q)
      || t.company_name?.toLowerCase().includes(q)
      || String(t.id).includes(q);
  });

  const sortedTickets = [...filtered].sort((a, b) => {
    const aTime = a.last_message_at || a.updated_at || a.created_at;
    const bTime = b.last_message_at || b.updated_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // --- CONVERSATION LIST (WhatsApp left panel) ---
  const ConversationList = () => (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h2 className="text-lg font-semibold">
          {isAdmin ? "Support-Tickets" : "Support"}
        </h2>
        {!isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Neues Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Support-Ticket erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Betreff</label>
                  <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Kurze Beschreibung" maxLength={200} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Priorität</label>
                  <Select value={newPriority} onValueChange={v => setNewPriority(v as TicketPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">
                        <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Dringend</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nachricht</label>
                  <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Beschreiben Sie Ihr Anliegen…" rows={5} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
                <Button onClick={handleCreate} disabled={creating || !newSubject.trim() || !newMessage.trim()}>
                  {creating ? "Wird erstellt…" : "Ticket erstellen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suchen…" className="pl-9 h-8 text-sm bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            {searchQuery ? "Keine Tickets gefunden" : "Noch keine Tickets"}
          </div>
        ) : (
          sortedTickets.map(ticket => {
            const isActive = selected?.id === ticket.id;
            const hasUnread = (ticket.unread_count ?? 0) > 0;
            const timeStr = formatListDate(ticket.last_message_at || ticket.updated_at || ticket.created_at);

            return (
              <div
                key={ticket.id}
                onClick={() => { setSelected(ticket); refreshSelected(ticket.id); }}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors
                  ${isActive ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground
                  ${ticket.status === "closed" ? "bg-muted-foreground/40" : ticket.priority === "urgent" ? "bg-destructive" : "bg-primary"}`}>
                  {ticket.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
                      {isAdmin ? ticket.user_name : `Ticket #${ticket.id}`}
                    </span>
                    <span className={`text-[11px] shrink-0 ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ticket.priority === "urgent" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                      <p className={`text-xs truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {ticket.last_message || ticket.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ticket.status === "closed" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-300">
                          Erledigt
                        </Badge>
                      )}
                      {hasUnread && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                          {ticket.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && ticket.company_name && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{ticket.company_name}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // --- CHAT VIEW (WhatsApp right panel) ---
  const ChatView = ({ ticket }: { ticket: Ticket }) => {
    const groups = groupByDate(ticket.messages || []);

    return (
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden h-8 w-8" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground
            ${ticket.priority === "urgent" ? "bg-destructive" : "bg-primary"}`}>
            {ticket.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{ticket.subject}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {ticket.user_name}
              {isAdmin && ticket.company_name && ` · ${ticket.company_name}`}
              {" · "}Ticket #{ticket.id}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ticket.status === "closed" ? (
                <DropdownMenuItem onClick={() => handleReopen(ticket.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Wieder öffnen
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleClose(ticket.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Als erledigt markieren
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Ticket löschen
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ticket löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ticket #{ticket.id} „{ticket.subject}" wird unwiderruflich gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(ticket.id)} className="bg-destructive hover:bg-destructive/90">
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Chat messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-1 min-h-0 ${WA_BG}`}
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        >
          {/* System message at start */}
          <div className="flex justify-center mb-4">
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-[11px] text-muted-foreground text-center">
                Ticket erstellt am {formatChatDate(ticket.created_at)} um {formatTime(ticket.created_at)}
                {ticket.priority === "urgent" && " · 🔴 Dringend"}
              </p>
            </div>
          </div>

          {groups.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex justify-center my-3">
                <span className="bg-card/90 backdrop-blur-sm text-[11px] text-muted-foreground px-3 py-1 rounded-lg shadow-sm">
                  {group.date}
                </span>
              </div>

              {group.msgs.map(msg => {
                const isMine = isAdmin ? msg.is_admin : !msg.is_admin;
                return (
                  <div key={msg.id} className={`flex mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 pt-1.5 pb-1 shadow-sm
                      ${isMine ? `${WA_BUBBLE_OUT} rounded-tr-none` : `${WA_BUBBLE_IN} rounded-tl-none`}`}>
                      {/* Sender name (show for admin viewing doctor messages, or doctor viewing admin messages) */}
                      {!isMine && (
                        <p className="text-[11px] font-semibold text-primary mb-0.5">
                          {msg.user_name}{msg.is_admin ? " (Support)" : ""}
                        </p>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap pr-16">{msg.message}</p>
                      {/* Time + read ticks */}
                      <div className="flex items-center justify-end gap-1 -mt-3 mb-0.5">
                        <span className="text-[10px] text-muted-foreground/70">{formatTime(msg.created_at)}</span>
                        <ReadTicks msg={msg} isAdmin={isAdmin} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Closed indicator */}
          {ticket.status === "closed" && (
            <div className="flex justify-center mt-4">
              <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="text-[11px] text-muted-foreground">
                  Ticket wurde als erledigt markiert
                  {ticket.closed_at && ` · ${formatChatDate(ticket.closed_at)} ${formatTime(ticket.closed_at)}`}
                </p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        {ticket.status !== "closed" ? (
          <div className="border-t border-border bg-card px-3 py-2 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={handleTextareaChange}
                placeholder="Nachricht schreiben…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-input bg-muted/30 px-4 py-2 text-sm leading-relaxed
                  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
                  max-h-[120px] min-h-[40px]"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }
                }}
              />
              <Button
                size="icon"
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="h-10 w-10 rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted/30 px-4 py-3 text-center shrink-0">
            <p className="text-sm text-muted-foreground">Dieses Ticket ist geschlossen.</p>
            <Button variant="link" size="sm" onClick={() => handleReopen(ticket.id)} className="mt-1">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Wieder öffnen
            </Button>
          </div>
        )}
      </div>
    );
  };

  // --- EMPTY STATE ---
  const EmptyChat = () => (
    <div className={`flex-1 flex items-center justify-center ${WA_BG}`}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Send className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {isAdmin ? "Support-Tickets" : "derm247 Support"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Wählen Sie ein Ticket aus der Liste um die Konversation zu öffnen."
            : "Erstellen Sie ein Ticket wenn Sie Hilfe benötigen. Wir antworten so schnell wie möglich."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      <div className="flex-1 flex min-h-0 border border-border rounded-none sm:rounded-xl overflow-hidden shadow-sm sm:m-4">
        {/* Left: Conversation list */}
        <div className={`w-full lg:w-[380px] lg:max-w-[380px] shrink-0 ${selected ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}>
          <ConversationList />
        </div>

        {/* Right: Chat */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selected ? "hidden lg:flex" : "flex"}`}>
          {selected ? <ChatView ticket={selected} /> : <EmptyChat />}
        </div>
      </div>
    </div>
  );
}
