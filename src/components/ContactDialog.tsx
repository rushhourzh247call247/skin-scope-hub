import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Send, Loader2, MailCheck } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ContactDialogProps {
  trigger: React.ReactNode;
}

// Mindestzeit zwischen Form-Render und Submit (Bots tippen instant)
const MIN_FILL_MS = 3000;

export function ContactDialog({ trigger }: ContactDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const renderedAtRef = useRef<number>(Date.now());
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    // Honeypot — wird per CSS versteckt; echte Nutzer lassen leer
    website: "",
  });

  // Reset Timer beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      renderedAtRef.current = Date.now();
    }
  }, [open]);

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: t("contact.errors.nameRequired") })
      .max(100, { message: t("contact.errors.nameTooLong") }),
    email: z
      .string()
      .trim()
      .email({ message: t("contact.errors.emailInvalid") })
      .max(255, { message: t("contact.errors.emailTooLong") }),
    company: z
      .string()
      .trim()
      .max(150, { message: t("contact.errors.companyTooLong") })
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .trim()
      .min(10, { message: t("contact.errors.messageTooShort") })
      .max(2000, { message: t("contact.errors.messageTooLong") }),
  });

  const reset = () => {
    setForm({ name: "", email: "", company: "", message: "", website: "" });
    setErrors({});
    setSubmitted(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTimeout(reset, 250);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 1) Honeypot — wenn ausgefüllt, Bot. Stille Erfolgsmeldung (kein Hinweis).
    if (form.website.trim() !== "") {
      setSubmitted(true);
      return;
    }

    // 2) Zeit-Check — zu schnell ausgefüllt = Bot. Stille Erfolgsmeldung.
    const elapsed = Date.now() - renderedAtRef.current;
    if (elapsed < MIN_FILL_MS) {
      setSubmitted(true);
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await api.submitContactRequest({
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company || undefined,
        message: parsed.data.message,
        // Bot-Schutz-Signale auch ans Backend (Defense-in-Depth)
        website: form.website,
        elapsed_ms: elapsed,
        // Sprache für lokalisierte Bestätigungsmail
        locale: (i18n.language || "de").split("-")[0],
      });
      setSubmitted(true);
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        toast.error(t("contact.errors.rateLimited"));
      } else if (status === 422) {
        toast.error(t("contact.errors.validation"));
      } else {
        toast.error(t("contact.errors.sendFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t("contact.title")}
          </DialogTitle>
          <DialogDescription>{t("contact.subtitle")}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{t("contact.confirmTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("contact.confirmMessage")}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                {t("contact.confirmHint")}
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="mt-2">
              {t("contact.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">{t("contact.name")} *</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("contact.namePlaceholder")}
                maxLength={100}
                disabled={submitting}
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email">{t("contact.email")} *</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t("contact.emailPlaceholder")}
                maxLength={255}
                disabled={submitting}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-company">{t("contact.company")}</Label>
              <Input
                id="contact-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder={t("contact.companyPlaceholder")}
                maxLength={150}
                disabled={submitting}
                autoComplete="organization"
              />
              {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">{t("contact.message")} *</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t("contact.messagePlaceholder")}
                rows={4}
                maxLength={2000}
                disabled={submitting}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
              <p className="text-[10px] text-muted-foreground/70 text-right">
                {form.message.length}/2000
              </p>
            </div>

            {/* Honeypot — visuell + für Screenreader versteckt, für Bots sichtbar */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "auto",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <label htmlFor="contact-website">Website (do not fill)</label>
              <input
                id="contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                {t("contact.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("contact.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("contact.send")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
