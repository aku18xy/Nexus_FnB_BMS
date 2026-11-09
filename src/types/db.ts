import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  outlets,
  ingredients,
  menuItems,
  recipeBom,
  diningTables,
  orders,
  shifts,
} from "../db/schema";

// ============================================================================
// Inferred Database Row Models (Select)
// ============================================================================
export type Outlet = InferSelectModel<typeof outlets>;
export type Ingredient = InferSelectModel<typeof ingredients>;
export type MenuItem = InferSelectModel<typeof menuItems>;
export type RecipeBom = InferSelectModel<typeof recipeBom>;
export type DiningTable = InferSelectModel<typeof diningTables>;
export type Order = InferSelectModel<typeof orders>;
export type Shift = InferSelectModel<typeof shifts>;

// ============================================================================
// Inferred Database Mutation Models (Insert)
// ============================================================================
export type NewOutlet = InferInsertModel<typeof outlets>;
export type NewIngredient = InferInsertModel<typeof ingredients>;
export type NewMenuItem = InferInsertModel<typeof menuItems>;
export type NewRecipeBom = InferInsertModel<typeof recipeBom>;
export type NewDiningTable = InferInsertModel<typeof diningTables>;
export type NewOrder = InferInsertModel<typeof orders>;
export type NewShift = InferInsertModel<typeof shifts>;

// ============================================================================
// Domain Enums and Literal Unions
// ============================================================================
export type OutletType = "FSR" | "QSR";

export type TableStatus =
  | "VACANT"
  | "SEATED"
  | "ORDERED"
  | "SERVED"
  | "BILL_OUT";

export type TableSection =
  | "MAIN_DINING"
  | "INDOOR"
  | "OUTDOOR"
  | "VIP"
  | "BAR";

export type OrderMode = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export type PaymentStatus = "PENDING" | "PAID" | "VOIDED" | "REFUNDED";

export type PaymentMethod = "CASH" | "DUITNOW" | "CARD" | "TNG";

export type LhdnStatus =
  | "PENDING"
  | "VALIDATED"
  | "CONSOLIDATED"
  | "EXEMPT";

export type ShiftStatus = "OPEN" | "CLOSED";

export type UomType =
  | "KG"
  | "GRAM"
  | "LITER"
  | "ML"
  | "UNIT"
  | "g"
  | "ml"
  | "unit"
  | "portion";

export type KitchenStation =
  | "HOT_KITCHEN"
  | "DRINK_BAR"
  | "COLD_PREP"
  | "HOT_WOK"
  | "COLD_KITCHEN"
  | "PASTRY_DESSERT"
  | "CENTRAL_KITCHEN";

export type MenuCategory =
  | "MAINS"
  | "BEVERAGES"
  | "SIDES"
  | "DESSERT"
  | "APPETIZER"
  | "NOODLES_RICE"
  | "SNACKS"
  | "SPECIALTY";

// ============================================================================
// Relational / Composite Database Models
// ============================================================================
export interface RecipeBomWithIngredient extends RecipeBom {
  ingredient: Ingredient;
}

export interface MenuItemWithBom extends MenuItem {
  bom?: RecipeBomWithIngredient[];
}

export interface DiningTableWithActiveOrder extends DiningTable {
  activeOrder?: Order | null;
}

export interface OrderWithRelations extends Order {
  outlet?: Outlet;
  table?: DiningTable | null;
}

export interface ShiftWithOutlet extends Shift {
  outlet?: Outlet;
}
