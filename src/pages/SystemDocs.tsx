import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('systemDocs.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('systemDocs.subtitle')}</p>
      </div>

      <Section icon={Server} title={t('systemDocs.serverHosting')}>
        <InfoRow label={t('systemDocs.provider')} value={t('systemDocs.providerVal')} />
        <InfoRow label={t('systemDocs.product')} value={t('systemDocs.productVal')} />
        <InfoRow label={t('systemDocs.os')} value="Ubuntu 24.04.3 LTS" />
        <InfoRow label={t('systemDocs.kernel')} value="6.8.0-106-generic (x86_64)" />
        <InfoRow label={t('systemDocs.ipv4')} value="83.228.246.191" />
        <InfoRow label={t('systemDocs.ipv6')} value="2001:1600:18:201::3a1" />
        <InfoRow label={t('systemDocs.storage')} value="57 GB SSD" badge={t('systemDocs.storageUsed')} />
        <InfoRow label={t('systemDocs.ram')} value={t('systemDocs.ramUsage')} />
        <InfoRow label={t('systemDocs.location')} value={t('systemDocs.locationVal')} />
      </Section>

      <Section icon={Globe} title={t('systemDocs.domainsSsl')}>
        <InfoRow label={t('systemDocs.mainDomain')} value="derm247.ch" />
        <InfoRow label={t('systemDocs.apiDomain')} value="api.derm247.ch" />
        <InfoRow label={t('systemDocs.redirects')} value="app.derm247.ch → derm247.ch" />
        <InfoRow label={t('systemDocs.wwwRedirect')} value="www.derm247.ch → derm247.ch" />
        <InfoRow label={t('systemDocs.sslCert')} value={t('systemDocs.sslCertVal')} badge={t('systemDocs.valid')} />
        <InfoRow label={t('systemDocs.sslRenewal')} value={t('systemDocs.sslRenewalVal')} />
        <InfoRow label={t('systemDocs.protocol')} value={t('systemDocs.protocolVal')} />
      </Section>

      <Section icon={Monitor} title={t('systemDocs.webserver')}>
        <InfoRow label={t('systemDocs.software')} value="Nginx 1.24.0" badge={t('systemDocs.autoStartLabel')} />
        <InfoRow label={t('systemDocs.frontend')} value="/var/www/app.derm247.ch/" />
        <InfoRow label={t('systemDocs.spaRouting')} value={t('systemDocs.spaRoutingVal')} />
        <InfoRow label={t('systemDocs.mimeTypes')} value={t('systemDocs.mimeTypesVal')} />
        <InfoRow label={t('systemDocs.apiBackend')} value={t('systemDocs.apiBackendVal')} />
        <InfoRow label={t('systemDocs.maxUpload')} value={t('systemDocs.maxUploadVal')} />
      </Section>

      <Section icon={Cpu} title={t('systemDocs.backendApi')}>
        <InfoRow label={t('systemDocs.framework')} value="Laravel (PHP)" />
        <InfoRow label={t('systemDocs.phpVersion')} value="8.3 (PHP-FPM)" badge={t('systemDocs.autoStartLabel')} />
        <InfoRow label={t('systemDocs.connection')} value="Unix Socket (/run/php/php8.3-fpm.sock)" />
        <InfoRow label={t('systemDocs.apiUrl')} value="https://api.derm247.ch" />
        <InfoRow label={t('systemDocs.serverPath')} value="/home/ubuntu/derm-api/" />
        <InfoRow label={t('systemDocs.authentication')} value={t('systemDocs.authVal')} />
        <InfoRow label={t('systemDocs.twoFa')} value={t('systemDocs.twoFaVal')} />
        <InfoRow label={t('systemDocs.cors')} value={t('systemDocs.corsVal')} />
      </Section>

      <Section icon={Monitor} title={t('systemDocs.frontendSection')}>
        <InfoRow label={t('systemDocs.framework')} value="React 18 + TypeScript 5" />
        <InfoRow label={t('systemDocs.buildTool')} value="Vite 5" />
        <InfoRow label={t('systemDocs.css')} value="Tailwind CSS v3" />
        <InfoRow label={t('systemDocs.uiComponents')} value="shadcn/ui (Radix UI)" />
        <InfoRow label={t('systemDocs.bodymap3d')} value="Three.js / React Three Fiber" />
        <InfoRow label={t('systemDocs.pdfExport')} value="jsPDF + jspdf-autotable" />
        <InfoRow label={t('systemDocs.deployment')} value="GitHub → Build → rsync nach /var/www/" />
        <InfoRow label={t('systemDocs.devPlatform')} value="Lovable.dev" />
      </Section>

      <Section icon={Database} title={t('systemDocs.database')}>
        <InfoRow label={t('systemDocs.engine')} value="SQLite" />
        <InfoRow label={t('systemDocs.dbPath')} value="/home/ubuntu/derm-api/database/database.sqlite" />
        <InfoRow label={t('systemDocs.tables')} value={t('systemDocs.tablesVal')} />
        <InfoRow label={t('systemDocs.extendedFields')} value={t('systemDocs.extFieldsVal')} />
        <InfoRow label={t('systemDocs.doctorAssign')} value={t('systemDocs.doctorAssignVal')} />
        <InfoRow label={t('systemDocs.noteFields')} value={t('systemDocs.noteFieldsVal')} />
      </Section>

      <Section icon={HardDrive} title={t('systemDocs.fileStorage')}>
        <InfoRow label={t('systemDocs.storageLocation')} value={t('systemDocs.storageLocVal')} />
        <InfoRow label={t('systemDocs.dbPath')} value="/home/ubuntu/derm-api/storage/app/public/images/" />
        <InfoRow label={t('systemDocs.access')} value={t('systemDocs.accessVal')} />
        <InfoRow label={t('systemDocs.delivery')} value={t('systemDocs.deliveryVal')} />
        <InfoRow label={t('systemDocs.maxUploadSize')} value="20 MB" />
      </Section>

      <Section icon={Shield} title={t('systemDocs.security')}>
        <InfoRow label={t('systemDocs.firewall')} value={t('systemDocs.firewallVal')} badge={t('common.active')} />
        <InfoRow label={t('systemDocs.openPorts')} value={t('systemDocs.openPortsVal')} />
        <InfoRow label={t('systemDocs.authMethod')} value={t('systemDocs.authMethodVal')} />
        <InfoRow label={t('systemDocs.sessionStorage')} value={t('systemDocs.sessionVal')} />
        <InfoRow label={t('systemDocs.autoLogout')} value={t('systemDocs.autoLogoutVal')} />
        <InfoRow label={t('systemDocs.roleSystem')} value={t('systemDocs.roleVal')} />
        <InfoRow label={t('systemDocs.dataStorage')} value={t('systemDocs.dataStorageVal')} />
        <InfoRow label={t('systemDocs.noThirdParty')} value={t('systemDocs.noThirdPartyVal')} />
        <InfoRow label={t('systemDocs.patientData')} value={t('systemDocs.patientDataVal')} />
        <InfoRow label={t('systemDocs.encryption')} value={t('systemDocs.encryptionVal')} />
      </Section>

      <Section icon={RefreshCw} title={t('systemDocs.backup')}>
        <InfoRow label={t('systemDocs.backupDir')} value="~/backups/" />
        <InfoRow label={t('systemDocs.dbBackup')} value={t('systemDocs.dbBackupVal')} />
        <InfoRow label={t('systemDocs.dbRetention')} value={t('systemDocs.dbRetentionVal')} />
        <InfoRow label={t('systemDocs.imgBackup')} value={t('systemDocs.imgBackupVal')} />
        <InfoRow label={t('systemDocs.imgRetention')} value={t('systemDocs.imgRetentionVal')} />
        <InfoRow label={t('systemDocs.snapshots')} value={t('systemDocs.snapshotsVal')} />
        <InfoRow label={t('systemDocs.backupFormat')} value={t('systemDocs.backupFormatVal')} />
      </Section>

      <Section icon={Clock} title={t('systemDocs.autoStart')}>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Nginx (Webserver)",
            "PHP 8.3 FPM (API)",
            "Cron (Backups)",
            "Certbot (SSL)",
            "UFW Firewall",
          ].map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-foreground text-xs font-medium">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={FileText} title={t('systemDocs.deployWorkflow')}>
        <div className="space-y-2">
          <p className="text-foreground font-medium text-xs uppercase tracking-wider">{t('systemDocs.frontendDeploy')}</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>{t('systemDocs.deployStep1')}</li>
            <li>{t('systemDocs.deployStep2')}</li>
            <li>{t('systemDocs.deployStep3')} — <code className="text-xs bg-muted px-1 rounded">~/derm-frontend</code></li>
            <li>{t('systemDocs.deployStep4')} — <code className="text-xs bg-muted px-1 rounded">npm run build</code></li>
            <li>{t('systemDocs.deployStep5')} — <code className="text-xs bg-muted px-1 rounded">rsync -a --delete</code></li>
          </ol>
          <Separator className="my-3" />
          <p className="text-foreground font-medium text-xs uppercase tracking-wider">{t('systemDocs.backendLabel')}</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>{t('systemDocs.backendStep1')}</li>
            <li>{t('systemDocs.backendStep2')} — <code className="text-xs bg-muted px-1 rounded">php artisan migrate</code></li>
            <li className="text-destructive font-medium">{t('systemDocs.backendStep3')}</li>
          </ol>
        </div>
      </Section>

      <Section icon={Eye} title={t('systemDocs.importantNotes')}>
        <div className="space-y-2 text-xs">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="font-medium text-foreground mb-1">{t('systemDocs.privacyTitle')}</p>
            <p>{t('systemDocs.privacyText')}</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-medium text-foreground mb-1">{t('systemDocs.portabilityTitle')}</p>
            <p>{t('systemDocs.portabilityText')}</p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="font-medium text-foreground mb-1">{t('systemDocs.maintenanceTitle')}</p>
            <p>{t('systemDocs.maintenanceText')}</p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default SystemDocs;
