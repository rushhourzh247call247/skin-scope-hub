import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const NewPatient = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; birth_date: string }) => mockApi.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate("/patients");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;
    createMutation.mutate({ name: name.trim(), birth_date: birthDate });
  };

  return (
    <div className="container max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle>Neuen Patienten anlegen</CardTitle>
          <CardDescription>Füllen Sie die Daten aus, um einen neuen Patienten zu erstellen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Max Mustermann" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Geburtsdatum</Label>
              <Input id="birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>
            {createMutation.isError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                Fehler beim Erstellen des Patienten.
              </div>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={createMutation.isPending || !name.trim() || !birthDate}>
                {createMutation.isPending ? "Wird erstellt…" : "Patient anlegen"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/patients")}>Abbrechen</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewPatient;
