export type TxType = "income" | "expense" | "transfer";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string; // "purple" | "pink" | "green" | hex
  type: CategoryType;
  builtIn: boolean;
  order: number;
  archived?: boolean;
}

export type RecurFreq = "weekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: string;
  type: "income" | "expense";
  amount: number; // EUR
  sectionId: string;
  categoryId: string;
  note?: string;
  frequency: RecurFreq;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate?: string;
  paused: boolean;
  lastGeneratedDate?: string; // last date for which we created a tx
  createdAt: string;
}

export type BillRepeat = "once" | "monthly" | "bimonthly" | "yearly";

export interface Bill {
  id: string;
  name: string;
  amount?: number; // EUR
  sectionId?: string;
  dueDate: string; // ISO date YYYY-MM-DD
  repeat: BillRepeat;
  archived: boolean;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  color: "purple" | "green" | "pink";
  target?: number;
  balance: number;
  createdAt: string;
}

export interface ReceiptItem {
  name: string;
  price: number; // EUR
  qty?: number;
}

export interface ReceiptMeta {
  store: string;
  items: ReceiptItem[];
  scannedAt: string;
  imageUri?: string; // optional local file URI (not persisted across devices)
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string; // category id
  note?: string;
  sectionId: string;
  toSectionId?: string;
  createdAt: string;
  receipt?: ReceiptMeta;
}

export interface AppState {
  sections: Section[];
  transactions: Transaction[];
  categories: Category[];
  recurring: RecurringRule[];
  bills: Bill[];
}

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, "order">[] = [
  { id: "salary", name: "Stipendio", icon: "briefcase", color: "green", type: "income", builtIn: true },
  { id: "freelance", name: "Freelance", icon: "edit-3", color: "green", type: "income", builtIn: true },
  { id: "gift", name: "Regalo", icon: "gift", color: "purple", type: "income", builtIn: true },
  { id: "investment", name: "Investimento", icon: "trending-up", color: "green", type: "income", builtIn: true },
  { id: "other-in", name: "Altro", icon: "plus-circle", color: "purple", type: "income", builtIn: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, "order">[] = [
  { id: "food", name: "Cibo", icon: "coffee", color: "pink", type: "expense", builtIn: true },
  { id: "transport", name: "Trasporti", icon: "truck", color: "pink", type: "expense", builtIn: true },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "purple", type: "expense", builtIn: true },
  { id: "bills", name: "Bollette", icon: "file-text", color: "pink", type: "expense", builtIn: true },
  { id: "health", name: "Salute", icon: "heart", color: "pink", type: "expense", builtIn: true },
  { id: "fun", name: "Svago", icon: "music", color: "purple", type: "expense", builtIn: true },
  { id: "home", name: "Casa", icon: "home", color: "purple", type: "expense", builtIn: true },
  { id: "other-out", name: "Altro", icon: "more-horizontal", color: "pink", type: "expense", builtIn: true },
];

export function seedCategories(): Category[] {
  const out: Category[] = [];
  DEFAULT_INCOME_CATEGORIES.forEach((c, i) => out.push({ ...c, order: i }));
  DEFAULT_EXPENSE_CATEGORIES.forEach((c, i) => out.push({ ...c, order: i }));
  return out;
}

// Legacy fallback (used when category id was removed/archived & not found)
const LEGACY_LABELS: Record<string, string> = {
  salary: "Stipendio",
  freelance: "Freelance",
  gift: "Regalo",
  investment: "Investimento",
  "other-in": "Altro",
  food: "Cibo",
  transport: "Trasporti",
  shopping: "Shopping",
  bills: "Bollette",
  health: "Salute",
  fun: "Svago",
  home: "Casa",
  "other-out": "Altro",
  transfer: "Trasferimento",
};

const LEGACY_ICONS: Record<string, string> = {
  salary: "briefcase",
  freelance: "edit-3",
  gift: "gift",
  investment: "trending-up",
  "other-in": "plus-circle",
  food: "coffee",
  transport: "truck",
  shopping: "shopping-bag",
  bills: "file-text",
  health: "heart",
  fun: "music",
  home: "home",
  "other-out": "more-horizontal",
  transfer: "repeat",
};

export function resolveCategory(
  id: string,
  categories: Category[] | undefined,
): { name: string; icon: string; archived: boolean } {
  const match = categories?.find((c) => c.id === id);
  if (match) {
    return {
      name: match.name + (match.archived ? " (archiviata)" : ""),
      icon: match.icon,
      archived: !!match.archived,
    };
  }
  return {
    name: (LEGACY_LABELS[id] ?? id) + " (archiviata)",
    icon: LEGACY_ICONS[id] ?? "circle",
    archived: true,
  };
}
