/**
 * Translations for PDF content (brochure + contract).
 * Supported: de, en, fr, it, es
 *
 * Updated April 2026 to comply with new licensing/terms briefing:
 *  - Strict per-tenant license usage
 *  - 30-day read-only access after contract end + optional CHF 50 archive
 *  - Payment due within 10 days, dunning fee + suspension
 *  - Liability capped at 3 monthly fees, gross negligence/intent only
 *  - Explicit "not a medical device" disclaimer
 *  - Software ownership / no reverse engineering / no resale
 */

export type PdfLang = "de" | "en" | "fr" | "it" | "es";

interface PackageTexts {
  individual: { label: string; desc: string };
  pack5: { label: string; desc: string };
  medium: { label: string; desc: string };
  unlimited: { label: string; desc: string };
}

interface PdfTexts {
  packages: PackageTexts;
  // ── Brochure header ──
  headerSubtitle: string;
  headerTrust: string;

  // ── Brochure page 1 ──
  benefitsTitle: string;
  benefits: string[];
  audienceTitle: string;
  audiences: string[];
  whyTitle: string;
  reasons: string[];
  packagesTitle: string;
  popularBadge: string;
  perDoctor: string;
  perMonth: string;
  fineprint: string[];
  nonBinding: string;

  // ── Brochure page 2 ──
  featuresTitle: string;
  features: string[];
  inDevelopment: string;
  aiFeatureTitle: string;
  aiFeatureDesc: string;
  securityTitle: string;
  securityItems: string[];

  // NEW: legal notice (brochure)
  legalNoticeTitle: string;
  legalNoticeBullets: string[];

  contactTitle: string;
  contactLine1: string;
  contactLine2: string;
  contactLine3: string;

  // ── Brochure footer ──
  footerLine: string;
  pageOf: (page: number, total: number) => string;

  // ── Contract ──
  contractTitle: string;
  contractLabel: string;
  contractNumberLabel: string;
  between: string;
  licensor: string;
  licensee: string;

  // §1 Vertragsgegenstand & Lizenz nur innerhalb der Firma
  section1Title: string;
  section1Text: string;

  // §2 Lizenzumfang (User-Limit hart pro Paket)
  section2Title: string;
  packageLabel: string;
  doctorCountLabel: string;
  monthlyFeeLabel: string;
  section2LimitText: string;

  // §3 Laufzeit + Kündigung + 30-Tage Read-Only + Archiv
  section3Title: string;
  section3Text1: (startDate: string) => string;
  section3Text2: string;
  section3PostTitle: string;
  section3PostBullets: string[];

  // §4 Zahlungsbedingungen (10 Tage)
  section4Title: string;
  section4Text: string;
  bankDetails: string;
  iban: string;
  recipient: string;

  // §5 Datenschutz (unverändert)
  section5Title: string;
  section5Text1: string;
  section5Text2: string;
  section5Text3: string;

  // §6 Betrieb, Gewährleistung, Haftung (max. 3 Monatsgeb.)
  section6Title: string;
  section6Text1: string;
  section6OperationsText: string;
  section6LiabilityCap: string;
  section6NoLiability: string;
  section6Bullets: string[];
  section6Support: string;

  // §7 Medizinischer Hinweis (NEU)
  section7Title: string;
  section7Text: string;
  section7Bullets: string[];

  // §8 Eigentum, Nutzung, Reverse Engineering (NEU)
  section8Title: string;
  section8Text: string;
  section8Bullets: string[];

  // §9 Geheimhaltung (vorher §7)
  section9Title: string;
  section9Text: string;

  // §10 Schlussbestimmungen (vorher §8)
  section10Title: string;
  section10Text: string;

  // Signature
  placeDateLabel: string;
  licensorLabel: string;
  licenseeLabel: string;
  signatureLabel: string;

  // Contract footer
  contractFooter: string;

  // MwSt
  exclVat: string;
}

const de: PdfTexts = {
  packages: {
    individual: { label: "Einzellizenz", desc: "1–4 Ärzte, je CHF 80.–/Mt." },
    pack5: { label: "5er-Paket", desc: "5 Ärzte, Festpreis" },
    medium: { label: "6–10 Ärzte", desc: "bis 10 Ärzte, Festpreis" },
    unlimited: { label: "Unbegrenzt", desc: "unbegrenzt, Festpreis" },
  },
  headerSubtitle: "Digitale Hautdokumentation für moderne Praxen",
  headerTrust: "Schweizer Hosting  •  DSG konform  •  Für medizinische Praxen entwickelt",

  benefitsTitle: "Ihr Nutzen",
  benefits: [
    "Schnellere Diagnosen durch digitale Verlaufsdokumentation",
    "Klare Verlaufskontrolle mit Bildvergleich",
    "Weniger administrativer Aufwand",
    "Sichere Speicherung ausschliesslich in der Schweiz",
  ],
  audienceTitle: "Für wen?",
  audiences: ["Dermatologen", "Hausärzte mit Hautsprechstunde", "Gemeinschaftspraxen", "Kliniken"],
  whyTitle: "Warum DERM247?",
  reasons: [
    "Schweizer Hosting (Infomaniak) – keine Daten im Ausland",
    "QR-basierter Foto-Upload direkt vom Smartphone",
    "Interaktive 3D-Body-Map zur Lokalisierung",
    "Zeitlicher Bildvergleich mit Overlay-Slider",
    "PDF-Berichte für Patienten & Zuweiser",
  ],
  packagesTitle: "Pakete & Preise",
  popularBadge: "BELIEBT",
  perDoctor: "/Arzt",
  perMonth: "pro Monat",
  fineprint: [
    "Mindestlaufzeit: 12 Monate  |  Kündigungsfrist: 60 Tage  |  Zahlungsfrist: 10 Tage netto",
    "Preise pro Arzt (Benutzer)  |  Nutzung nur innerhalb einer Firma  |  Faire Speichernutzung",
  ],
  nonBinding: "Unverbindliches Angebot – Änderungen vorbehalten",

  featuresTitle: "Enthaltene Funktionen (alle Pakete)",
  features: [
    "Patientenverwaltung mit Suchfunktion",
    "Interaktive 3D-Körperkarte (Body-Map)",
    "Mobiler Foto-Upload via QR-Code",
    "ABCDE-Risikobewertung für Hautläsionen (Score 0–5)",
    "Klinischer Risiko-Verlauf mit Trend-Analyse",
    "Zeitlicher Bildvergleich (Overlay-Slider)",
    "Bildkalibrierung für konsistente Messungen",
    "PDF-Berichte für Patienten & Zuweiser",
    "Integrierter Live-Support (Ticket-System mit Echtzeit-Chat)",
    "Mehrsprachig: DE, EN, FR, IT, ES",
    "Tägliche Backups & regelmässige Snapshots",
  ],
  inDevelopment: "IN ENTWICKLUNG",
  aiFeatureTitle: "Erweiterte Analysefunktionen mit KI-Unterstützung",
  aiFeatureDesc: "Intelligente Auswertung zur Unterstützung der klinischen Entscheidungsfindung",
  securityTitle: "Datenschutz & Sicherheit",
  securityItems: [
    "Hosting ausschliesslich in der Schweiz (Infomaniak)",
    "Keine Datenweitergabe an Dritte",
    "Konform mit DSG und DSGVO",
    "Verschlüsselte Datenübertragung & Speicherung",
    "Tägliche Backups & regelmässige Snapshots",
  ],

  legalNoticeTitle: "Wichtiger rechtlicher Hinweis",
  legalNoticeBullets: [
    "DERM247 ist KEIN Medizinprodukt im Sinne der MepV / MDR.",
    "Das System dient ausschliesslich der Dokumentation und Unterstützung.",
    "Keine Diagnosefunktion – ärztliche Diagnosen verbleiben beim Anwender.",
    "Nach Vertragsende: 30 Tage Read-Only-Zugriff inkl. Export, danach Löschung oder optionales Archiv (CHF 50.–/Monat).",
  ],

  contactTitle: "Kontakt & nächste Schritte",
  contactLine1: "Gerne erstellen wir Ihnen ein individuelles Angebot oder einen Testaccount.",
  contactLine2: "Testzugang auf Anfrage verfügbar.",
  contactLine3: "E-Mail: info@techassist.ch  |  Web: derm247.ch",

  footerLine: "DERM247 | TechAssist | info@techassist.ch | derm247.ch",
  pageOf: (p, t) => `Seite ${p} von ${t}`,

  contractTitle: "DERM247 – Softwarelizenzvertrag",
  contractLabel: "LIZENZVERTRAG",
  contractNumberLabel: "Vertragsnummer",
  between: "zwischen",
  licensor: "(nachfolgend «Lizenzgeberin»)",
  licensee: "(nachfolgend «Lizenznehmer»)",

  section1Title: "1. Vertragsgegenstand",
  section1Text:
    "Die Lizenzgeberin gewährt dem Lizenznehmer das nicht-exklusive, nicht übertragbare Recht zur Nutzung der Software «DERM247» ausschliesslich innerhalb der eigenen Firma (Mandant). Eine Nutzung durch Dritte oder andere Firmen, eine Weitergabe oder Vermietung an Dritte ist ausdrücklich nicht gestattet.",

  section2Title: "2. Lizenzumfang",
  packageLabel: "Paket",
  doctorCountLabel: "Anzahl Ärzte",
  monthlyFeeLabel: "Monatliche Lizenzgebühr",
  section2LimitText:
    "Die Anzahl aktiver Benutzer ist auf den im gewählten Paket vereinbarten Umfang begrenzt. Das System verhindert technisch die Nutzung über die vereinbarte Lizenzanzahl hinaus.",

  section3Title: "3. Laufzeit, Kündigung und Datenrückgabe",
  section3Text1: (d) =>
    `Der Vertrag beginnt am ${d}. Die Mindestlaufzeit beträgt 12 Monate. Die Kündigungsfrist beträgt 60 Tage zum Vertragsende. Erfolgt keine fristgerechte Kündigung, verlängert sich der Vertrag automatisch um jeweils 12 Monate.`,
  section3Text2:
    "Ein Upgrade auf ein höheres Paket oder zusätzliche Lizenzen ist jederzeit möglich. Die neue Gebühr gilt ab dem Folgemonat. Ein Downgrade ist unter Einhaltung der laufenden Vertragsdauer möglich und wird frühestens zum Ende der aktuellen Laufzeit wirksam.",
  section3PostTitle: "Nach Vertragsende:",
  section3PostBullets: [
    "Der Lizenznehmer erhält 30 Tage Read-Only-Zugriff zur Datenansicht und zum Export.",
    "Es sind keine Uploads, Änderungen oder Neueingaben mehr möglich.",
    "Nach Ablauf der 30 Tage werden alle Daten automatisch gelöscht.",
    "Optional: Read-Only-Archiv für CHF 50.– / Monat (jederzeit kündbar).",
    "Der Lizenznehmer kann jederzeit eine vollständige und unwiderrufliche Löschung verlangen.",
  ],

  section4Title: "4. Zahlungsbedingungen",
  section4Text:
    "Die Lizenzgebühr wird monatlich im Voraus in Rechnung gestellt und ist innert 10 Tagen netto nach Rechnungsdatum zahlbar. Bei Zahlungsverzug erfolgt eine Mahnung (mit Mahngebühr). Bei weiterem Verzug behält sich die Lizenzgeberin die Sperrung des Zugangs sowie die ausserordentliche Vertragskündigung ausdrücklich vor.",
  bankDetails: "Bankverbindung:",
  iban: "IBAN: CH95 0070 0114 9053 5408 5",
  recipient: "Empfänger: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Datenschutz und Datensicherheit",
  section5Text1:
    "Die Lizenzgeberin verpflichtet sich, alle im Zusammenhang mit der Nutzung der Software anfallenden Daten gemäss dem Schweizerischen Datenschutzgesetz (DSG) und der DSGVO zu behandeln.",
  section5Text2:
    "Die Daten werden ausschliesslich auf Servern in der Schweiz (Infomaniak) gespeichert. Es werden tägliche Backups sowie regelmässige Snapshots durchgeführt. Die Daten werden nicht an Drittanbieter weitergegeben und nicht ausserhalb der Schweiz verarbeitet. Die Übertragung erfolgt vollständig verschlüsselt. Daten verschiedener Mandanten sind strikt voneinander getrennt; ein firmenübergreifender Zugriff ist technisch ausgeschlossen.",
  section5Text3:
    "Die Nutzung beinhaltet eine angemessene Datenspeicherung im üblichen Rahmen (Fair-Use). Bei aussergewöhnlich hohem Speicherbedarf kann eine individuelle Vereinbarung getroffen werden.",

  section6Title: "6. Betrieb, Gewährleistung und Haftung",
  section6Text1:
    "Die Lizenzgeberin betreibt die Software nach bestem Wissen und Gewissen mit aktuellen Sicherheitsstandards.",
  section6OperationsText:
    "Updates und Wartungsarbeiten erfolgen vorzugsweise ausserhalb der üblichen Praxiszeiten (z. B. abends oder am Wochenende). Es besteht keine Garantie auf permanente Verfügbarkeit; angestrebt wird eine hohe Verfügbarkeit im Rahmen des branchenüblichen Standards.",
  section6LiabilityCap:
    "Eine Haftung der Lizenzgeberin besteht ausschliesslich bei grober Fahrlässigkeit oder Vorsatz. Die Haftung ist in jedem Fall auf den Betrag von drei (3) Monatsgebühren des aktuellen Vertrags begrenzt.",
  section6NoLiability: "Keine Haftung besteht insbesondere für:",
  section6Bullets: [
    "Fehlbedienung durch den Kunden",
    "Ausfälle durch höhere Gewalt",
    "externe Angriffe trotz Schutzmassnahmen",
    "indirekte Schäden, Folgeschäden oder entgangenen Gewinn",
    "klinische Entscheidungen oder Diagnosen des Anwenders",
  ],
  section6Support:
    "Support erfolgt über das integrierte Ticket-System mit Echtzeit-Chat sowie per E-Mail an info@techassist.ch.",

  section7Title: "7. Medizinischer Hinweis",
  section7Text:
    "DERM247 ist ausdrücklich KEIN Medizinprodukt im Sinne der schweizerischen Medizinprodukteverordnung (MepV) oder der EU-Medizinprodukteverordnung (MDR 2017/745).",
  section7Bullets: [
    "Die Software dient ausschliesslich zur Dokumentation und Unterstützung des klinischen Workflows.",
    "Die Software stellt keine Diagnose und ersetzt keine ärztliche Untersuchung, Befundung oder Entscheidung.",
    "Sämtliche medizinischen Diagnosen, Therapieentscheidungen und Verantwortung verbleiben vollständig beim Anwender (Arzt).",
    "Risiko-Scores (z. B. ABCDE) sind reine Unterstützungswerte ohne diagnostische Bindungswirkung.",
  ],

  section8Title: "8. Eigentum und Nutzungsbeschränkungen",
  section8Text:
    "Die Software, der Quellcode, sämtliche Designs und alle damit verbundenen Rechte verbleiben uneingeschränkt im Eigentum der Lizenzgeberin (TechAssist). Dem Lizenznehmer wird ausschliesslich ein zeitlich begrenztes Nutzungsrecht im Rahmen dieses Vertrags eingeräumt.",
  section8Bullets: [
    "Keine Weitergabe, Vermietung oder Unterlizenzierung der Software an Dritte.",
    "Kein Weiterverkauf der Software oder einzelner Bestandteile.",
    "Kein Reverse Engineering, Dekompilierung oder Disassemblierung.",
    "Keine Umgehung technischer Schutzmassnahmen (Lizenz-Limits, Authentifizierung).",
  ],

  section9Title: "9. Geheimhaltung",
  section9Text:
    "Beide Parteien verpflichten sich, vertrauliche Informationen der jeweils anderen Partei geheim zu halten und nicht an Dritte weiterzugeben. Diese Verpflichtung gilt auch über das Vertragsende hinaus.",

  section10Title: "10. Schlussbestimmungen",
  section10Text:
    "Es gilt Schweizer Recht. Gerichtsstand ist Zürich. Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Dieser Vertrag wurde in zwei Exemplaren ausgefertigt und von beiden Parteien unterzeichnet.",

  placeDateLabel: "Ort, Datum",
  licensorLabel: "Lizenzgeberin",
  licenseeLabel: "Lizenznehmer",
  signatureLabel: "Unterschrift",

  contractFooter: "DERM247 – Lizenzvertrag",
  exclVat: " (exkl. MwSt.)",
};

const en: PdfTexts = {
  packages: {
    individual: { label: "Individual License", desc: "1–4 doctors, CHF 80.– each/mo." },
    pack5: { label: "5-Pack", desc: "5 doctors, fixed price" },
    medium: { label: "6–10 Doctors", desc: "up to 10 doctors, fixed price" },
    unlimited: { label: "Unlimited", desc: "unlimited, fixed price" },
  },
  headerSubtitle: "Digital skin documentation for modern practices",
  headerTrust: "Swiss Hosting  •  DSG compliant  •  Developed for medical practices",

  benefitsTitle: "Your Benefits",
  benefits: [
    "Faster diagnoses through digital progress documentation",
    "Clear follow-up with image comparison",
    "Less administrative effort",
    "Secure storage exclusively in Switzerland",
  ],
  audienceTitle: "For whom?",
  audiences: ["Dermatologists", "GPs with skin consultations", "Group practices", "Clinics"],
  whyTitle: "Why DERM247?",
  reasons: [
    "Swiss hosting (Infomaniak) – no data abroad",
    "QR-based photo upload directly from smartphone",
    "Interactive 3D body map for localization",
    "Temporal image comparison with overlay slider",
    "PDF reports for patients & referrers",
  ],
  packagesTitle: "Packages & Pricing",
  popularBadge: "POPULAR",
  perDoctor: "/Doctor",
  perMonth: "per month",
  fineprint: [
    "Minimum term: 12 months  |  Notice period: 60 days  |  Payment terms: 10 days net",
    "Pricing per doctor (user)  |  Single-tenant use only  |  Fair-use storage",
  ],
  nonBinding: "Non-binding offer – subject to change",

  featuresTitle: "Included Features (all packages)",
  features: [
    "Patient management with search function",
    "Interactive 3D body map",
    "Mobile photo upload via QR code",
    "ABCDE risk assessment for skin lesions (score 0–5)",
    "Clinical risk progression with trend analysis",
    "Temporal image comparison (overlay slider)",
    "Image calibration for consistent measurements",
    "PDF reports for patients & referrers",
    "Integrated live support (ticket system with real-time chat)",
    "Multilingual: DE, EN, FR, IT, ES",
    "Daily backups & regular snapshots",
  ],
  inDevelopment: "IN DEVELOPMENT",
  aiFeatureTitle: "Advanced analysis features with AI support",
  aiFeatureDesc: "Intelligent analysis to support clinical decision-making",
  securityTitle: "Data Protection & Security",
  securityItems: [
    "Hosting exclusively in Switzerland (Infomaniak)",
    "No data sharing with third parties",
    "Compliant with DSG and GDPR",
    "Encrypted data transmission & storage",
    "Daily backups & regular snapshots",
  ],

  legalNoticeTitle: "Important legal notice",
  legalNoticeBullets: [
    "DERM247 is NOT a medical device under MepV / MDR.",
    "The system is intended exclusively for documentation and clinical support.",
    "No diagnostic function — clinical diagnoses remain the responsibility of the user.",
    "After contract end: 30 days read-only access incl. export, then deletion or optional archive (CHF 50.–/month).",
  ],

  contactTitle: "Contact & Next Steps",
  contactLine1: "We are happy to provide a customised offer or a test account.",
  contactLine2: "Trial access available upon request.",
  contactLine3: "Email: info@techassist.ch  |  Web: derm247.ch",

  footerLine: "DERM247 | TechAssist | info@techassist.ch | derm247.ch",
  pageOf: (p, t) => `Page ${p} of ${t}`,

  contractTitle: "DERM247 – Software License Agreement",
  contractLabel: "LICENSE AGREEMENT",
  contractNumberLabel: "Contract number",
  between: "between",
  licensor: "(hereinafter «Licensor»)",
  licensee: "(hereinafter «Licensee»)",

  section1Title: "1. Subject of the Contract",
  section1Text:
    "The Licensor grants the Licensee the non-exclusive, non-transferable right to use the software «DERM247» exclusively within the Licensee's own company (tenant). Use by third parties or other companies, transfer, or rental to third parties is expressly prohibited.",

  section2Title: "2. Scope of License",
  packageLabel: "Package",
  doctorCountLabel: "Number of doctors",
  monthlyFeeLabel: "Monthly license fee",
  section2LimitText:
    "The number of active users is strictly limited to the scope of the chosen package. The system technically prevents usage beyond the agreed license count.",

  section3Title: "3. Term, Termination and Data Return",
  section3Text1: (d) =>
    `The contract begins on ${d}. The minimum term is 12 months. The notice period is 60 days before the end of the contract. If no timely notice is given, the contract is automatically renewed for 12 months each time.`,
  section3Text2:
    "An upgrade to a higher package or additional licenses is possible at any time. The new fee applies from the following month. A downgrade is possible subject to the current contract term and takes effect at the earliest at the end of the current term.",
  section3PostTitle: "After contract end:",
  section3PostBullets: [
    "The Licensee receives 30 days of read-only access for viewing and exporting data.",
    "No further uploads, modifications or new entries are possible.",
    "After 30 days, all data is automatically deleted.",
    "Optional: read-only archive for CHF 50.– / month (cancellable at any time).",
    "The Licensee may at any time request complete and irreversible deletion.",
  ],

  section4Title: "4. Payment Terms",
  section4Text:
    "The license fee is invoiced monthly in advance and is payable within 10 days net of the invoice date. In the event of late payment, a reminder will be issued (with a reminder fee). In the event of further delay, the Licensor reserves the right to suspend access to the software and to terminate the contract for cause.",
  bankDetails: "Bank details:",
  iban: "IBAN: CH95 0070 0114 9053 5408 5",
  recipient: "Recipient: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Data Protection and Data Security",
  section5Text1:
    "The Licensor undertakes to handle all data arising in connection with the use of the software in accordance with the Swiss Data Protection Act (DSG) and the GDPR.",
  section5Text2:
    "Data is stored exclusively on servers in Switzerland (Infomaniak). Daily backups and regular snapshots are performed. Data is not shared with third parties and is not processed outside Switzerland. Transmission is fully encrypted. Tenants' data is strictly isolated from one another; cross-tenant access is technically excluded.",
  section5Text3:
    "The usage includes reasonable data storage within the usual scope (fair use). In the event of exceptionally high storage requirements, an individual arrangement can be made.",

  section6Title: "6. Operations, Warranty and Liability",
  section6Text1:
    "The Licensor operates the software to the best of its knowledge and using current security standards.",
  section6OperationsText:
    "Updates and maintenance work are preferably carried out outside usual practice hours (e.g. evenings or weekends). There is no guarantee of permanent availability; high availability within the industry-standard range is targeted.",
  section6LiabilityCap:
    "The Licensor's liability exists only in cases of gross negligence or intent. Liability is in any case capped at three (3) monthly fees of the current contract.",
  section6NoLiability: "No liability exists in particular for:",
  section6Bullets: [
    "Misuse by the customer",
    "Outages due to force majeure",
    "External attacks despite protective measures",
    "Indirect, consequential damages or lost profits",
    "Clinical decisions or diagnoses made by the user",
  ],
  section6Support:
    "Support is provided via the integrated ticket system with real-time chat and by email at info@techassist.ch.",

  section7Title: "7. Medical Disclaimer",
  section7Text:
    "DERM247 is expressly NOT a medical device within the meaning of the Swiss Medical Devices Ordinance (MepV) or the EU Medical Device Regulation (MDR 2017/745).",
  section7Bullets: [
    "The software is intended exclusively for documentation and clinical workflow support.",
    "The software does not provide a diagnosis and does not replace medical examination, assessment or decision-making.",
    "All medical diagnoses, therapeutic decisions and responsibility remain entirely with the user (physician).",
    "Risk scores (e.g. ABCDE) are purely supportive values without diagnostic binding effect.",
  ],

  section8Title: "8. Ownership and Usage Restrictions",
  section8Text:
    "The software, source code, all designs and all associated rights remain the unrestricted property of the Licensor (TechAssist). The Licensee is granted only a temporary right of use within the scope of this agreement.",
  section8Bullets: [
    "No transfer, rental or sublicensing of the software to third parties.",
    "No resale of the software or individual components.",
    "No reverse engineering, decompilation or disassembly.",
    "No circumvention of technical protection measures (license limits, authentication).",
  ],

  section9Title: "9. Confidentiality",
  section9Text:
    "Both parties undertake to keep confidential information of the other party secret and not to disclose it to third parties. This obligation continues beyond the end of the contract.",

  section10Title: "10. Final Provisions",
  section10Text:
    "Swiss law applies. The place of jurisdiction is Zurich. Should individual provisions of this contract be invalid, the validity of the remaining provisions remains unaffected. This contract has been drawn up in two copies and signed by both parties.",

  placeDateLabel: "Place, Date",
  licensorLabel: "Licensor",
  licenseeLabel: "Licensee",
  signatureLabel: "Signature",

  contractFooter: "DERM247 – License Agreement",
  exclVat: " (excl. VAT)",
};

const fr: PdfTexts = {
  packages: {
    individual: { label: "Licence individuelle", desc: "1–4 médecins, CHF 80.–/mois chacun" },
    pack5: { label: "Pack 5", desc: "5 médecins, prix fixe" },
    medium: { label: "6–10 Médecins", desc: "jusqu'à 10 médecins, prix fixe" },
    unlimited: { label: "Illimité", desc: "illimité, prix fixe" },
  },
  headerSubtitle: "Documentation dermatologique numérique pour cabinets modernes",
  headerTrust: "Hébergement suisse  •  Conforme LPD  •  Développé pour les cabinets médicaux",

  benefitsTitle: "Vos avantages",
  benefits: [
    "Diagnostics plus rapides grâce à la documentation numérique",
    "Suivi clair avec comparaison d'images",
    "Moins de charge administrative",
    "Stockage sécurisé exclusivement en Suisse",
  ],
  audienceTitle: "Pour qui ?",
  audiences: ["Dermatologues", "Médecins généralistes avec consultations dermatologiques", "Cabinets de groupe", "Cliniques"],
  whyTitle: "Pourquoi DERM247 ?",
  reasons: [
    "Hébergement suisse (Infomaniak) – aucune donnée à l'étranger",
    "Téléchargement de photos par QR code depuis le smartphone",
    "Carte corporelle 3D interactive pour la localisation",
    "Comparaison temporelle d'images avec curseur de superposition",
    "Rapports PDF pour patients et correspondants",
  ],
  packagesTitle: "Forfaits & Tarifs",
  popularBadge: "POPULAIRE",
  perDoctor: "/Médecin",
  perMonth: "par mois",
  fineprint: [
    "Durée minimale : 12 mois  |  Délai de résiliation : 60 jours  |  Paiement : 10 jours net",
    "Tarif par médecin (utilisateur)  |  Usage limité à un seul cabinet  |  Stockage équitable",
  ],
  nonBinding: "Offre sans engagement – sous réserve de modifications",

  featuresTitle: "Fonctions incluses (tous les forfaits)",
  features: [
    "Gestion des patients avec recherche",
    "Carte corporelle 3D interactive",
    "Téléchargement mobile de photos via QR code",
    "Évaluation du risque ABCDE pour lésions cutanées (score 0–5)",
    "Suivi clinique des risques avec analyse de tendance",
    "Comparaison temporelle d'images (curseur de superposition)",
    "Calibrage d'images pour des mesures cohérentes",
    "Rapports PDF pour patients et correspondants",
    "Support en direct intégré (système de tickets avec chat en temps réel)",
    "Multilingue : DE, EN, FR, IT, ES",
    "Sauvegardes quotidiennes & snapshots réguliers",
  ],
  inDevelopment: "EN DÉVELOPPEMENT",
  aiFeatureTitle: "Fonctions d'analyse avancées avec support IA",
  aiFeatureDesc: "Analyse intelligente pour soutenir la prise de décision clinique",
  securityTitle: "Protection des données & Sécurité",
  securityItems: [
    "Hébergement exclusivement en Suisse (Infomaniak)",
    "Aucune transmission de données à des tiers",
    "Conforme à la LPD et au RGPD",
    "Transmission et stockage des données chiffrés",
    "Sauvegardes quotidiennes & snapshots réguliers",
  ],

  legalNoticeTitle: "Mention légale importante",
  legalNoticeBullets: [
    "DERM247 N'EST PAS un dispositif médical au sens de la ODim / MDR.",
    "Le système est destiné exclusivement à la documentation et au soutien clinique.",
    "Aucune fonction de diagnostic – les diagnostics relèvent de la responsabilité du médecin.",
    "Après la fin du contrat : 30 jours d'accès en lecture seule incl. export, puis suppression ou archive optionnelle (CHF 50.–/mois).",
  ],

  contactTitle: "Contact & prochaines étapes",
  contactLine1: "Nous vous proposons volontiers une offre personnalisée ou un accès test.",
  contactLine2: "Accès d'essai disponible sur demande.",
  contactLine3: "E-mail : info@techassist.ch  |  Web : derm247.ch",

  footerLine: "DERM247 | TechAssist | info@techassist.ch | derm247.ch",
  pageOf: (p, t) => `Page ${p} sur ${t}`,

  contractTitle: "DERM247 – Contrat de licence logicielle",
  contractLabel: "CONTRAT DE LICENCE",
  contractNumberLabel: "Numéro de contrat",
  between: "entre",
  licensor: "(ci-après « Concédant »)",
  licensee: "(ci-après « Licencié »)",

  section1Title: "1. Objet du contrat",
  section1Text:
    "Le Concédant accorde au Licencié le droit non exclusif et non transférable d'utiliser le logiciel « DERM247 » exclusivement au sein de sa propre entreprise (mandant). Toute utilisation par des tiers ou d'autres entreprises, ainsi que toute cession ou location à des tiers, est expressément interdite.",

  section2Title: "2. Étendue de la licence",
  packageLabel: "Forfait",
  doctorCountLabel: "Nombre de médecins",
  monthlyFeeLabel: "Redevance mensuelle",
  section2LimitText:
    "Le nombre d'utilisateurs actifs est strictement limité à l'étendue prévue dans le forfait choisi. Le système empêche techniquement toute utilisation au-delà du nombre de licences convenu.",

  section3Title: "3. Durée, résiliation et restitution des données",
  section3Text1: (d) =>
    `Le contrat débute le ${d}. La durée minimale est de 12 mois. Le délai de résiliation est de 60 jours avant la fin du contrat. À défaut de résiliation en temps utile, le contrat est reconduit automatiquement pour 12 mois.`,
  section3Text2:
    "Un passage à un forfait supérieur ou des licences supplémentaires est possible à tout moment. Le nouveau tarif s'applique à partir du mois suivant. Un passage à un forfait inférieur est possible en respectant la durée contractuelle en cours.",
  section3PostTitle: "Après la fin du contrat :",
  section3PostBullets: [
    "Le Licencié bénéficie de 30 jours d'accès en lecture seule pour consulter et exporter ses données.",
    "Aucun téléchargement, modification ou nouvelle saisie n'est plus possible.",
    "À l'issue de ces 30 jours, toutes les données sont automatiquement supprimées.",
    "Option : archive en lecture seule pour CHF 50.– / mois (résiliable à tout moment).",
    "Le Licencié peut à tout moment exiger une suppression complète et irréversible.",
  ],

  section4Title: "4. Conditions de paiement",
  section4Text:
    "La redevance est facturée mensuellement à l'avance et est payable dans les 10 jours nets suivant la date de facturation. En cas de retard de paiement, un rappel est envoyé (avec frais de rappel). En cas de retard supplémentaire, le Concédant se réserve expressément le droit de suspendre l'accès au logiciel et de résilier le contrat de manière extraordinaire.",
  bankDetails: "Coordonnées bancaires :",
  iban: "IBAN : CH95 0070 0114 9053 5408 5",
  recipient: "Bénéficiaire : Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protection et sécurité des données",
  section5Text1:
    "Le Concédant s'engage à traiter toutes les données liées à l'utilisation du logiciel conformément à la Loi fédérale sur la protection des données (LPD) et au RGPD.",
  section5Text2:
    "Les données sont stockées exclusivement sur des serveurs en Suisse (Infomaniak). Des sauvegardes quotidiennes et des snapshots réguliers sont effectués. Les données ne sont pas transmises à des tiers et ne sont pas traitées en dehors de la Suisse. La transmission est entièrement chiffrée. Les données des différents mandants sont strictement isolées les unes des autres ; tout accès inter-mandants est techniquement exclu.",
  section5Text3:
    "L'utilisation comprend un stockage de données raisonnable dans le cadre habituel (fair-use). En cas de besoins de stockage exceptionnellement élevés, un accord individuel peut être conclu.",

  section6Title: "6. Exploitation, garantie et responsabilité",
  section6Text1:
    "Le Concédant exploite le logiciel au mieux de ses connaissances et selon les normes de sécurité actuelles.",
  section6OperationsText:
    "Les mises à jour et les opérations de maintenance sont effectuées de préférence en dehors des heures habituelles d'ouverture (par exemple le soir ou le week-end). Aucune garantie de disponibilité permanente n'est fournie ; une haute disponibilité conforme aux standards du secteur est visée.",
  section6LiabilityCap:
    "La responsabilité du Concédant n'est engagée qu'en cas de négligence grave ou de faute intentionnelle. La responsabilité est en tout état de cause plafonnée à trois (3) redevances mensuelles du contrat en cours.",
  section6NoLiability: "Aucune responsabilité notamment pour :",
  section6Bullets: [
    "Mauvaise utilisation par le client",
    "Pannes dues à un cas de force majeure",
    "Attaques externes malgré les mesures de protection",
    "Dommages indirects, consécutifs ou perte de bénéfice",
    "Décisions ou diagnostics cliniques de l'utilisateur",
  ],
  section6Support:
    "Le support est assuré via le système de tickets intégré avec chat en temps réel et par e-mail à info@techassist.ch.",

  section7Title: "7. Mention médicale",
  section7Text:
    "DERM247 N'EST PAS un dispositif médical au sens de l'Ordonnance suisse sur les dispositifs médicaux (ODim) ni du Règlement européen sur les dispositifs médicaux (MDR 2017/745).",
  section7Bullets: [
    "Le logiciel est destiné exclusivement à la documentation et au soutien du flux de travail clinique.",
    "Le logiciel ne pose pas de diagnostic et ne remplace pas l'examen, l'évaluation ou la décision médicale.",
    "Tous les diagnostics médicaux, décisions thérapeutiques et responsabilités relèvent entièrement de l'utilisateur (médecin).",
    "Les scores de risque (par ex. ABCDE) sont des valeurs purement indicatives sans effet diagnostique contraignant.",
  ],

  section8Title: "8. Propriété et restrictions d'utilisation",
  section8Text:
    "Le logiciel, le code source, l'ensemble des designs et tous les droits associés restent la propriété exclusive du Concédant (TechAssist). Le Licencié ne se voit accorder qu'un droit d'utilisation temporaire dans le cadre du présent contrat.",
  section8Bullets: [
    "Aucune cession, location ou sous-licence du logiciel à des tiers.",
    "Aucune revente du logiciel ou de ses composants.",
    "Aucune ingénierie inverse, décompilation ou désassemblage.",
    "Aucun contournement des mesures techniques de protection (limites de licences, authentification).",
  ],

  section9Title: "9. Confidentialité",
  section9Text:
    "Les deux parties s'engagent à garder confidentielles les informations de l'autre partie et à ne pas les divulguer à des tiers. Cette obligation perdure au-delà de la fin du contrat.",

  section10Title: "10. Dispositions finales",
  section10Text:
    "Le droit suisse est applicable. Le for juridique est Zurich. Si certaines dispositions de ce contrat devaient être invalides, la validité des autres dispositions n'en serait pas affectée. Ce contrat a été établi en deux exemplaires et signé par les deux parties.",

  placeDateLabel: "Lieu, Date",
  licensorLabel: "Concédant",
  licenseeLabel: "Licencié",
  signatureLabel: "Signature",

  contractFooter: "DERM247 – Contrat de licence",
  exclVat: " (hors TVA)",
};

const it: PdfTexts = {
  packages: {
    individual: { label: "Licenza individuale", desc: "1–4 medici, CHF 80.–/mese ciascuno" },
    pack5: { label: "Pacchetto 5", desc: "5 medici, prezzo fisso" },
    medium: { label: "6–10 Medici", desc: "fino a 10 medici, prezzo fisso" },
    unlimited: { label: "Illimitato", desc: "illimitato, prezzo fisso" },
  },
  headerSubtitle: "Documentazione dermatologica digitale per studi moderni",
  headerTrust: "Hosting svizzero  •  Conforme LPD  •  Sviluppato per studi medici",

  benefitsTitle: "I vostri vantaggi",
  benefits: [
    "Diagnosi più rapide grazie alla documentazione digitale",
    "Controllo chiaro del decorso con confronto di immagini",
    "Meno onere amministrativo",
    "Archiviazione sicura esclusivamente in Svizzera",
  ],
  audienceTitle: "Per chi?",
  audiences: ["Dermatologi", "Medici di base con consulenze dermatologiche", "Studi associati", "Cliniche"],
  whyTitle: "Perché DERM247?",
  reasons: [
    "Hosting svizzero (Infomaniak) – nessun dato all'estero",
    "Caricamento foto via codice QR dallo smartphone",
    "Mappa corporea 3D interattiva per la localizzazione",
    "Confronto temporale di immagini con cursore di sovrapposizione",
    "Rapporti PDF per pazienti e referenti",
  ],
  packagesTitle: "Pacchetti & Prezzi",
  popularBadge: "POPOLARE",
  perDoctor: "/Medico",
  perMonth: "al mese",
  fineprint: [
    "Durata minima: 12 mesi  |  Periodo di disdetta: 60 giorni  |  Pagamento: 10 giorni netti",
    "Prezzo per medico (utente)  |  Uso limitato a una sola azienda  |  Archiviazione equa",
  ],
  nonBinding: "Offerta non vincolante – con riserva di modifiche",

  featuresTitle: "Funzioni incluse (tutti i pacchetti)",
  features: [
    "Gestione pazienti con funzione di ricerca",
    "Mappa corporea 3D interattiva",
    "Caricamento foto mobile via codice QR",
    "Valutazione rischio ABCDE per lesioni cutanee (punteggio 0–5)",
    "Andamento clinico del rischio con analisi delle tendenze",
    "Confronto temporale di immagini (cursore di sovrapposizione)",
    "Calibrazione immagini per misurazioni coerenti",
    "Rapporti PDF per pazienti e referenti",
    "Supporto live integrato (sistema di ticket con chat in tempo reale)",
    "Multilingua: DE, EN, FR, IT, ES",
    "Backup giornalieri & snapshot regolari",
  ],
  inDevelopment: "IN SVILUPPO",
  aiFeatureTitle: "Funzioni di analisi avanzate con supporto IA",
  aiFeatureDesc: "Analisi intelligente per supportare le decisioni cliniche",
  securityTitle: "Protezione dei dati & Sicurezza",
  securityItems: [
    "Hosting esclusivamente in Svizzera (Infomaniak)",
    "Nessuna trasmissione di dati a terzi",
    "Conforme a LPD e RGPD",
    "Trasmissione e archiviazione dei dati crittografate",
    "Backup giornalieri & snapshot regolari",
  ],

  legalNoticeTitle: "Avviso legale importante",
  legalNoticeBullets: [
    "DERM247 NON è un dispositivo medico ai sensi di ODmed / MDR.",
    "Il sistema è destinato esclusivamente alla documentazione e al supporto clinico.",
    "Nessuna funzione diagnostica – le diagnosi cliniche restano di competenza del medico utente.",
    "Dopo la fine del contratto: 30 giorni di accesso in sola lettura incl. esportazione, poi cancellazione o archivio opzionale (CHF 50.–/mese).",
  ],

  contactTitle: "Contatto & prossimi passi",
  contactLine1: "Saremo lieti di fornirvi un'offerta personalizzata o un account di prova.",
  contactLine2: "Accesso di prova disponibile su richiesta.",
  contactLine3: "E-mail: info@techassist.ch  |  Web: derm247.ch",

  footerLine: "DERM247 | TechAssist | info@techassist.ch | derm247.ch",
  pageOf: (p, t) => `Pagina ${p} di ${t}`,

  contractTitle: "DERM247 – Contratto di licenza software",
  contractLabel: "CONTRATTO DI LICENZA",
  contractNumberLabel: "Numero di contratto",
  between: "tra",
  licensor: "(di seguito «Licenziante»)",
  licensee: "(di seguito «Licenziatario»)",

  section1Title: "1. Oggetto del contratto",
  section1Text:
    "Il Licenziante concede al Licenziatario il diritto non esclusivo e non trasferibile di utilizzare il software «DERM247» esclusivamente all'interno della propria azienda (tenant). L'utilizzo da parte di terzi o di altre aziende, nonché la cessione o la locazione a terzi, è espressamente vietato.",

  section2Title: "2. Ambito della licenza",
  packageLabel: "Pacchetto",
  doctorCountLabel: "Numero di medici",
  monthlyFeeLabel: "Canone mensile",
  section2LimitText:
    "Il numero di utenti attivi è strettamente limitato all'ambito previsto dal pacchetto scelto. Il sistema impedisce tecnicamente l'utilizzo oltre il numero di licenze concordato.",

  section3Title: "3. Durata, disdetta e restituzione dei dati",
  section3Text1: (d) =>
    `Il contratto inizia il ${d}. La durata minima è di 12 mesi. Il periodo di disdetta è di 60 giorni prima della scadenza del contratto. In assenza di disdetta tempestiva, il contratto si rinnova automaticamente di 12 mesi.`,
  section3Text2:
    "Un upgrade a un pacchetto superiore o licenze aggiuntive è possibile in qualsiasi momento. Il nuovo canone si applica dal mese successivo. Un downgrade è possibile nel rispetto della durata contrattuale in corso.",
  section3PostTitle: "Dopo la fine del contratto:",
  section3PostBullets: [
    "Il Licenziatario riceve 30 giorni di accesso in sola lettura per consultare ed esportare i dati.",
    "Non sono più possibili upload, modifiche o nuove inserzioni.",
    "Trascorsi i 30 giorni, tutti i dati vengono cancellati automaticamente.",
    "Opzionale: archivio in sola lettura a CHF 50.– / mese (disdicibile in qualsiasi momento).",
    "Il Licenziatario può richiedere in qualsiasi momento la cancellazione completa e irreversibile.",
  ],

  section4Title: "4. Condizioni di pagamento",
  section4Text:
    "Il canone è fatturato mensilmente in anticipo ed è dovuto entro 10 giorni netti dalla data della fattura. In caso di ritardo nel pagamento, viene inviato un sollecito (con spese di sollecito). In caso di ulteriore ritardo, il Licenziante si riserva espressamente il diritto di sospendere l'accesso al software e di risolvere il contratto in via straordinaria.",
  bankDetails: "Coordinate bancarie:",
  iban: "IBAN: CH95 0070 0114 9053 5408 5",
  recipient: "Beneficiario: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protezione e sicurezza dei dati",
  section5Text1:
    "Il Licenziante si impegna a trattare tutti i dati relativi all'uso del software in conformità con la Legge federale sulla protezione dei dati (LPD) e il RGPD.",
  section5Text2:
    "I dati sono archiviati esclusivamente su server in Svizzera (Infomaniak). Vengono eseguiti backup giornalieri e snapshot regolari. I dati non vengono trasmessi a terzi né elaborati al di fuori della Svizzera. La trasmissione è completamente crittografata. I dati dei diversi tenant sono rigorosamente isolati tra loro; un accesso tra tenant è tecnicamente escluso.",
  section5Text3:
    "L'utilizzo comprende un'archiviazione ragionevole dei dati nell'ambito consueto (fair-use). In caso di esigenze di archiviazione eccezionalmente elevate, è possibile concordare un accordo individuale.",

  section6Title: "6. Esercizio, garanzia e responsabilità",
  section6Text1:
    "Il Licenziante gestisce il software al meglio delle sue conoscenze e secondo gli standard di sicurezza attuali.",
  section6OperationsText:
    "Aggiornamenti e interventi di manutenzione vengono eseguiti preferibilmente al di fuori dei consueti orari di studio (ad es. la sera o nei weekend). Non viene fornita alcuna garanzia di disponibilità permanente; viene perseguita un'elevata disponibilità nell'ambito degli standard del settore.",
  section6LiabilityCap:
    "La responsabilità del Licenziante sussiste esclusivamente in caso di negligenza grave o dolo. La responsabilità è in ogni caso limitata a tre (3) canoni mensili del contratto in corso.",
  section6NoLiability: "Nessuna responsabilità in particolare per:",
  section6Bullets: [
    "Uso improprio da parte del cliente",
    "Interruzioni dovute a forza maggiore",
    "Attacchi esterni nonostante le misure di protezione",
    "Danni indiretti, consequenziali o mancato profitto",
    "Decisioni o diagnosi cliniche dell'utente",
  ],
  section6Support:
    "Il supporto è fornito tramite il sistema di ticket integrato con chat in tempo reale e via e-mail all'indirizzo info@techassist.ch.",

  section7Title: "7. Avviso medico",
  section7Text:
    "DERM247 NON è un dispositivo medico ai sensi dell'Ordinanza svizzera sui dispositivi medici (ODmed) né del Regolamento UE sui dispositivi medici (MDR 2017/745).",
  section7Bullets: [
    "Il software è destinato esclusivamente alla documentazione e al supporto del workflow clinico.",
    "Il software non fornisce una diagnosi e non sostituisce l'esame, la valutazione o la decisione medica.",
    "Tutte le diagnosi mediche, le decisioni terapeutiche e la responsabilità restano interamente in capo all'utente (medico).",
    "I punteggi di rischio (es. ABCDE) sono valori puramente di supporto, senza effetto diagnostico vincolante.",
  ],

  section8Title: "8. Proprietà e limitazioni d'uso",
  section8Text:
    "Il software, il codice sorgente, tutti i design e tutti i diritti associati restano di proprietà esclusiva del Licenziante (TechAssist). Al Licenziatario viene concesso esclusivamente un diritto d'uso temporaneo nell'ambito del presente contratto.",
  section8Bullets: [
    "Nessuna cessione, locazione o sub-licenza del software a terzi.",
    "Nessuna rivendita del software o di singoli componenti.",
    "Nessun reverse engineering, decompilazione o disassemblaggio.",
    "Nessuna elusione delle misure tecniche di protezione (limiti di licenza, autenticazione).",
  ],

  section9Title: "9. Riservatezza",
  section9Text:
    "Entrambe le parti si impegnano a mantenere riservate le informazioni dell'altra parte e a non divulgarle a terzi. Tale obbligo permane oltre la fine del contratto.",

  section10Title: "10. Disposizioni finali",
  section10Text:
    "Si applica il diritto svizzero. Il foro competente è Zurigo. Qualora singole disposizioni del presente contratto risultassero invalide, la validità delle restanti disposizioni resta impregiudicata. Il presente contratto è stato redatto in due esemplari e firmato da entrambe le parti.",

  placeDateLabel: "Luogo, Data",
  licensorLabel: "Licenziante",
  licenseeLabel: "Licenziatario",
  signatureLabel: "Firma",

  contractFooter: "DERM247 – Contratto di licenza",
  exclVat: " (IVA esclusa)",
};

const es: PdfTexts = {
  packages: {
    individual: { label: "Licencia individual", desc: "1–4 médicos, CHF 80.–/mes cada uno" },
    pack5: { label: "Paquete 5", desc: "5 médicos, precio fijo" },
    medium: { label: "6–10 Médicos", desc: "hasta 10 médicos, precio fijo" },
    unlimited: { label: "Ilimitado", desc: "ilimitado, precio fijo" },
  },
  headerSubtitle: "Documentación dermatológica digital para consultas modernas",
  headerTrust: "Alojamiento suizo  •  Conforme LPD  •  Desarrollado para consultas médicas",

  benefitsTitle: "Sus ventajas",
  benefits: [
    "Diagnósticos más rápidos gracias a la documentación digital",
    "Control claro del seguimiento con comparación de imágenes",
    "Menos carga administrativa",
    "Almacenamiento seguro exclusivamente en Suiza",
  ],
  audienceTitle: "¿Para quién?",
  audiences: ["Dermatólogos", "Médicos generales con consultas dermatológicas", "Consultas grupales", "Clínicas"],
  whyTitle: "¿Por qué DERM247?",
  reasons: [
    "Alojamiento suizo (Infomaniak) – sin datos en el extranjero",
    "Carga de fotos por código QR desde el smartphone",
    "Mapa corporal 3D interactivo para localización",
    "Comparación temporal de imágenes con control deslizante",
    "Informes PDF para pacientes y derivadores",
  ],
  packagesTitle: "Paquetes y Precios",
  popularBadge: "POPULAR",
  perDoctor: "/Médico",
  perMonth: "por mes",
  fineprint: [
    "Duración mínima: 12 meses  |  Plazo de preaviso: 60 días  |  Pago: 10 días neto",
    "Precio por médico (usuario)  |  Uso limitado a una sola empresa  |  Almacenamiento justo",
  ],
  nonBinding: "Oferta no vinculante – sujeta a cambios",

  featuresTitle: "Funciones incluidas (todos los paquetes)",
  features: [
    "Gestión de pacientes con búsqueda",
    "Mapa corporal 3D interactivo",
    "Carga móvil de fotos vía código QR",
    "Evaluación de riesgo ABCDE para lesiones cutáneas (puntuación 0–5)",
    "Seguimiento clínico del riesgo con análisis de tendencias",
    "Comparación temporal de imágenes (control deslizante)",
    "Calibración de imágenes para mediciones consistentes",
    "Informes PDF para pacientes y derivadores",
    "Soporte en vivo integrado (sistema de tickets con chat en tiempo real)",
    "Multilingüe: DE, EN, FR, IT, ES",
    "Copias de seguridad diarias y snapshots regulares",
  ],
  inDevelopment: "EN DESARROLLO",
  aiFeatureTitle: "Funciones de análisis avanzadas con soporte de IA",
  aiFeatureDesc: "Análisis inteligente para apoyar la toma de decisiones clínicas",
  securityTitle: "Protección de datos y Seguridad",
  securityItems: [
    "Alojamiento exclusivamente en Suiza (Infomaniak)",
    "Sin transmisión de datos a terceros",
    "Conforme con LPD y RGPD",
    "Transmisión y almacenamiento de datos cifrados",
    "Copias de seguridad diarias y snapshots regulares",
  ],

  legalNoticeTitle: "Aviso legal importante",
  legalNoticeBullets: [
    "DERM247 NO es un producto sanitario en el sentido de ODim / MDR.",
    "El sistema está destinado exclusivamente a la documentación y al apoyo clínico.",
    "Sin función diagnóstica – los diagnósticos clínicos son responsabilidad del médico usuario.",
    "Tras la finalización del contrato: 30 días de acceso de solo lectura incl. exportación, después eliminación o archivo opcional (CHF 50.–/mes).",
  ],

  contactTitle: "Contacto y próximos pasos",
  contactLine1: "Con gusto le proporcionamos una oferta personalizada o una cuenta de prueba.",
  contactLine2: "Acceso de prueba disponible bajo solicitud.",
  contactLine3: "E-mail: info@techassist.ch  |  Web: derm247.ch",

  footerLine: "DERM247 | TechAssist | info@techassist.ch | derm247.ch",
  pageOf: (p, t) => `Página ${p} de ${t}`,

  contractTitle: "DERM247 – Contrato de licencia de software",
  contractLabel: "CONTRATO DE LICENCIA",
  contractNumberLabel: "Número de contrato",
  between: "entre",
  licensor: "(en adelante «Licenciante»)",
  licensee: "(en adelante «Licenciatario»)",

  section1Title: "1. Objeto del contrato",
  section1Text:
    "El Licenciante otorga al Licenciatario el derecho no exclusivo e intransferible de utilizar el software «DERM247» exclusivamente dentro de su propia empresa (tenant). Queda expresamente prohibido el uso por terceros u otras empresas, así como su cesión o alquiler a terceros.",

  section2Title: "2. Alcance de la licencia",
  packageLabel: "Paquete",
  doctorCountLabel: "Número de médicos",
  monthlyFeeLabel: "Tarifa mensual de licencia",
  section2LimitText:
    "El número de usuarios activos está estrictamente limitado al alcance previsto en el paquete elegido. El sistema impide técnicamente cualquier uso por encima del número de licencias acordado.",

  section3Title: "3. Duración, terminación y devolución de datos",
  section3Text1: (d) =>
    `El contrato comienza el ${d}. La duración mínima es de 12 meses. El plazo de preaviso es de 60 días antes del vencimiento del contrato. Si no se notifica a tiempo, el contrato se renueva automáticamente por 12 meses.`,
  section3Text2:
    "Un upgrade a un paquete superior o licencias adicionales es posible en cualquier momento. La nueva tarifa se aplica desde el mes siguiente. Un downgrade es posible respetando la duración contractual vigente.",
  section3PostTitle: "Tras la finalización del contrato:",
  section3PostBullets: [
    "El Licenciatario dispone de 30 días de acceso en solo lectura para consultar y exportar sus datos.",
    "No se permiten más cargas, modificaciones ni nuevas entradas.",
    "Transcurridos los 30 días, todos los datos se eliminan automáticamente.",
    "Opcional: archivo de solo lectura por CHF 50.– / mes (cancelable en cualquier momento).",
    "El Licenciatario puede solicitar en cualquier momento la eliminación completa e irreversible.",
  ],

  section4Title: "4. Condiciones de pago",
  section4Text:
    "La tarifa se factura mensualmente por adelantado y es pagadera dentro de los 10 días netos posteriores a la fecha de factura. En caso de retraso en el pago, se enviará un recordatorio (con tasa de aviso). En caso de demora adicional, el Licenciante se reserva expresamente el derecho de suspender el acceso al software y de resolver el contrato de forma extraordinaria.",
  bankDetails: "Datos bancarios:",
  iban: "IBAN: CH95 0070 0114 9053 5408 5",
  recipient: "Beneficiario: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protección y seguridad de datos",
  section5Text1:
    "El Licenciante se compromete a tratar todos los datos relacionados con el uso del software de acuerdo con la Ley Federal de Protección de Datos (LPD) y el RGPD.",
  section5Text2:
    "Los datos se almacenan exclusivamente en servidores en Suiza (Infomaniak). Se realizan copias de seguridad diarias y snapshots regulares. Los datos no se comparten con terceros ni se procesan fuera de Suiza. La transmisión está completamente cifrada. Los datos de los distintos tenants están estrictamente aislados entre sí; el acceso entre tenants queda técnicamente excluido.",
  section5Text3:
    "El uso incluye un almacenamiento razonable de datos en el marco habitual (fair-use). En caso de necesidades de almacenamiento excepcionalmente altas, se puede acordar un acuerdo individual.",

  section6Title: "6. Operación, garantía y responsabilidad",
  section6Text1:
    "El Licenciante opera el software con los mejores conocimientos y estándares de seguridad actuales.",
  section6OperationsText:
    "Las actualizaciones y los trabajos de mantenimiento se realizan preferentemente fuera del horario habitual de consulta (por ejemplo, por la noche o los fines de semana). No se garantiza una disponibilidad permanente; se persigue una alta disponibilidad dentro del estándar del sector.",
  section6LiabilityCap:
    "La responsabilidad del Licenciante existe únicamente en caso de negligencia grave o dolo. La responsabilidad se limita en cualquier caso a tres (3) tarifas mensuales del contrato en curso.",
  section6NoLiability: "No existe responsabilidad en particular por:",
  section6Bullets: [
    "Uso indebido por parte del cliente",
    "Interrupciones por fuerza mayor",
    "Ataques externos a pesar de las medidas de protección",
    "Daños indirectos, consecuentes o lucro cesante",
    "Decisiones o diagnósticos clínicos del usuario",
  ],
  section6Support:
    "El soporte se proporciona a través del sistema de tickets integrado con chat en tiempo real y por correo electrónico a info@techassist.ch.",

  section7Title: "7. Aviso médico",
  section7Text:
    "DERM247 NO es un producto sanitario en el sentido de la Ordenanza suiza sobre productos sanitarios (ODim) ni del Reglamento UE sobre productos sanitarios (MDR 2017/745).",
  section7Bullets: [
    "El software se destina exclusivamente a la documentación y al soporte del flujo de trabajo clínico.",
    "El software no realiza un diagnóstico ni sustituye el examen, la evaluación o la decisión médica.",
    "Todos los diagnósticos médicos, decisiones terapéuticas y responsabilidad recaen íntegramente en el usuario (médico).",
    "Las puntuaciones de riesgo (p. ej. ABCDE) son valores meramente orientativos sin efecto diagnóstico vinculante.",
  ],

  section8Title: "8. Propiedad y restricciones de uso",
  section8Text:
    "El software, el código fuente, todos los diseños y todos los derechos asociados permanecen como propiedad exclusiva del Licenciante (TechAssist). Al Licenciatario solo se le concede un derecho de uso temporal en el marco del presente contrato.",
  section8Bullets: [
    "Sin cesión, alquiler ni sublicencia del software a terceros.",
    "Sin reventa del software ni de sus componentes.",
    "Sin ingeniería inversa, descompilación o desensamblado.",
    "Sin elusión de las medidas técnicas de protección (límites de licencia, autenticación).",
  ],

  section9Title: "9. Confidencialidad",
  section9Text:
    "Ambas partes se comprometen a mantener confidencial la información de la otra parte y a no revelarla a terceros. Esta obligación permanece vigente tras la finalización del contrato.",

  section10Title: "10. Disposiciones finales",
  section10Text:
    "Se aplica el derecho suizo. El lugar de jurisdicción es Zúrich. Si alguna de las disposiciones de este contrato resultara inválida, ello no afectará a la validez de las restantes. Este contrato se ha redactado en dos ejemplares y ha sido firmado por ambas partes.",

  placeDateLabel: "Lugar, Fecha",
  licensorLabel: "Licenciante",
  licenseeLabel: "Licenciatario",
  signatureLabel: "Firma",

  contractFooter: "DERM247 – Contrato de licencia",
  exclVat: " (IVA no incluido)",
};

const allTexts: Record<string, PdfTexts> = { de, en, fr, it, es };

export function getPdfTexts(lang: string): PdfTexts {
  return allTexts[lang] || allTexts.de;
}
