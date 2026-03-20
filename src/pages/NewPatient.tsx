import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types/patient";
import { User } from "lucide-react";

const NewPatient = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; birth_date: string; gender?: string; email?: string; phone?: string; insurance_number?: string; notes?: string }) =>
      api.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate("/patients");
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
      insurance_number: insuranceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="container max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle>Neuen Patienten anlegen</CardTitle>
          <CardDescription>Füllen Sie die Daten aus, um einen neuen Patienten zu erstellen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Gender */}
            <div className="space-y-2">
              <Label>Geschlecht</Label>
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
                    <span className="text-sm font-medium">{g === "female" ? "Weiblich" : "Männlich"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Max Mustermann" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            {/* Birth date */}
            <div className="space-y-2">
              <Label htmlFor="birthdate">Geburtsdatum *</Label>
              <Input id="birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" placeholder="patient@mail.ch" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" placeholder="+41 79 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {/* Insurance number */}
            <div className="space-y-2">
              <Label htmlFor="insurance">Versicherungsnummer</Label>
              <Input id="insurance" placeholder="756.1234.5678.97" value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Bemerkungen</Label>
              <Textarea id="notes" placeholder="Allergien, Vorerkrankungen, besondere Hinweise…" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {createMutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                Fehler beim Erstellen des Patienten.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending || !name.trim() || !birthDate}>
                {createMutation.isPending ? "Wird erstellt…" : "Patient anlegen"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/patients")}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewPatient;
