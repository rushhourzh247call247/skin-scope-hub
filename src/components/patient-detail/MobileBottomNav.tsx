import { useTranslation } from "react-i18next";
import { MapPin, Camera, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type TabKey = "akte" | "spots" | "fotos" | "uebersicht";

interface MobileBottomNavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPma = user?.role === "pma";

  const allTabs = [
    { key: "akte" as const, icon: ClipboardList, label: t('patientDetail.bottomNav.chart') },
    { key: "spots" as const, icon: MapPin, label: t('patientDetail.bottomNav.spots') },
    { key: "fotos" as const, icon: Camera, label: t('patientDetail.bottomNav.photos') },
  ];
  const tabs = isPma ? allTabs.filter(t => t.key === "spots" || t.key === "fotos") : allTabs;

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
