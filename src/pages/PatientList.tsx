import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const PatientList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ["patients"],
    queryFn: api.getPatients,
  });

  const filtered = patients.filter((p: Patient) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Patienten
        </h2>
        <p className="text-sm text-muted-foreground">
          {patients.length} Patienten registriert
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Patient suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Fehler beim Laden der Patienten.
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> ID
                  </div>
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Geburtsdatum
                  </div>
                </th>
                <th className="px-4 py-3">Letzter Arzt</th>
                <th className="px-4 py-3">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "Keine Patienten gefunden." : "Noch keine Patienten vorhanden."}
                  </td>
                </tr>
              ) : (
                filtered.map((patient: Patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">#{patient.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
                          {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {patient.birth_date ? format(new Date(patient.birth_date), "dd. MMM yyyy", { locale: de }) : "–"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {patient.created_at ? format(new Date(patient.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientList;
