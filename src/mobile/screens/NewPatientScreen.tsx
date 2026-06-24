import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { tapHaptic } from "../native/haptics";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Gender = "female" | "male";

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-base text-foreground/80">{label}</label>
      {children}
    </div>
  );
}

function TextField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { suffix?: React.ReactNode },
) {
  const { className, suffix, ...rest } = props;
  return (
    <div className="relative">
      <input
        {...rest}
        className={cn(
          "w-full rounded-2xl bg-secondary/60 px-4 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground/70",
          suffix && "pr-12",
          className,
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}
function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-secondary/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-4 text-left text-base active:opacity-80"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  );
}

export function NewPatientScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const composedName = [firstName, middleName, lastName]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");

  const canSubmit = composedName.length > 0 && !!birthDate;

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      birth_date: string;
      gender?: string;
      email?: string;
      phone?: string;
      insurance_number?: string;
      patient_number?: string;
      notes?: string;
    }) => api.createPatient(data),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const id = created?.id ?? created?.patient?.id ?? created?.data?.id;
      if (id) navigate(`/m/patients/${id}`);
      else navigate("/m/patients");
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (err?.status === 422 && msg.toLowerCase().includes("patient_number")) {
        toast.error("Patientennummer bereits vergeben.");
      } else if (err?.status === 403) {
        toast.error("Keine Berechtigung oder Lizenzlimit erreicht.");
      } else if (err?.status === 423) {
        toast.error("Account im Read-Only-Modus.");
      } else {
        toast.error(`Anlegen fehlgeschlagen (${err?.status ?? "?"}: ${msg || "unbekannt"})`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    tapHaptic();
    createMutation.mutate({
      name: composedName,
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
    <form onSubmit={handleSubmit} className="flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden">
      <MobileHeader
        to="/m/patients"
        largeTitle={
          <h1 className="text-3xl font-bold leading-tight">
            Neuen Patienten
            <br />
            hinzufügen
          </h1>
        }
      />

      <main className="flex-1 space-y-5 px-5 pb-40 pt-2">
        <Field label="Geschlecht">
          <div className="flex gap-3">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={cn(
                  "flex-1 rounded-2xl border-2 px-4 py-3 text-base transition-colors",
                  gender === g
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent bg-secondary/60 text-foreground/80",
                )}
              >
                {g === "female" ? "Weiblich" : "Männlich"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Vorname">
          <TextField
            placeholder="Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </Field>

        <Field label="2. Vorname">
          <TextField
            placeholder="2. Vorname"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </Field>

        <Field label="Nachname">
          <TextField
            placeholder="Nachname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </Field>

        <Field label="Geburtsdatum">
          <TextField
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            suffix={<CalendarIcon className="h-5 w-5" />}
          />
        </Field>

        <Section title="Kontaktinformationen">
          <Field label="E-Mail">
            <TextField
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Telefon">
            <TextField
              type="tel"
              placeholder="+41 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Medizinische Informationen">
          <Field label="Patientennummer">
            <TextField
              placeholder="Optional"
              value={patientNumber}
              onChange={(e) => setPatientNumber(e.target.value)}
            />
          </Field>
          <Field label="Versicherungsnummer">
            <TextField
              placeholder="Optional"
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
            />
          </Field>
          <Field label="Notizen">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anmerkungen…"
              className="w-full resize-none rounded-2xl bg-background/60 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </Field>
        </Section>

      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border/40 bg-background/95 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <button
          type="submit"
          disabled={!canSubmit || createMutation.isPending}
          className={cn(
            "w-full rounded-2xl px-4 py-4 text-base font-medium transition-opacity",
            "bg-primary text-primary-foreground",
            (!canSubmit || createMutation.isPending) && "opacity-60",
          )}
        >
          {createMutation.isPending ? "Wird angelegt…" : "Neuen Patienten hinzufügen"}
        </button>
      </div>
    </form>
  );
}

export default NewPatientScreen;
