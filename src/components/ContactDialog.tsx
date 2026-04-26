import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react";

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

export function ContactDialog({ trigger }: ContactDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

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
    setForm({ name: "", email: "", company: "", message: "" });
    setErrors({});
    setSubmitted(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset shortly after close so the user doesn't see the form flash back
      setTimeout(reset, 250);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
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
      });
      setSubmitted(true);
      toast.success(t("contact.successTitle"));
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
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{t("contact.successTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("contact.successMessage")}</p>
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
