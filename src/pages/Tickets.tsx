import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import type { Ticket, TicketMessage, TicketPriority, TicketStatus } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageCircle, AlertTriangle, Clock, CircleDot,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Offen", color: "bg-yellow-500/15 text-yellow-700 border-yellow-300", icon: <CircleDot className="h-3 w-3" /> },
  answered: { label: "Beantwortet", color: "bg-blue-500/15 text-blue-700 border-blue-300", icon: <MessageCircle className="h-3 w-3" /> },
  closed: { label: "Erledigt", color: "bg-green-500/15 text-green-700 border-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export default function Tickets() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normal");
  const [creating, setCreating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
  }, [selectedTicket?.messages]);

  const refreshSelected = async (ticketId: number) => {
    try {
      const updated = await api.getTicket(ticketId);
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
    } catch {}
  };

  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const ticket = await api.createTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
        priority: newPriority,
      });
      setTickets(prev => [ticket, ...prev]);
      setCreateOpen(false);
      setNewSubject("");
      setNewMessage("");
      setNewPriority("normal");
      toast({ title: "Ticket erstellt", description: `#${ticket.id} – ${ticket.subject}` });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await api.replyTicket(selectedTicket.id, replyText.trim());
      setReplyText("");
      await refreshSelected(selectedTicket.id);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (ticketId: number) => {
    try {
      await api.closeTicket(ticketId);
      await refreshSelected(ticketId);
      await fetchTickets();
      toast({ title: "Ticket geschlossen" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const handleReopen = async (ticketId: number) => {
    try {
      await api.reopenTicket(ticketId);
      await refreshSelected(ticketId);
      await fetchTickets();
      toast({ title: "Ticket wieder geöffnet" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (ticketId: number) => {
    try {
      await api.deleteTicket(ticketId);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      toast({ title: "Ticket gelöscht" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const openTickets = tickets.filter(t => t.status !== "closed");
  const closedTickets = tickets.filter(t => t.status === "closed");

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd.MM.yyyy HH:mm", { locale: de }); }
    catch { return d; }
  };

  const TicketList = ({ items, showDelete }: { items: Ticket[]; showDelete?: boolean }) => (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Keine Tickets vorhanden</p>
      )}
      {items.map(ticket => (
        <Card
          key={ticket.id}
          className={`cursor-pointer transition-all hover:shadow-md ${selectedTicket?.id === ticket.id ? "ring-2 ring-primary" : ""}`}
          onClick={() => { setSelectedTicket(ticket); refreshSelected(ticket.id); }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{ticket.subject}</span>
                  {ticket.priority === "urgent" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>#{ticket.id}</span>
                  <span>·</span>
                  <span>{ticket.user_name}</span>
                  {isAdmin && ticket.company_name && (
                    <>
                      <span>·</span>
                      <span>{ticket.company_name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(ticket.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${statusConfig[ticket.status].color}`}>
                  <span className="mr-1">{statusConfig[ticket.status].icon}</span>
                  {statusConfig[ticket.status].label}
                </Badge>
                {showDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={e => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={e => e.stopPropagation()}>
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
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ChatView = ({ ticket }: { ticket: Ticket }) => (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b pb-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <CardTitle className="text-base truncate flex items-center gap-2">
                #{ticket.id} – {ticket.subject}
                {ticket.priority === "urgent" && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ticket.user_name} · {formatDate(ticket.created_at)}
                {isAdmin && ticket.company_name && ` · ${ticket.company_name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={statusConfig[ticket.status].color}>
              {statusConfig[ticket.status].label}
            </Badge>
            {ticket.status === "closed" ? (
              <Button variant="outline" size="sm" onClick={() => handleReopen(ticket.id)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Wieder öffnen
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleClose(ticket.id)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Als erledigt markieren
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {ticket.messages?.map(msg => (
          <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.is_admin
                ? "bg-muted text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium opacity-70">
                  {msg.user_name}{msg.is_admin ? " (Admin)" : ""}
                </span>
                <span className="text-[10px] opacity-50">{formatDate(msg.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </CardContent>

      {ticket.status !== "closed" && (
        <div className="border-t p-4 shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Nachricht schreiben…"
              className="min-h-[60px] resize-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <Button onClick={handleReply} disabled={!replyText.trim() || sending} className="shrink-0 self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Enter = Senden · Shift+Enter = Zeilenumbruch</p>
        </div>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "Support-Tickets" : "Meine Tickets"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Alle Support-Anfragen verwalten und beantworten"
              : "Erstellen Sie ein Ticket bei Fragen oder Problemen"}
          </p>
        </div>
        {!isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Neues Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Support-Ticket erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Betreff</label>
                  <Input
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    placeholder="Kurze Beschreibung des Problems"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Priorität</label>
                  <Select value={newPriority} onValueChange={v => setNewPriority(v as TicketPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Dringend
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nachricht</label>
                  <Textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Beschreiben Sie Ihr Anliegen…"
                    rows={5}
                  />
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

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 min-h-[600px]">
        {/* Ticket list */}
        <div className={`space-y-4 ${selectedTicket ? "hidden lg:block" : ""}`}>
          <Tabs defaultValue="open">
            <TabsList className="w-full">
              <TabsTrigger value="open" className="flex-1">
                Offen ({openTickets.length})
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1">
                Erledigt ({closedTickets.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-3">
              <TicketList items={openTickets} />
            </TabsContent>
            <TabsContent value="closed" className="mt-3">
              <TicketList items={closedTickets} showDelete={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat / Detail */}
        <div className={`${!selectedTicket ? "hidden lg:flex lg:items-center lg:justify-center" : ""}`}>
          {selectedTicket ? (
            <ChatView ticket={selectedTicket} />
          ) : (
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Wählen Sie ein Ticket aus der Liste</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
