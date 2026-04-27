import { de, enUS, fr, it, es } from "date-fns/locale";
import type { Locale } from "date-fns";

export type InvoiceLanguage = "de" | "en" | "fr" | "it" | "es";

export const INVOICE_LANGUAGES: { code: InvoiceLanguage; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
];

export const DATE_LOCALES: Record<InvoiceLanguage, Locale> = {
  de, en: enUS, fr, it, es,
};

export const NUMBER_LOCALES: Record<InvoiceLanguage, string> = {
  de: "de-CH",
  en: "en-CH",
  fr: "fr-CH",
  it: "it-CH",
  es: "es-ES",
};

interface InvoiceStrings {
  // Meta
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  contractNumber: string;
  // Titles
  invoiceTitle: string;
  reminderTitle: (level: number) => string; // "1. Mahnung" / "1st Reminder"
  paid: string;
  cancelled: string;
  paidStamp: string;
  paidOn: string;
  // Table
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  licenseDescription: (pkg?: string, contract?: string) => string;
  subtotal: string;
  vatLine: string;
  total: string;
  // Payment box
  paymentInfo: string;
  scanQr: string;
  recipient: string;
  bank: string;
  iban: string;
  reference: string;
  payableUntil: string;
  // Notes
  notesLabel: string;
  // Reminder banner / message (added when dunning_level > 0)
  reminderBanner: (level: number, dueDate: string) => string;
  // Footer
  ownerLabel: string;
  // Filename
  filenameInvoice: (n: string) => string;
  filenameReminder: (level: number, n: string) => string;
}

export const INVOICE_STRINGS: Record<InvoiceLanguage, InvoiceStrings> = {
  de: {
    invoiceNumber: "Rechnungsnr.:",
    invoiceDate: "Rechnungsdatum:",
    dueDate: "Fälligkeitsdatum:",
    contractNumber: "Vertragsnr.:",
    invoiceTitle: "RECHNUNG",
    reminderTitle: (l) => `${l}. MAHNUNG`,
    paid: "BEZAHLT",
    cancelled: "STORNIERT",
    paidStamp: "BEZAHLT",
    paidOn: "am",
    description: "Beschreibung",
    quantity: "Menge",
    unitPrice: "Einzelpreis",
    amount: "Betrag",
    licenseDescription: (pkg, contract) => {
      const p = pkg ? ` – ${pkg}` : "";
      return contract
        ? `DERM247 Softwarelizenz${p} (Vertrag ${contract})`
        : `DERM247 Softwarelizenz${p}`;
    },
    subtotal: "Zwischensumme",
    vatLine: "MwSt. (0% – von der Steuer befreit)",
    total: "Gesamtbetrag",
    paymentInfo: "Zahlungsinformationen",
    scanQr: "QR-Code scannen",
    recipient: "Empfänger:",
    bank: "Bank:",
    iban: "IBAN:",
    reference: "Referenz:",
    payableUntil: "Zahlbar bis:",
    notesLabel: "Bemerkungen:",
    reminderBanner: (l, d) =>
      l === 1
        ? `Diese Rechnung war am ${d} fällig und ist noch offen. Bitte begleichen Sie den Betrag innert 10 Tagen.`
        : l === 2
        ? `Trotz unserer ersten Mahnung ist diese Rechnung weiterhin offen. Bitte überweisen Sie den Betrag umgehend, spätestens innert 7 Tagen.`
        : `LETZTE MAHNUNG: Bei Nichtzahlung innert 5 Tagen wird Ihr Konto gesperrt und der Vorgang an unser Inkassobüro übergeben.`,
    ownerLabel: "Inhaber:",
    filenameInvoice: (n) => `Rechnung_${n}.pdf`,
    filenameReminder: (l, n) => `Mahnung_${l}_Stufe_${n}.pdf`,
  },
  en: {
    invoiceNumber: "Invoice No.:",
    invoiceDate: "Invoice Date:",
    dueDate: "Due Date:",
    contractNumber: "Contract No.:",
    invoiceTitle: "INVOICE",
    reminderTitle: (l) => `${l}${l === 1 ? "ST" : l === 2 ? "ND" : "RD"} REMINDER`,
    paid: "PAID",
    cancelled: "CANCELLED",
    paidStamp: "PAID",
    paidOn: "on",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit Price",
    amount: "Amount",
    licenseDescription: (pkg, contract) => {
      const p = pkg ? ` – ${pkg}` : "";
      return contract
        ? `DERM247 Software License${p} (Contract ${contract})`
        : `DERM247 Software License${p}`;
    },
    subtotal: "Subtotal",
    vatLine: "VAT (0% – tax exempt)",
    total: "Total",
    paymentInfo: "Payment Information",
    scanQr: "Scan QR code",
    recipient: "Recipient:",
    bank: "Bank:",
    iban: "IBAN:",
    reference: "Reference:",
    payableUntil: "Payable by:",
    notesLabel: "Notes:",
    reminderBanner: (l, d) =>
      l === 1
        ? `This invoice was due on ${d} and remains unpaid. Please settle the amount within 10 days.`
        : l === 2
        ? `Despite our first reminder, this invoice is still unpaid. Please transfer the amount immediately, within 7 days at the latest.`
        : `FINAL NOTICE: If payment is not received within 5 days, your account will be suspended and the case forwarded to our collection agency.`,
    ownerLabel: "Owner:",
    filenameInvoice: (n) => `Invoice_${n}.pdf`,
    filenameReminder: (l, n) => `Reminder_${l}_${n}.pdf`,
  },
  fr: {
    invoiceNumber: "N° de facture :",
    invoiceDate: "Date de facture :",
    dueDate: "Date d'échéance :",
    contractNumber: "N° de contrat :",
    invoiceTitle: "FACTURE",
    reminderTitle: (l) => `${l}${l === 1 ? "RE" : "E"} RAPPEL`,
    paid: "PAYÉ",
    cancelled: "ANNULÉ",
    paidStamp: "PAYÉ",
    paidOn: "le",
    description: "Description",
    quantity: "Qté",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    licenseDescription: (pkg, contract) => {
      const p = pkg ? ` – ${pkg}` : "";
      return contract
        ? `Licence logicielle DERM247${p} (Contrat ${contract})`
        : `Licence logicielle DERM247${p}`;
    },
    subtotal: "Sous-total",
    vatLine: "TVA (0% – exonéré)",
    total: "Total",
    paymentInfo: "Informations de paiement",
    scanQr: "Scanner le QR code",
    recipient: "Bénéficiaire :",
    bank: "Banque :",
    iban: "IBAN :",
    reference: "Référence :",
    payableUntil: "Payable jusqu'au :",
    notesLabel: "Remarques :",
    reminderBanner: (l, d) =>
      l === 1
        ? `Cette facture était échue le ${d} et reste impayée. Merci de régler le montant dans un délai de 10 jours.`
        : l === 2
        ? `Malgré notre premier rappel, cette facture reste impayée. Veuillez effectuer le virement immédiatement, au plus tard dans 7 jours.`
        : `DERNIER RAPPEL : À défaut de paiement dans 5 jours, votre compte sera suspendu et le dossier transmis à notre agence de recouvrement.`,
    ownerLabel: "Propriétaire :",
    filenameInvoice: (n) => `Facture_${n}.pdf`,
    filenameReminder: (l, n) => `Rappel_${l}_${n}.pdf`,
  },
  it: {
    invoiceNumber: "N. fattura:",
    invoiceDate: "Data fattura:",
    dueDate: "Data di scadenza:",
    contractNumber: "N. contratto:",
    invoiceTitle: "FATTURA",
    reminderTitle: (l) => `${l}° SOLLECITO`,
    paid: "PAGATO",
    cancelled: "ANNULLATO",
    paidStamp: "PAGATO",
    paidOn: "il",
    description: "Descrizione",
    quantity: "Qtà",
    unitPrice: "Prezzo unitario",
    amount: "Importo",
    licenseDescription: (pkg, contract) => {
      const p = pkg ? ` – ${pkg}` : "";
      return contract
        ? `Licenza software DERM247${p} (Contratto ${contract})`
        : `Licenza software DERM247${p}`;
    },
    subtotal: "Subtotale",
    vatLine: "IVA (0% – esente)",
    total: "Totale",
    paymentInfo: "Informazioni di pagamento",
    scanQr: "Scansiona il codice QR",
    recipient: "Beneficiario:",
    bank: "Banca:",
    iban: "IBAN:",
    reference: "Riferimento:",
    payableUntil: "Pagabile entro:",
    notesLabel: "Note:",
    reminderBanner: (l, d) =>
      l === 1
        ? `Questa fattura era scaduta il ${d} ed è ancora insoluta. La preghiamo di saldare l'importo entro 10 giorni.`
        : l === 2
        ? `Nonostante il nostro primo sollecito, questa fattura è ancora insoluta. La preghiamo di effettuare il bonifico immediatamente, al più tardi entro 7 giorni.`
        : `ULTIMO SOLLECITO: In caso di mancato pagamento entro 5 giorni, il suo account verrà sospeso e la pratica trasmessa al nostro ufficio recupero crediti.`,
    ownerLabel: "Titolare:",
    filenameInvoice: (n) => `Fattura_${n}.pdf`,
    filenameReminder: (l, n) => `Sollecito_${l}_${n}.pdf`,
  },
  es: {
    invoiceNumber: "N.º de factura:",
    invoiceDate: "Fecha de factura:",
    dueDate: "Fecha de vencimiento:",
    contractNumber: "N.º de contrato:",
    invoiceTitle: "FACTURA",
    reminderTitle: (l) => `${l}.ª RECLAMACIÓN`,
    paid: "PAGADO",
    cancelled: "ANULADO",
    paidStamp: "PAGADO",
    paidOn: "el",
    description: "Descripción",
    quantity: "Cant.",
    unitPrice: "Precio unitario",
    amount: "Importe",
    licenseDescription: (pkg, contract) => {
      const p = pkg ? ` – ${pkg}` : "";
      return contract
        ? `Licencia de software DERM247${p} (Contrato ${contract})`
        : `Licencia de software DERM247${p}`;
    },
    subtotal: "Subtotal",
    vatLine: "IVA (0% – exento)",
    total: "Total",
    paymentInfo: "Información de pago",
    scanQr: "Escanear código QR",
    recipient: "Beneficiario:",
    bank: "Banco:",
    iban: "IBAN:",
    reference: "Referencia:",
    payableUntil: "Pagar hasta:",
    notesLabel: "Observaciones:",
    reminderBanner: (l, d) =>
      l === 1
        ? `Esta factura venció el ${d} y sigue impagada. Por favor liquide el importe en un plazo de 10 días.`
        : l === 2
        ? `A pesar de nuestra primera reclamación, esta factura sigue impagada. Realice la transferencia de inmediato, a más tardar en 7 días.`
        : `ÚLTIMO AVISO: Si no se recibe el pago en 5 días, su cuenta será suspendida y el caso transferido a nuestra agencia de cobros.`,
    ownerLabel: "Titular:",
    filenameInvoice: (n) => `Factura_${n}.pdf`,
    filenameReminder: (l, n) => `Reclamacion_${l}_${n}.pdf`,
  },
};
