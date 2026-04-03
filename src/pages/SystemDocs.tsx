import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Server, Database, Shield, Globe, HardDrive, Lock, Network,
  FileText, Clock, RefreshCw, Monitor, Cpu, Key, Eye
} from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
  </Card>
);

const InfoRow = ({ label, value, badge }: { label: string; value: string; badge?: string }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
    <span className="font-medium text-foreground whitespace-nowrap">{label}</span>
    <span className="text-right">
      {value}
      {badge && <Badge variant="outline" className="ml-2 text-[10px]">{badge}</Badge>}
    </span>
  </div>
);

const SystemDocs = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Systemdokumentation</h1>
        <p className="text-sm text-muted-foreground">
          Technische Übersicht der Derm247-Infrastruktur — nur für Administratoren sichtbar.
        </p>
      </div>

      {/* Server & Hosting */}
      <Section icon={Server} title="Server & Hosting">
        <InfoRow label="Anbieter" value="Infomaniak (Schweiz)" />
        <InfoRow label="Produkt" value="VPS (Virtual Private Server)" />
        <InfoRow label="Betriebssystem" value="Ubuntu 24.04.3 LTS" />
        <InfoRow label="Kernel" value="6.8.0-106-generic (x86_64)" />
        <InfoRow label="IP-Adresse (IPv4)" value="83.228.246.191" />
        <InfoRow label="IP-Adresse (IPv6)" value="2001:1600:18:201::3a1" />
        <InfoRow label="Speicher" value="57 GB SSD" badge="~14% belegt" />
        <InfoRow label="RAM" value="~25% Auslastung" />
        <InfoRow label="Standort" value="Rechenzentrum Schweiz 🇨🇭" />
      </Section>

      {/* Domains & SSL */}
      <Section icon={Globe} title="Domains & SSL">
        <InfoRow label="Hauptdomain" value="derm247.ch" />
        <InfoRow label="API-Domain" value="api.derm247.ch" />
        <InfoRow label="Weiterleitungen" value="app.derm247.ch → derm247.ch" />
        <InfoRow label="www-Weiterleitung" value="www.derm247.ch → derm247.ch" />
        <InfoRow label="SSL-Zertifikat" value="Let's Encrypt (automatisch)" badge="Gültig" />
        <InfoRow label="SSL-Erneuerung" value="Automatisch via Certbot Timer" />
        <InfoRow label="Protokoll" value="HTTPS (TLS 1.2 / 1.3)" />
      </Section>

      {/* Webserver */}
      <Section icon={Monitor} title="Webserver (Nginx)">
        <InfoRow label="Software" value="Nginx 1.24.0" badge="Auto-Start" />
        <InfoRow label="Frontend" value="/var/www/app.derm247.ch/" />
        <InfoRow label="SPA-Routing" value="try_files → index.html (Fallback)" />
        <InfoRow label="MIME-Types" value=".mjs als application/javascript" />
        <InfoRow label="API-Backend" value="Reverse Proxy → PHP-FPM (Unix Socket)" />
        <InfoRow label="Max Upload" value="20 MB (client_max_body_size)" />
      </Section>

      {/* Backend / API */}
      <Section icon={Cpu} title="Backend (Laravel API)">
        <InfoRow label="Framework" value="Laravel (PHP)" />
        <InfoRow label="PHP-Version" value="8.3 (PHP-FPM)" badge="Auto-Start" />
        <InfoRow label="Verbindung" value="Unix Socket (/run/php/php8.3-fpm.sock)" />
        <InfoRow label="API-URL" value="https://api.derm247.ch" />
        <InfoRow label="Pfad auf Server" value="/home/ubuntu/derm-api/" />
        <InfoRow label="Authentifizierung" value="Laravel Sanctum (Bearer Token)" />
        <InfoRow label="2FA" value="TOTP (Google Authenticator kompatibel)" />
        <InfoRow label="CORS" value="Storage-Pfade mit Access-Control-Allow-Origin" />
      </Section>

      {/* Frontend */}
      <Section icon={Monitor} title="Frontend">
        <InfoRow label="Framework" value="React 18 + TypeScript 5" />
        <InfoRow label="Build-Tool" value="Vite 5" />
        <InfoRow label="CSS" value="Tailwind CSS v3" />
        <InfoRow label="UI-Komponenten" value="shadcn/ui (Radix UI)" />
        <InfoRow label="3D-Bodymap" value="Three.js / React Three Fiber" />
        <InfoRow label="PDF-Export" value="jsPDF + jspdf-autotable" />
        <InfoRow label="Deployment" value="GitHub → Build → rsync nach /var/www/" />
        <InfoRow label="Entwicklungsplattform" value="Lovable.dev" />
      </Section>

      {/* Datenbank */}
      <Section icon={Database} title="Datenbank">
        <InfoRow label="Engine" value="SQLite" />
        <InfoRow label="Pfad" value="/home/ubuntu/derm-api/database/database.sqlite" />
        <InfoRow label="Tabellen" value="Patienten, Befunde, Bilder, Locations, Users, Firmen" />
        <InfoRow label="Erweiterte Felder" value="3D-Koordinaten, Oberflächennormalen, Klassifikation" />
        <InfoRow label="Arzt-Zuordnung" value="user_id pro Befund" />
        <InfoRow label="Notiz-Felder" value="Bild-Notizen (note-Feld)" />
      </Section>

      {/* Dateispeicher */}
      <Section icon={HardDrive} title="Dateispeicher (Bilder)">
        <InfoRow label="Speicherort" value="Laravel Storage (geschützter Pfad)" />
        <InfoRow label="Pfad" value="/home/ubuntu/derm-api/storage/app/public/images/" />
        <InfoRow label="Zugriff" value="Über API mit Authentifizierung" />
        <InfoRow label="Bereitstellung" value="Absolute URLs via API" />
        <InfoRow label="Max. Upload-Grösse" value="20 MB" />
      </Section>

      {/* Sicherheit */}
      <Section icon={Shield} title="Sicherheit & Datenschutz">
        <InfoRow label="Firewall" value="UFW aktiv" badge="Aktiv" />
        <InfoRow label="Offene Ports" value="22 (SSH), 80 (HTTP), 443 (HTTPS)" />
        <InfoRow label="Authentifizierung" value="Bearer Token (Sanctum) + 2FA (TOTP)" />
        <InfoRow label="Session-Speicher" value="sessionStorage (kein localStorage für Tokens)" />
        <InfoRow label="Auto-Logout" value="Bei 401-Fehler automatische Weiterleitung" />
        <InfoRow label="Rollensystem" value="RBAC (admin / user)" />
        <InfoRow label="Datenspeicherung" value="Ausschliesslich auf dem Server in der Schweiz 🇨🇭" />
        <InfoRow label="Keine Drittanbieter" value="Keine Cloud-Dienste, keine externe Verarbeitung" />
        <InfoRow label="Patientendaten" value="Werden nie im Browser persistent gespeichert" />
        <InfoRow label="Verschlüsselung" value="TLS 1.2/1.3 für alle Verbindungen" />
      </Section>

      {/* Backup */}
      <Section icon={RefreshCw} title="Backup-System">
        <InfoRow label="Backup-Verzeichnis" value="~/backups/" />
        <InfoRow label="DB-Backup" value="Täglich um 02:00 Uhr (Cron)" />
        <InfoRow label="DB-Aufbewahrung" value="30 Tage" />
        <InfoRow label="Bild-Backup" value="Wöchentlich (Sonntag 03:00 Uhr)" />
        <InfoRow label="Bild-Aufbewahrung" value="60 Tage" />
        <InfoRow label="Snapshots" value="Tägliches Snapshot-Skript (03:00 Uhr)" />
        <InfoRow label="Backup-Format" value="SQLite-Kopie / tar.gz Archiv" />
      </Section>

      {/* Auto-Start Dienste */}
      <Section icon={Clock} title="Auto-Start nach Reboot">
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Nginx (Webserver)", status: true },
            { name: "PHP 8.3 FPM (API)", status: true },
            { name: "Cron (Backups)", status: true },
            { name: "Certbot (SSL)", status: true },
            { name: "UFW Firewall", status: true },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
              <div className={`h-2 w-2 rounded-full ${s.status ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-foreground text-xs font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Deployment */}
      <Section icon={FileText} title="Deployment-Workflow">
        <div className="space-y-2">
          <p className="text-foreground font-medium text-xs uppercase tracking-wider">Frontend-Deployment:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Code wird auf Lovable.dev entwickelt</li>
            <li>Automatischer Export nach GitHub (Repository: skin-scope-hub)</li>
            <li>Server bezieht Code via GitHub API → <code className="text-xs bg-muted px-1 rounded">~/derm-frontend</code></li>
            <li>Build mit <code className="text-xs bg-muted px-1 rounded">npm run build</code></li>
            <li>Sync mit <code className="text-xs bg-muted px-1 rounded">rsync -a --delete</code> nach <code className="text-xs bg-muted px-1 rounded">/var/www/app.derm247.ch/</code></li>
          </ol>
          <Separator className="my-3" />
          <p className="text-foreground font-medium text-xs uppercase tracking-wider">Backend (API):</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Laravel-Code liegt in <code className="text-xs bg-muted px-1 rounded">/home/ubuntu/derm-api/</code></li>
            <li>Schema-Updates nur mit <code className="text-xs bg-muted px-1 rounded">php artisan migrate</code></li>
            <li className="text-destructive font-medium">⚠️ Niemals <code className="text-xs bg-muted px-1 rounded">migrate:fresh</code> in Produktion!</li>
          </ol>
        </div>
      </Section>

      {/* Wichtige Hinweise */}
      <Section icon={Eye} title="Wichtige Hinweise">
        <div className="space-y-2 text-xs">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="font-medium text-foreground mb-1">🔒 Datenschutz</p>
            <p>Alle Patientendaten werden ausschliesslich auf dem dedizierten Server in der Schweiz gespeichert. Es findet keine Verarbeitung durch externe Cloud-Dienste statt. Die Anwendung erfüllt die Anforderungen des Schweizer Datenschutzgesetzes (DSG).</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-medium text-foreground mb-1">⚡ Portabilität</p>
            <p>Das System ist plattformunabhängig aufgebaut. Alle API-URLs sind zentral konfiguriert, um einen Export und Betrieb in anderen Umgebungen zu ermöglichen (kein Vendor Lock-in).</p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="font-medium text-foreground mb-1">🚨 Wartung</p>
            <p>Vor Server-Änderungen immer ein manuelles Backup erstellen. Automatische Backups laufen täglich um 02:00 Uhr. Nach einem Reboot starten alle Dienste automatisch.</p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default SystemDocs;
