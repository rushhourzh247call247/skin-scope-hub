import { useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle, CheckCheck, Search, MoreVertical,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

const WA_BG = "bg-[hsl(200,15%,92%)]";
const WA_BUBBLE_OUT = "bg-[hsl(152,60%,90%)]";
const WA_BUBBLE_IN = "bg-card";

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

function ReadTicks({ msg, isAdmin }: { msg: TicketMessage; isAdmin: boolean }) {
  const isMine = isAdmin ? msg.is_admin : !msg.is_admin;
  if (!isMine) return null;
  return <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${msg.read_at ? "text-blue-500" : "text-muted-foreground/50"}`} />;
}

export default function Tickets() {
  const { t } = useTranslation();
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

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch (e: any) {
      toast({ title: t("tickets.error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Poll ticket list every 15s for new tickets / unread counts
  useEffect(() => {
    const interval = setInterval(() => {
      api.getTickets().then(data => setTickets(data)).catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Poll selected conversation every 5s for new messages (real-time feel)
  useEffect(() => {
    if (!selected) return;
    const id = selected.id;
    const interval = setInterval(async () => {
      try {
        const updated = await api.getTicket(id);
        setSelected(prev => {
          if (!prev || prev.id !== id) return prev;
          // Only update if message count changed (avoid unnecessary re-renders)
          if (updated.messages.length !== prev.messages.length || updated.status !== prev.status) {
            return updated;
          }
          return prev;
        });
        setTickets(prev => prev.map(t => t.id === id ? { ...updated, unread_count: 0 } : t));
      } catch {}
    }, 5_000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages?.length]);

  useEffect(() => {
    if (selected && (selected.unread_count ?? 0) > 0) {
      api.markTicketRead(selected.id).catch(() => {});
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, unread_count: 0 } : t));
    }
  }, [selected?.id]);

  const refreshSelected = useCallback(async (ticketId: number) => {
    try {
      const updated = await api.getTicket(ticketId);
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...updated, unread_count: 0 } : t));
    } catch {}
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const ticket = await api.createTicket({ subject: newSubject.trim(), message: newMessage.trim(), priority: newPriority });
      await fetchTickets();
      setCreateOpen(false);
      setNewSubject(""); setNewMessage(""); setNewPriority("normal");
      // Select the new ticket and load its messages
      const full = await api.getTicket(ticket.id);
      setSelected(full);
      toast({ title: t("tickets.created") });
    } catch (e: any) {
      toast({ title: t("tickets.error"), description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  }, [newSubject, newMessage, newPriority, fetchTickets, toast, t]);

  const handleReply = useCallback(async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await api.replyTicket(selected.id, replyText.trim());
      setReplyText("");
      await refreshSelected(selected.id);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (e: any) {
      toast({ title: t("tickets.error"), description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  }, [replyText, selected, refreshSelected, toast, t]);

  const handleClose = useCallback(async (id: number) => {
    try { await api.closeTicket(id); await refreshSelected(id); await fetchTickets(); toast({ title: t("tickets.closed") }); }
    catch (e: any) { toast({ title: t("tickets.error"), description: e.message, variant: "destructive" }); }
  }, [refreshSelected, fetchTickets, toast, t]);

  const handleReopen = useCallback(async (id: number) => {
    try { await api.reopenTicket(id); await refreshSelected(id); await fetchTickets(); toast({ title: t("tickets.reopened") }); }
    catch (e: any) { toast({ title: t("tickets.error"), description: e.message, variant: "destructive" }); }
  }, [refreshSelected, fetchTickets, toast, t]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: t("tickets.deleted") });
    } catch (e: any) { toast({ title: t("tickets.error"), description: e.message, variant: "destructive" }); }
  }, [selected?.id, toast, t]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

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

  const groups = selected ? groupByDate(selected.messages || []) : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0 border border-border rounded-none sm:rounded-xl overflow-hidden shadow-sm sm:m-4">

        {/* ───── LEFT: Conversation list ───── */}
        <div className={`w-full lg:w-[380px] lg:max-w-[380px] shrink-0 flex flex-col border-r border-border bg-card
          ${selected ? "hidden lg:flex" : "flex"}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <h2 className="text-lg font-semibold">
              {isAdmin ? t("tickets.supportTickets") : t("tickets.support")}
            </h2>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> {t("tickets.newTicket")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("tickets.createTitle")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t("tickets.subject")}</label>
                    <Input
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder={t("tickets.subjectPlaceholder")}
                      maxLength={200}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t("tickets.priority")}</label>
                    <Select value={newPriority} onValueChange={v => setNewPriority(v as TicketPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">{t("tickets.normal")}</SelectItem>
                        <SelectItem value="urgent">
                          <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> {t("tickets.urgent")}</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t("tickets.message")}</label>
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={t("tickets.messagePlaceholder")}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">{t("tickets.cancel")}</Button>
                  <Button onClick={handleCreate} disabled={creating || !newSubject.trim() || !newMessage.trim()} className="w-full sm:w-auto">
                    {creating ? t("tickets.creating") : t("tickets.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("tickets.search")} className="pl-9 h-9 text-sm bg-muted/50 border-0"
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
                {searchQuery ? t("tickets.noResults") : t("tickets.noTickets")}
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
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors touch-manipulation
                      ${isActive ? "bg-primary/10" : "hover:bg-muted/50 active:bg-muted"}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground
                      ${ticket.status === "closed" ? "bg-muted-foreground/40" : ticket.priority === "urgent" ? "bg-destructive" : "bg-primary"}`}>
                      {ticket.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
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
                              {t("tickets.done")}
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

        {/* ───── RIGHT: Chat view ───── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selected ? "hidden lg:flex" : "flex"}`}>
          {selected ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border bg-card shrink-0">
                <Button variant="ghost" size="icon" className="shrink-0 lg:hidden h-8 w-8" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground
                  ${selected.priority === "urgent" ? "bg-destructive" : "bg-primary"}`}>
                  {selected.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selected.subject}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {selected.user_name}
                    {isAdmin && selected.company_name && ` · ${selected.company_name}`}
                    {" · "}Ticket #{selected.id}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selected.status === "closed" ? (
                      <DropdownMenuItem onClick={() => handleReopen(selected.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" /> {t("tickets.reopen")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleClose(selected.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> {t("tickets.markDone")}
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> {t("tickets.delete")}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("tickets.deleteConfirm")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ticket #{selected.id} „{selected.subject}" {t("tickets.deleteWarning")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("tickets.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(selected.id)} className="bg-destructive hover:bg-destructive/90">
                              {t("tickets.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Chat messages */}
              <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 min-h-0 ${WA_BG}`}
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
              >
                <div className="flex justify-center mb-4">
                  <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
                    <p className="text-[11px] text-muted-foreground text-center">
                      {t("tickets.createdOn")} {formatChatDate(selected.created_at)} {t("tickets.at")} {formatTime(selected.created_at)}
                      {selected.priority === "urgent" && " · 🔴 " + t("tickets.urgent")}
                    </p>
                  </div>
                </div>

                {groups.map(group => (
                  <div key={group.date}>
                    <div className="flex justify-center my-3">
                      <span className="bg-card/90 backdrop-blur-sm text-[11px] text-muted-foreground px-3 py-1 rounded-lg shadow-sm">
                        {group.date}
                      </span>
                    </div>
                    {group.msgs.map(msg => {
                      const isMine = isAdmin ? msg.is_admin : !msg.is_admin;
                      return (
                        <div key={msg.id} className={`flex mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`relative max-w-[88%] sm:max-w-[70%] rounded-lg px-3 pt-1.5 pb-1 shadow-sm
                            ${isMine ? `${WA_BUBBLE_OUT} rounded-tr-none` : `${WA_BUBBLE_IN} rounded-tl-none`}`}>
                            {!isMine && (
                              <p className="text-[11px] font-semibold text-primary mb-0.5">
                                {msg.user_name}{msg.is_admin ? " (Support)" : ""}
                              </p>
                            )}
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap pr-14">{msg.message}</p>
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

                {selected.status === "closed" && (
                  <div className="flex justify-center mt-4">
                    <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[11px] text-muted-foreground">
                        {t("tickets.ticketClosed")}
                        {selected.closed_at && ` · ${formatChatDate(selected.closed_at)} ${formatTime(selected.closed_at)}`}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              {selected.status !== "closed" ? (
                <div className="border-t border-border bg-card px-2 sm:px-3 py-2 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={replyText}
                      onChange={handleTextareaChange}
                      placeholder={t("tickets.writePlaceholder")}
                      rows={1}
                      className="flex-1 resize-none rounded-2xl border border-input bg-muted/30 px-3 sm:px-4 py-2 text-sm leading-relaxed
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
                  <p className="text-sm text-muted-foreground">{t("tickets.ticketIsClosed")}</p>
                  <Button variant="link" size="sm" onClick={() => handleReopen(selected.id)} className="mt-1">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("tickets.reopen")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className={`flex-1 flex items-center justify-center ${WA_BG}`}>
              <div className="text-center max-w-sm px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Send className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {isAdmin ? t("tickets.supportTickets") : "derm247 Support"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? t("tickets.adminEmptyHint")
                    : t("tickets.userEmptyHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
