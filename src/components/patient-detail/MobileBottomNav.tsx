import { useTranslation } from "react-i18next";
import { MapPin, Camera, FileDown, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "akte" | "spots" | "fotos" | "uebersicht" | "berichte";

interface MobileBottomNavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const { t } = useTranslation();

  const tabs = [
    { key: "akte" as const, icon: ClipboardList, label: t('patientDetail.bottomNav.chart') },
    { key: "spots" as const, icon: MapPin, label: t('patientDetail.bottomNav.spots') },
    { key: "fotos" as const, icon: Camera, label: t('patientDetail.bottomNav.photos') },
    { key: "berichte" as const, icon: FileDown, label: t('patientDetail.bottomNav.reports') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all min-w-[60px]",
              activeTab === tab.key ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className={cn("h-5 w-5", activeTab === tab.key && "text-primary")} />
            <span className={cn("text-[10px] font-medium", activeTab === tab.key && "font-semibold")}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
