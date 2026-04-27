## Ziel

Kompletter Mail-Workflow für DERM247 über die bereits eingerichtete Resend-Infrastruktur (Proto: `noreply@derm247.ch`):

1. **Kontaktformulare** im Admin-Panel sichtbar + bidirektionale Kommunikation (Kunde antwortet per Mail → landet im Verlauf)
2. **Support-Tickets**: Bei neuem Ticket → Mail an `info@techassist.ch` (Admin-Benachrichtigung)
3. **Finanz-Mails**: Rechnungen + Mahnungen direkt aus dem Finanz-Modul an Mandanten (Mailadresse aus Mandant-Stammdaten)

---

## Phase 1 — Backend-Fundament (Laravel auf Proto)

### 1.1 Mail-Service (`app/Services/MailService.php`)
Zentrale Klasse für alle ausgehenden Mails:
- `sendToCustomer(toEmail, subject, body, replyToken)` — Mail mit eingebettetem Reply-Token
- `sendToAdmin(toEmail, subject, body)` — Interne Benachrichtigungen
- `sendInvoice(invoice)` — Rechnungs-PDF als Anhang
- `sendDunning(invoice, stage)` — Mahnung (3-stufig, passt zu bestehendem Dunning-System)

### 1.2 Inbound-Mail-Handling (Reply-Empfang)
Resend bietet **Inbound-Webhooks** (über Resend → Webhook an unseren Server).
- Neue Tabelle `email_threads` (id, subject, customer_email, ticket_id?, contact_id?, last_activity)
- Neue Tabelle `email_messages` (thread_id, direction enum [outbound/inbound], body, attachments, created_at, sender_user_id?)
- Reply-Token: Jede ausgehende Mail bekommt eine eindeutige Reply-Adresse wie `reply+<token>@derm247.ch` (Plus-Addressing) — Resend leitet eingehende Mails an unseren Webhook → Backend matcht Token → Message landet im richtigen Thread

### 1.3 Migrations
- `email_threads`, `email_messages`
- Erweiterung `support_tickets`: optionale `email_thread_id`-Spalte
- Erweiterung `contacts` (oder neue Tabelle, falls noch nicht existent)

---

## Phase 2 — Kontaktformular-Modul

### 2.1 Public-Frontend (Login-Seite oder neue `/contact`-Page)
- Formular: Name, E-Mail, Firma (opt.), Nachricht
- POST `/api/contact` → erstellt `contacts`-Eintrag + sendet Bestätigungs-Mail an Kunde + Benachrichtigung an `info@techassist.ch`

### 2.2 Admin-Panel: Kontakt-Inbox
- Neue Route `/admin/contacts` (nur Admin-Rolle)
- Liste aller Kontaktanfragen (sortiert nach `last_activity`, ungelesene fett)
- Detail-View: Thread-Style (wie WhatsApp/Mail-Client), Antwort-Composer
- Klick "Antworten" → Mail geht raus mit Reply-Token, Kunde sieht ganz normal `noreply@derm247.ch` als Absender (intern wird `reply+token@derm247.ch` als `Reply-To` gesetzt)

---

## Phase 3 — Support-Tickets erweitern

Das Ticket-System existiert bereits (`features/support-ticket-system`). Erweiterung:
- Bei **Ticket-Erstellung durch Kunde** → automatische Mail an `info@techassist.ch` mit Ticket-Inhalt + Link zum Ticket im Admin-Panel
- Optional: Bei Admin-Antwort im Ticket → zusätzliche Mail an Kunde (mit Reply-Token, falls Antwort per Mail erwünscht)

**Frage für dich:** Sollen Kunden auch per Mail auf Tickets antworten können (wie bei Kontakten)? Oder bleiben Ticket-Antworten strikt im Portal?

---

## Phase 4 — Finanz-Modul (Rechnungen & Mahnungen)

### 4.1 Mandanten-Mailadresse
Prüfen: Hat die `companies`-Tabelle bereits ein `billing_email`-Feld? Falls nicht → Migration hinzufügen + UI im Mandanten-Edit-Dialog.

### 4.2 Versand-Buttons im Finanz-Modul
- In der Rechnungs-Detailansicht: Button **"Per E-Mail senden"** → generiert PDF (bestehende Logik) + sendet als Anhang an `billing_email` der Firma
- Bei Mahnungen (3-stufiges Dunning, bereits via Cron): aktuell wird nur der Status gesetzt. Erweiterung:
  - Stufe 1: Höfliche Erinnerung
  - Stufe 2: Mahnung mit Mahngebühr-Hinweis
  - Stufe 3: Letzte Mahnung + Sperrandrohung
- Mail-Templates für jede Stufe (mehrsprachig DE/EN/FR/IT/ES — passend zu `pdf-document-localization`)

### 4.3 Audit-Log
Jede gesendete Finanz-Mail wird in `email_messages` protokolliert (welcher Admin, welche Rechnung, wann)

---

## Phase 5 — Frontend-UI (React)

### Neue Komponenten
- `src/pages/admin/ContactInbox.tsx` — Liste + Threads
- `src/components/admin/EmailThreadView.tsx` — Wiederverwendbar für Kontakte UND Tickets
- `src/components/admin/ReplyComposer.tsx` — Rich-Text-Editor (oder einfaches Textarea)
- Erweiterung `src/pages/admin/Finance.tsx`: "Per Mail senden"-Buttons + Status-Badge "Versendet am..."

### Navigation
- Admin-Sidebar: Neuer Punkt "📧 Kontakte" mit Badge für ungelesene
- Finanz-Sidebar: Bereits vorhanden, nur erweitert

---

## Technische Details (für Devs)

### Resend Inbound Setup (manuell durch Inhaber)
1. Bei Resend → Webhooks → "Add Webhook" → URL: `https://dev.derm247.ch/api/webhooks/resend-inbound`
2. Event: `email.received` aktivieren
3. MX-Record für `reply.derm247.ch` auf Resend setzen (separate Subdomain für Inbound, kollidiert nicht mit `send.derm247.ch`)

### Reply-Token-Schema
```
reply+<base64url(thread_id:hmac)>@derm247.ch
```
HMAC verhindert, dass beliebige IDs untergeschoben werden.

### Sicherheit
- Webhook-Endpoint mit Resend-Signatur-Verifizierung (HMAC SHA256)
- Inbound-Mails werden auf Spam/Loops geprüft (Mail-Loop-Schutz: max. 50 Replies pro Thread)
- Anhänge max. 10 MB, in `storage/app/email-attachments/`

### Bestehende Memory-Regeln berücksichtigt
- Multi-Tenancy: Kontakte/Threads gehören zur Company (NULL bei Public-Kontaktformular → "techassist" als Default)
- `i18n-support`: Mail-Templates in DE/EN/FR/IT/ES
- `pdf-document-localization`: Sprache der Rechnungs-Mail folgt Sprache der PDF
- `support-ticket-system`: Bestehende Polling-Logik bleibt, nur Mail-Notification on-create dazu

---

## Vorgeschlagene Reihenfolge

1. **Sprint A** (heute/morgen): Phase 1 (Backend-Fundament) + Phase 3 (Ticket-Mail an info@techassist.ch) — schnellster Win, du wirst sofort über neue Tickets informiert
2. **Sprint B**: Phase 4 (Finanz-Mails) — direkter Geschäftsnutzen
3. **Sprint C**: Phase 2 (Kontaktformular bidirektional) — komplexester Teil wegen Inbound-Webhook

---

## Offene Fragen an dich

1. **Reply-Subdomain**: OK mit `reply.derm247.ch` für Inbound, oder lieber alles über `derm247.ch` direkt? (Letzteres geht nur, wenn der Hauptdomain-MX auch zu Resend zeigt — könnte dein bestehendes Hostpoint-Mail brechen)
2. **Tickets per Mail beantworten**: Sollen Kunden auch auf Ticket-Mails per Mail antworten können, oder strikt im Portal?
3. **Kontaktformular-Standort**: Eigene `/contact`-Seite, oder direkt auf der Login-Seite als Modal?
4. **Mahnungs-Sprache**: Sprache des Mandanten oder fix Deutsch?
