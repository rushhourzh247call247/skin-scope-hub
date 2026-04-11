import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Camera, FileDown, ClipboardList, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dateUtils";
import { Mail, Phone } from "lucide-react";
import type { FullPatient } from "@/types/patient";

type TabKey = "akte" | "spots" | "fotos" | "uebersicht" | "berichte";

interface PatientHeaderProps {
  patient: FullPatient;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  locationCount: number;
  totalImages: number;
}

export default function PatientHeader({ patient, activeTab, setActiveTab, locationCount, totalImages }: PatientHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tabs = [
    { key: "akte" as const, icon: ClipboardList, label: t('patientDetail.tabs.chart') },
    { key: "spots" as const, icon: MapPin, label: t('patientDetail.tabs.spots') },
    { key: "uebersicht" as const, icon: Eye, label: t('patientDetail.tabs.overview') },
    { key: "fotos" as const, icon: Camera, label: t('patientDetail.tabs.photos') },
    { key: "berichte" as const, icon: FileDown, label: t('patientDetail.tabs.reports') },
  ];

  return (
    <div className="border-b bg-card px-3 py-2 lg:px-4 lg:py-3">
      <div className="flex items-center gap-2 lg:gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-1 shrink-0 h-8 px-2 lg:gap-1.5 lg:h-9 lg:px-3">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t('patientDetail.backToList')}</span>
        </Button>

        <div className="h-6 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <div className="flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-primary/10 text-xs lg:text-sm font-semibold text-primary shrink-0">
            {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-foreground truncate">{patient.name}</h1>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{t('common.active')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('patientDetail.patient')}</p>
          </div>
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-6 text-xs mt-2 pl-[52px]">
        <div>
          <span className="text-muted-foreground">{t('common.id')}</span>
          <p className="font-mono font-medium text-foreground">{patient.id}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{t('common.gender')}</span>
          <p className="font-medium text-foreground">{patient.gender === "female" ? t('common.female') : t('common.male')}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{t('common.birthDate')}</span>
          <p className="font-medium text-foreground tabular-nums">
            {patient.birth_date ? formatDate(patient.birth_date, "dd.MM.yyyy") : "–"}
          </p>
        </div>
        {patient.email && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <p className="font-medium text-foreground">{patient.email}</p>
          </div>
        )}
        {patient.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <p className="font-medium text-foreground">{patient.phone}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('common.spots')}</span>
          <p className="font-medium text-foreground">{locationCount}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{t('patientDetail.recordings')}</span>
          <p className="font-medium text-foreground">{totalImages}</p>
        </div>
      </div>
    </div>
  );
}
