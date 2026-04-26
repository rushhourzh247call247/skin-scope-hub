import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from "lucide-react";

import { api } from "@/lib/api";
import { DermLogo } from "@/components/DermLogo";
import { Button } from "@/components/ui/button";

type ConfirmState =
  | { status: "loading" }
  | { status: "confirmed" }
  | { status: "already_confirmed" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error" };

const ContactConfirm = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<ConfirmState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.confirmContactRequest(token);
        if (cancelled) return;
        const status = res.status ?? (res.success ? "confirmed" : "invalid");
        setState({ status } as ConfirmState);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 410) setState({ status: "expired" });
        else if (err?.status === 404) setState({ status: "invalid" });
        else setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const renderContent = () => {
    switch (state.status) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("contactConfirm.loading")}
            </p>
          </div>
        );
      case "confirmed":
      case "already_confirmed":
        return (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">
              {state.status === "already_confirmed"
                ? t("contactConfirm.alreadyTitle")
                : t("contactConfirm.successTitle")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {state.status === "already_confirmed"
                ? t("contactConfirm.alreadyMessage")
                : t("contactConfirm.successMessage")}
            </p>
          </div>
        );
      case "expired":
        return (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <Mail className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold">{t("contactConfirm.expiredTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("contactConfirm.expiredMessage")}
            </p>
          </div>
        );
      case "invalid":
      case "error":
      default:
        return (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">{t("contactConfirm.invalidTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("contactConfirm.invalidMessage")}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 pt-16 pb-8 sm:justify-center sm:py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex justify-center">
            <DermLogo size="md" />
          </div>
          {renderContent()}
          <div className="mt-6 flex justify-center">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {t("contactConfirm.backToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactConfirm;
