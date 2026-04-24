import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types/patient";
import { User, Lock } from "lucide-react";
import { useLifecycle } from "@/hooks/use-lifecycle";

const NewPatient = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isReadOnly, readOnlyTooltip } = useLifecycle();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; birth_date: string; gender?: string; email?: string; phone?: string; insurance_number?: string; patient_number?: string; notes?: string }) =>
      api.createPatient(data),
    onSuccess: (createdPatient: any) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const patientId = createdPatient?.id ?? createdPatient?.patient?.id ?? createdPatient?.data?.id;
      if (patientId) {
        navigate(`/patient/${patientId}`);
      } else {
        navigate("/patients");
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (err?.status === 422 && msg.toLowerCase().includes("patient_number")) {
        toast.error(t("newPatient.duplicateNumber"));
      } else {
        toast.error(t("newPatient.createError"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;
    createMutation.mutate({
      name: name.trim(),
      birth_date: birthDate,
      gender,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      patient_number: patientNumber.trim() || undefined,
      insurance_number: insuranceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="container max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("newPatient.title")}</CardTitle>
          <CardDescription>{t("newPatient.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isReadOnly && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{readOnlyTooltip}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>{t("common.gender")}</Label>
              <div className="flex gap-3">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 p-4 transition-all",
                      gender === g
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <User className="h-8 w-8" />
                    <span className="text-sm font-medium">{g === "female" ? t("common.female") : t("common.male")}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("common.name")} *</Label>
              <Input id="name" placeholder={t("newPatient.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">{t("common.birthDate")} *</Label>
              <Input id="birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input id="email" type="email" placeholder={t("newPatient.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("common.phone")}</Label>
                <Input id="phone" type="tel" placeholder={t("newPatient.phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientNumber">{t("newPatient.patientNumber")}</Label>
                <Input id="patientNumber" placeholder={t("newPatient.patientNumberPlaceholder")} value={patientNumber} onChange={(e) => setPatientNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance">{t("newPatient.insuranceNumber")}</Label>
                <Input id="insurance" placeholder={t("newPatient.insurancePlaceholder")} value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Textarea id="notes" placeholder={t("newPatient.notesPlaceholder")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {createMutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {t("newPatient.createError")}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isReadOnly || createMutation.isPending || !name.trim() || !birthDate} title={isReadOnly ? readOnlyTooltip : undefined}>
                {createMutation.isPending ? t("common.creating") : t("newPatient.submit")}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/patients")}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewPatient;
