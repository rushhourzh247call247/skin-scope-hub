/**
 * Translations for PDF content (brochure + contract).
 * Supported: de, en, fr, it, es
 */

export type PdfLang = "de" | "en" | "fr" | "it" | "es";

interface PdfTexts {
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

  section1Title: string;
  section1Text: string;

  section2Title: string;
  packageLabel: string;
  doctorCountLabel: string;
  monthlyFeeLabel: string;

  section3Title: string;
  section3Text1: (startDate: string) => string;
  section3Text2: string;

  section4Title: string;
  section4Text: string;
  bankDetails: string;
  iban: string;
  recipient: string;

  section5Title: string;
  section5Text1: string;
  section5Text2: string;
  section5Text3: string;

  section6Title: string;
  section6Text1: string;
  section6NoLiability: string;
  section6Bullets: string[];
  section6Support: string;

  section7Title: string;
  section7Text: string;

  section8Title: string;
  section8Text: string;

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
    "Mindestlaufzeit: 12 Monate  |  Kündigungsfrist: 60 Tage  |  Monatliche Abrechnung im Voraus",
    "Fair-Use Speicherregelung  |  Upgrade jederzeit möglich  |  Änderungen vorbehalten",
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
    "Mehrsprachig: DE, EN, FR, IT, ES",
    "E-Mail-Support  |  Tägliche Backups",
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
  section1Text: "Die Lizenzgeberin gewährt dem Lizenznehmer das nicht-exklusive, nicht übertragbare Recht zur Nutzung der Software «DERM247» gemäss den Bedingungen dieses Vertrags.",

  section2Title: "2. Lizenzumfang",
  packageLabel: "Paket",
  doctorCountLabel: "Anzahl Ärzte",
  monthlyFeeLabel: "Monatliche Lizenzgebühr",

  section3Title: "3. Laufzeit und Paketänderungen",
  section3Text1: (d) => `Der Vertrag beginnt am ${d}. Die Mindestlaufzeit beträgt 12 Monate. Die Kündigungsfrist beträgt 60 Tage zum Vertragsende. Erfolgt keine fristgerechte Kündigung, verlängert sich der Vertrag automatisch um jeweils 12 Monate.`,
  section3Text2: "Ein Upgrade auf ein höheres Paket oder zusätzliche Lizenzen ist jederzeit möglich. Die neue Gebühr gilt ab dem Folgemonat. Ein Downgrade ist unter Einhaltung der laufenden Vertragsdauer möglich und wird frühestens zum Ende der aktuellen Laufzeit wirksam.",

  section4Title: "4. Zahlungsbedingungen",
  section4Text: "Die Lizenzgebühr wird monatlich im Voraus in Rechnung gestellt und ist innert 30 Tagen nach Rechnungsdatum zahlbar. Bei Zahlungsverzug behält sich die Lizenzgeberin das Recht vor, den Zugang zur Software zu sperren.",
  bankDetails: "Bankverbindung:",
  iban: "IBAN: CH66 0070 0110 0057 8304 8",
  recipient: "Empfänger: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Datenschutz und Datensicherheit",
  section5Text1: "Die Lizenzgeberin verpflichtet sich, alle im Zusammenhang mit der Nutzung der Software anfallenden Daten gemäss dem Schweizerischen Datenschutzgesetz (DSG) und der DSGVO zu behandeln.",
  section5Text2: "Die Daten werden ausschliesslich auf Servern in der Schweiz (Infomaniak) gespeichert. Es werden tägliche Backups sowie regelmässige Snapshots durchgeführt. Die Daten werden nicht an Drittanbieter weitergegeben und nicht ausserhalb der Schweiz verarbeitet. Die Übertragung erfolgt vollständig verschlüsselt.",
  section5Text3: "Die Nutzung beinhaltet eine angemessene Datenspeicherung im üblichen Rahmen. Bei aussergewöhnlich hohem Speicherbedarf kann eine individuelle Vereinbarung getroffen werden.",

  section6Title: "6. Gewährleistung, Haftung und Support",
  section6Text1: "Die Lizenzgeberin betreibt die Software nach bestem Wissen und mit aktuellen Sicherheitsstandards. Eine Haftung besteht nur bei grober Fahrlässigkeit oder Vorsatz.",
  section6NoLiability: "Keine Haftung besteht insbesondere für:",
  section6Bullets: [
    "Fehlbedienung durch den Kunden",
    "Ausfälle durch höhere Gewalt",
    "externe Angriffe trotz Schutzmassnahmen",
    "indirekte Schäden oder Folgeschäden",
  ],
  section6Support: "Support erfolgt ausschliesslich per E-Mail an info@techassist.ch. Ein Anspruch auf telefonischen oder Live-Support besteht nicht.",

  section7Title: "7. Geheimhaltung",
  section7Text: "Beide Parteien verpflichten sich, vertrauliche Informationen der jeweils anderen Partei geheim zu halten und nicht an Dritte weiterzugeben.",

  section8Title: "8. Schlussbestimmungen",
  section8Text: "Es gilt Schweizer Recht. Gerichtsstand ist Zürich. Dieser Vertrag wurde in zwei Exemplaren ausgefertigt und von beiden Parteien unterzeichnet.",

  placeDateLabel: "Ort, Datum",
  licensorLabel: "Lizenzgeberin",
  licenseeLabel: "Lizenznehmer",
  signatureLabel: "Unterschrift",

  contractFooter: "DERM247 – Lizenzvertrag",
  exclVat: " (exkl. MwSt.)",
};

const en: PdfTexts = {
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
    "Minimum term: 12 months  |  Notice period: 60 days  |  Monthly billing in advance",
    "Fair-use storage policy  |  Upgrade anytime  |  Subject to change",
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
    "Multilingual: DE, EN, FR, IT, ES",
    "Email support  |  Daily backups",
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
  section1Text: "The Licensor grants the Licensee the non-exclusive, non-transferable right to use the software «DERM247» in accordance with the terms of this agreement.",

  section2Title: "2. Scope of License",
  packageLabel: "Package",
  doctorCountLabel: "Number of doctors",
  monthlyFeeLabel: "Monthly license fee",

  section3Title: "3. Term and Package Changes",
  section3Text1: (d) => `The contract begins on ${d}. The minimum term is 12 months. The notice period is 60 days before the end of the contract. If no timely notice is given, the contract is automatically renewed for 12 months each time.`,
  section3Text2: "An upgrade to a higher package or additional licenses is possible at any time. The new fee applies from the following month. A downgrade is possible subject to the current contract term and takes effect at the earliest at the end of the current term.",

  section4Title: "4. Payment Terms",
  section4Text: "The license fee is invoiced monthly in advance and is payable within 30 days of the invoice date. In the event of late payment, the Licensor reserves the right to suspend access to the software.",
  bankDetails: "Bank details:",
  iban: "IBAN: CH66 0070 0110 0057 8304 8",
  recipient: "Recipient: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Data Protection and Data Security",
  section5Text1: "The Licensor undertakes to handle all data arising in connection with the use of the software in accordance with the Swiss Data Protection Act (DSG) and the GDPR.",
  section5Text2: "Data is stored exclusively on servers in Switzerland (Infomaniak). Daily backups and regular snapshots are performed. Data is not shared with third parties and is not processed outside Switzerland. Transmission is fully encrypted.",
  section5Text3: "The usage includes reasonable data storage within the usual scope. In the event of exceptionally high storage requirements, an individual arrangement can be made.",

  section6Title: "6. Warranty, Liability and Support",
  section6Text1: "The Licensor operates the software to the best of its knowledge and with current security standards. Liability exists only in the case of gross negligence or intent.",
  section6NoLiability: "No liability exists in particular for:",
  section6Bullets: [
    "Misuse by the customer",
    "Outages due to force majeure",
    "External attacks despite protective measures",
    "Indirect or consequential damages",
  ],
  section6Support: "Support is provided exclusively via email at info@techassist.ch. There is no entitlement to telephone or live support.",

  section7Title: "7. Confidentiality",
  section7Text: "Both parties undertake to keep confidential information of the other party secret and not to disclose it to third parties.",

  section8Title: "8. Final Provisions",
  section8Text: "Swiss law applies. The place of jurisdiction is Zurich. This contract has been drawn up in two copies and signed by both parties.",

  placeDateLabel: "Place, Date",
  licensorLabel: "Licensor",
  licenseeLabel: "Licensee",
  signatureLabel: "Signature",

  contractFooter: "DERM247 – License Agreement",
  exclVat: " (excl. VAT)",
};

const fr: PdfTexts = {
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
    "Durée minimale : 12 mois  |  Délai de résiliation : 60 jours  |  Facturation mensuelle à l'avance",
    "Stockage équitable  |  Mise à niveau possible à tout moment  |  Sous réserve de modifications",
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
    "Multilingue : DE, EN, FR, IT, ES",
    "Support par e-mail  |  Sauvegardes quotidiennes",
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
  section1Text: "Le Concédant accorde au Licencié le droit non exclusif et non transférable d'utiliser le logiciel « DERM247 » conformément aux conditions du présent contrat.",

  section2Title: "2. Étendue de la licence",
  packageLabel: "Forfait",
  doctorCountLabel: "Nombre de médecins",
  monthlyFeeLabel: "Redevance mensuelle",

  section3Title: "3. Durée et modifications de forfait",
  section3Text1: (d) => `Le contrat débute le ${d}. La durée minimale est de 12 mois. Le délai de résiliation est de 60 jours avant la fin du contrat. À défaut de résiliation en temps utile, le contrat est reconduit automatiquement pour 12 mois.`,
  section3Text2: "Un passage à un forfait supérieur ou des licences supplémentaires est possible à tout moment. Le nouveau tarif s'applique à partir du mois suivant. Un passage à un forfait inférieur est possible en respectant la durée contractuelle en cours.",

  section4Title: "4. Conditions de paiement",
  section4Text: "La redevance est facturée mensuellement à l'avance et est payable dans les 30 jours suivant la date de facturation. En cas de retard de paiement, le Concédant se réserve le droit de suspendre l'accès au logiciel.",
  bankDetails: "Coordonnées bancaires :",
  iban: "IBAN : CH66 0070 0110 0057 8304 8",
  recipient: "Bénéficiaire : Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protection et sécurité des données",
  section5Text1: "Le Concédant s'engage à traiter toutes les données liées à l'utilisation du logiciel conformément à la Loi fédérale sur la protection des données (LPD) et au RGPD.",
  section5Text2: "Les données sont stockées exclusivement sur des serveurs en Suisse (Infomaniak). Des sauvegardes quotidiennes et des snapshots réguliers sont effectués. Les données ne sont pas transmises à des tiers et ne sont pas traitées en dehors de la Suisse. La transmission est entièrement chiffrée.",
  section5Text3: "L'utilisation comprend un stockage de données raisonnable dans le cadre habituel. En cas de besoins de stockage exceptionnellement élevés, un accord individuel peut être conclu.",

  section6Title: "6. Garantie, responsabilité et support",
  section6Text1: "Le Concédant exploite le logiciel au mieux de ses connaissances et selon les normes de sécurité actuelles. La responsabilité n'est engagée qu'en cas de négligence grave ou de faute intentionnelle.",
  section6NoLiability: "Aucune responsabilité notamment pour :",
  section6Bullets: [
    "Mauvaise utilisation par le client",
    "Pannes dues à un cas de force majeure",
    "Attaques externes malgré les mesures de protection",
    "Dommages indirects ou consécutifs",
  ],
  section6Support: "Le support est assuré exclusivement par e-mail à info@techassist.ch. Il n'existe aucun droit à un support téléphonique ou en direct.",

  section7Title: "7. Confidentialité",
  section7Text: "Les deux parties s'engagent à garder confidentielles les informations de l'autre partie et à ne pas les divulguer à des tiers.",

  section8Title: "8. Dispositions finales",
  section8Text: "Le droit suisse est applicable. Le for juridique est Zurich. Ce contrat a été établi en deux exemplaires et signé par les deux parties.",

  placeDateLabel: "Lieu, Date",
  licensorLabel: "Concédant",
  licenseeLabel: "Licencié",
  signatureLabel: "Signature",

  contractFooter: "DERM247 – Contrat de licence",
  exclVat: " (hors TVA)",
};

const it: PdfTexts = {
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
    "Durata minima: 12 mesi  |  Periodo di disdetta: 60 giorni  |  Fatturazione mensile anticipata",
    "Archiviazione equa  |  Upgrade possibile in qualsiasi momento  |  Con riserva di modifiche",
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
    "Multilingua: DE, EN, FR, IT, ES",
    "Supporto via e-mail  |  Backup giornalieri",
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
  section1Text: "Il Licenziante concede al Licenziatario il diritto non esclusivo e non trasferibile di utilizzare il software «DERM247» secondo le condizioni del presente contratto.",

  section2Title: "2. Ambito della licenza",
  packageLabel: "Pacchetto",
  doctorCountLabel: "Numero di medici",
  monthlyFeeLabel: "Canone mensile",

  section3Title: "3. Durata e modifiche al pacchetto",
  section3Text1: (d) => `Il contratto inizia il ${d}. La durata minima è di 12 mesi. Il periodo di disdetta è di 60 giorni prima della scadenza del contratto. In assenza di disdetta tempestiva, il contratto si rinnova automaticamente di 12 mesi.`,
  section3Text2: "Un upgrade a un pacchetto superiore o licenze aggiuntive è possibile in qualsiasi momento. Il nuovo canone si applica dal mese successivo. Un downgrade è possibile nel rispetto della durata contrattuale in corso.",

  section4Title: "4. Condizioni di pagamento",
  section4Text: "Il canone è fatturato mensilmente in anticipo ed è dovuto entro 30 giorni dalla data della fattura. In caso di ritardo nel pagamento, il Licenziante si riserva il diritto di sospendere l'accesso al software.",
  bankDetails: "Coordinate bancarie:",
  iban: "IBAN: CH66 0070 0110 0057 8304 8",
  recipient: "Beneficiario: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protezione e sicurezza dei dati",
  section5Text1: "Il Licenziante si impegna a trattare tutti i dati relativi all'uso del software in conformità con la Legge federale sulla protezione dei dati (LPD) e il RGPD.",
  section5Text2: "I dati sono archiviati esclusivamente su server in Svizzera (Infomaniak). Vengono eseguiti backup giornalieri e snapshot regolari. I dati non vengono trasmessi a terzi né elaborati al di fuori della Svizzera. La trasmissione è completamente crittografata.",
  section5Text3: "L'utilizzo comprende un'archiviazione ragionevole dei dati nell'ambito consueto. In caso di esigenze di archiviazione eccezionalmente elevate, è possibile concordare un accordo individuale.",

  section6Title: "6. Garanzia, responsabilità e supporto",
  section6Text1: "Il Licenziante gestisce il software al meglio delle sue conoscenze e secondo gli standard di sicurezza attuali. La responsabilità sussiste solo in caso di negligenza grave o dolo.",
  section6NoLiability: "Nessuna responsabilità in particolare per:",
  section6Bullets: [
    "Uso improprio da parte del cliente",
    "Interruzioni dovute a forza maggiore",
    "Attacchi esterni nonostante le misure di protezione",
    "Danni indiretti o consequenziali",
  ],
  section6Support: "Il supporto è fornito esclusivamente via e-mail all'indirizzo info@techassist.ch. Non sussiste alcun diritto al supporto telefonico o dal vivo.",

  section7Title: "7. Riservatezza",
  section7Text: "Entrambe le parti si impegnano a mantenere riservate le informazioni confidenziali dell'altra parte e a non divulgarle a terzi.",

  section8Title: "8. Disposizioni finali",
  section8Text: "Si applica il diritto svizzero. Il foro competente è Zurigo. Il presente contratto è stato redatto in due esemplari e firmato da entrambe le parti.",

  placeDateLabel: "Luogo, Data",
  licensorLabel: "Licenziante",
  licenseeLabel: "Licenziatario",
  signatureLabel: "Firma",

  contractFooter: "DERM247 – Contratto di licenza",
  exclVat: " (IVA esclusa)",
};

const es: PdfTexts = {
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
    "Duración mínima: 12 meses  |  Plazo de preaviso: 60 días  |  Facturación mensual anticipada",
    "Almacenamiento justo  |  Actualización posible en cualquier momento  |  Sujeto a cambios",
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
    "Multilingüe: DE, EN, FR, IT, ES",
    "Soporte por correo electrónico  |  Copias de seguridad diarias",
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
  section1Text: "El Licenciante otorga al Licenciatario el derecho no exclusivo e intransferible de utilizar el software «DERM247» de acuerdo con las condiciones de este contrato.",

  section2Title: "2. Alcance de la licencia",
  packageLabel: "Paquete",
  doctorCountLabel: "Número de médicos",
  monthlyFeeLabel: "Tarifa mensual de licencia",

  section3Title: "3. Duración y cambios de paquete",
  section3Text1: (d) => `El contrato comienza el ${d}. La duración mínima es de 12 meses. El plazo de preaviso es de 60 días antes del vencimiento del contrato. Si no se notifica a tiempo, el contrato se renueva automáticamente por 12 meses.`,
  section3Text2: "Un upgrade a un paquete superior o licencias adicionales es posible en cualquier momento. La nueva tarifa se aplica desde el mes siguiente. Un downgrade es posible respetando la duración contractual vigente.",

  section4Title: "4. Condiciones de pago",
  section4Text: "La tarifa se factura mensualmente por adelantado y es pagadera dentro de los 30 días posteriores a la fecha de factura. En caso de retraso en el pago, el Licenciante se reserva el derecho de suspender el acceso al software.",
  bankDetails: "Datos bancarios:",
  iban: "IBAN: CH66 0070 0110 0057 8304 8",
  recipient: "Beneficiario: Rached Mtiraoui (TechAssist)",

  section5Title: "5. Protección y seguridad de datos",
  section5Text1: "El Licenciante se compromete a tratar todos los datos relacionados con el uso del software de acuerdo con la Ley Federal de Protección de Datos (LPD) y el RGPD.",
  section5Text2: "Los datos se almacenan exclusivamente en servidores en Suiza (Infomaniak). Se realizan copias de seguridad diarias y snapshots regulares. Los datos no se comparten con terceros ni se procesan fuera de Suiza. La transmisión está completamente cifrada.",
  section5Text3: "El uso incluye un almacenamiento razonable de datos en el marco habitual. En caso de necesidades de almacenamiento excepcionalmente altas, se puede acordar un acuerdo individual.",

  section6Title: "6. Garantía, responsabilidad y soporte",
  section6Text1: "El Licenciante opera el software con los mejores conocimientos y estándares de seguridad actuales. La responsabilidad existe solo en caso de negligencia grave o intención.",
  section6NoLiability: "No existe responsabilidad en particular por:",
  section6Bullets: [
    "Uso indebido por parte del cliente",
    "Interrupciones por fuerza mayor",
    "Ataques externos a pesar de las medidas de protección",
    "Daños indirectos o consecuentes",
  ],
  section6Support: "El soporte se proporciona exclusivamente por correo electrónico a info@techassist.ch. No existe derecho a soporte telefónico o en vivo.",

  section7Title: "7. Confidencialidad",
  section7Text: "Ambas partes se comprometen a mantener confidencial la información de la otra parte y a no revelarla a terceros.",

  section8Title: "8. Disposiciones finales",
  section8Text: "Se aplica el derecho suizo. El lugar de jurisdicción es Zúrich. Este contrato ha sido redactado en dos ejemplares y firmado por ambas partes.",

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
