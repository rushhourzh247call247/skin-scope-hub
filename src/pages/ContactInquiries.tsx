import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Mail, Search, Reply, Trash2, Loader2, CheckCircle2, Inbox,
  Building2, Clock, Send, ArrowLeft, MailCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "@/lib/api";
import type { ContactRequest } from "@/types/contactRequest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Filter = "all" | "new" | "replied";

const replySchema = z.object({
  subject: z.string().trim().min(3, "Betreff zu kurz").max(255),
  body: z.string().trim().min(10, "Antwort zu kurz").max(10000),
});

export default function ContactInquiries() {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactRequest | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await api.getContactRequests();
      setItems(data);
      // Refresh selected
      if (selected) {
        const updated = data.find((i) => i.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (filter === "new") result = result.filter((i) => !i.replied_at);
    if (filter === "replied") result = result.filter((i) => !!i.replied_at);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q) ||
          (i.company ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, filter, search]);

  const counts = useMemo(
    () => ({
      all: items.length,
      new: items.filter((i) => !i.replied_at).length,
      replied: items.filter((i) => !!i.replied_at).length,
    }),
    [items],
  );

  const openDetail = (item: ContactRequest) => {
    setSelected(item);
    setSubject(`Re: Ihre Anfrage an DERM247`);
    setBody("");
    setErrors({});
  };

  const handleReply = async () => {
    if (!selected) return;
    setErrors({});
    const parsed = replySchema.safeParse({ subject, body });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0]?.toString();
        if (k && !fe[k]) fe[k] = i.message;
      });
      setErrors(fe);
      return;
    }
    setSending(true);
    try {
      const res = await api.replyToContactRequest(selected.id, parsed.data);
      toast.success("Antwort versendet");
      setSelected(res.contact);
      setBody("");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Versand fehlgeschlagen");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.deleteContactRequest(deleteId);
      toast.success("Anfrage gelöscht");
      if (selected?.id === deleteId) setSelected(null);
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Löschen fehlgeschlagen");
    }
  };

  const formatDate = (s: string) => {
    try {
      return format(new Date(s), "dd.MM.yyyy HH:mm", { locale: de });
    } catch {
      return s;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Detail-View
  if (selected) {
    return (
      <div className="container mx-auto max-w-5xl p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(null)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Liste
        </Button>

        <Card className="mb-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{selected.name}</h1>
                {selected.replied_at ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Beantwortet
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <Mail className="h-3 w-3" />
                    Neu
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {selected.email}
                </a>
                {selected.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {selected.company}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(selected.confirmed_at)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(selected.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        </Card>

        {/* Original-Nachricht */}
        <Card className="mb-4 p-6">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Ursprüngliche Anfrage
          </Label>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {selected.message}
          </div>
        </Card>

        {/* Antworten-Verlauf */}
        {selected.replies.length > 0 && (
          <div className="mb-4 space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Verlauf ({selected.replies.length})
            </Label>
            {selected.replies.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {r.admin_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.admin_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.sent_at ? formatDate(r.sent_at) : formatDate(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <MailCheck className="h-3 w-3" />
                    Gesendet
                  </Badge>
                </div>
                <p className="mb-2 text-sm font-medium">{r.subject}</p>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.body}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Antwort-Form */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Reply className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              {selected.replies.length > 0 ? "Erneut antworten" : "Antworten"}
            </h2>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Hinweis: Antworten des Kunden landen aktuell in Ihrem Mail-Postfach
              (Reply-To: <code>contact+{selected.id}@derm247.ch</code>) — automatische
              Inbox-Verarbeitung folgt in Phase 2.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                maxLength={255}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Nachricht</Label>
              <Textarea
                id="body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending}
                maxLength={10000}
                placeholder={`Guten Tag ${selected.name.split(" ")[0]},\n\nvielen Dank für Ihre Anfrage…`}
              />
              <div className="flex items-center justify-between">
                {errors.body && (
                  <p className="text-xs text-destructive">{errors.body}</p>
                )}
                <p className="ml-auto text-[10px] text-muted-foreground">
                  {body.length}/10000
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird versendet…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Antwort senden
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anfrage endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Die Anfrage und
                alle zugehörigen Antworten werden permanent entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List-View
  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Inbox className="h-6 w-6 text-primary" />
          Kontaktanfragen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bestätigte Anfragen über das Kontaktformular der Website
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">
              Alle
              <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="new">
              Neu
              {counts.new > 0 && (
                <Badge variant="destructive" className="ml-2">{counts.new}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="replied">
              Beantwortet
              <Badge variant="outline" className="ml-2">{counts.replied}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {search ? "Keine Treffer." : "Noch keine Kontaktanfragen."}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 pr-2">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => openDetail(item)}
                className="block w-full text-left transition-colors"
              >
                <Card className="p-4 hover:border-primary/40 hover:bg-accent/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                        {!item.replied_at ? (
                          <Badge variant="default" className="shrink-0 text-[10px]">
                            Neu
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Beantwortet
                          </Badge>
                        )}
                      </div>
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{item.email}</span>
                        {item.company && (
                          <span className="truncate">{item.company}</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.message}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                      {formatDate(item.confirmed_at)}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
