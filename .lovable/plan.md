
Ziel: Deinen Deploy-Fehler sauber und ohne Risiko beheben (ohne bestehende Daten/Dateien kaputtzumachen).

1) Ursache sauber einordnen
- `fatal: not a git repository` bedeutet: In `~/derm-frontend` fehlt der `.git`-Ordner.
- Die weiteren Fehler (`command not found`, `syntax error`) kamen vom Mitkopieren der Shell-Prompts (`ubuntu@...$`) in den Befehl.
- Wichtig: Ab jetzt nur den Befehlstext kopieren, nie den Prompt.

2) Sicherer Deploy-Weg (ohne bestehendes Verzeichnis anzufassen)
- Vor Deploy immer Backup von:
  - aktuellem `~/derm-frontend`