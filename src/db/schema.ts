import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  numeric,
  timestamp,
  integer,
  text,
  date,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

/**
 * PostgreSQL Schema: nexus_fnb
 * Master schema for Nexus FnB Business Management System (Malaysia Edition)
 */
export const nexusSchema = pgSchema("nexus_fnb");

// ============================================================================
// 1. Outlets & Formatting Profile
// ============================================================================
export const outlets = nexusSchema.table(
  "outlets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    outletType: varchar("outlet_type", { length: 8 }).notNull(), // 'FSR' | 'QSR'
    sstRegistrationNumber: varchar("sst_registration_number", { length: 32 }),
    isSstEnabled: boolean("is_sst_enabled").default(true),
    serviceChargePercent: numeric("service_charge_percent", { precision: 5, scale: 2 }).default("10.00"),
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    state: varchar("state", { length: 64 }).notNull(),
    postcode: varchar("postcode", { length: 10 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_outlets_code").on(table.code),
    index("idx_outlets_type").on(table.outletType),
    check("chk_outlets_type", sql`${table.outletType} IN ('FSR', 'QSR')`),
  ]
);

// ============================================================================
// 2. Halal-Certified Raw Ingredients
// ============================================================================
export const ingredients = nexusSchema.table(
  "ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: varchar("sku", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    uom: varchar("uom", { length: 16 }).notNull(), // 'KG', 'GRAM', 'LITER', 'ML', 'UNIT'
    currentCostPerUnit: numeric("current_cost_per_unit", { precision: 10, scale: 4 }).notNull(),
    supplierName: varchar("supplier_name", { length: 128 }).notNull(),
    isHalalCertified: boolean("is_halal_certified").default(true),
    halalCertBody: varchar("halal_cert_body", { length: 64 }), // 'JAKIM', 'MUIS', 'CICOT', etc.
    halalCertNumber: varchar("halal_cert_number", { length: 64 }),
    halalCertExpiry: date("halal_cert_expiry"),
    shelfLifeDays: integer("shelf_life_days").default(7),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ingredients_sku").on(table.sku),
    index("idx_ingredients_halal_expiry").on(table.halalCertExpiry),
    index("idx_ingredients_supplier").on(table.supplierName),
    check("chk_ingredients_cost", sql`${table.currentCostPerUnit} >= 0`),
    check("chk_ingredients_uom", sql`${table.uom} IN ('KG', 'GRAM', 'LITER', 'ML', 'UNIT', 'g', 'ml', 'unit', 'portion')`),
  ]
);

// ============================================================================
// 3. Menu Items
// ============================================================================
export const menuItems = nexusSchema.table(
  "menu_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: varchar("sku", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(), // 'MAINS', 'BEVERAGES', 'SIDES', 'DESSERT'
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    kitchenStation: varchar("kitchen_station", { length: 32 }).notNull(), // 'HOT_KITCHEN', 'DRINK_BAR', 'COLD_PREP'
    isActive: boolean("is_active").default(true),
    packagingFee: numeric("packaging_fee", { precision: 5, scale: 2 }).default("0.00"),
  },
  (table) => [
    index("idx_menu_items_sku").on(table.sku),
    index("idx_menu_items_category").on(table.category),
    index("idx_menu_items_station").on(table.kitchenStation),
    index("idx_menu_items_active").on(table.isActive),
    check("chk_menu_items_price", sql`${table.basePrice} >= 0`),
    check("chk_menu_items_packaging_fee", sql`${table.packagingFee} >= 0`),
  ]
);

// ============================================================================
// 4. Recipe Bill of Materials (BOM)
// ============================================================================
export const recipeBom = nexusSchema.table(
  "recipe_bom",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantityRequired: numeric("quantity_required", { precision: 10, scale: 4 }).notNull(),
    wastageAllowancePercent: numeric("wastage_allowance_percent", { precision: 5, scale: 2 }).default("5.00"),
  },
  (table) => [
    index("idx_recipe_bom_menu_item").on(table.menuItemId),
    index("idx_recipe_bom_ingredient").on(table.ingredientId),
    unique("uq_recipe_bom_item_ingredient").on(table.menuItemId, table.ingredientId),
    check("chk_recipe_bom_qty", sql`${table.quantityRequired} > 0`),
    check("chk_recipe_bom_wastage", sql`${table.wastageAllowancePercent} >= 0`),
  ]
);

// ============================================================================
// 5. Floor & Dining Tables (FSR Only)
// ============================================================================
export const diningTables = nexusSchema.table(
  "dining_tables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    tableNumber: varchar("table_number", { length: 16 }).notNull(),
    section: varchar("section", { length: 32 }).default("MAIN_DINING"), // 'INDOOR', 'OUTDOOR', 'VIP', 'BAR'
    capacity: integer("capacity").default(4),
    status: varchar("status", { length: 16 }).default("VACANT").notNull(), // 'VACANT', 'SEATED', 'ORDERED', 'SERVED', 'BILL_OUT'
    activeOrderId: uuid("active_order_id"),
  },
  (table) => [
    index("idx_dining_tables_outlet").on(table.outletId),
    index("idx_dining_tables_status").on(table.status),
    index("idx_dining_tables_outlet_status").on(table.outletId, table.status),
    unique("uq_dining_tables_outlet_number").on(table.outletId, table.tableNumber),
    check(
      "chk_dining_tables_status",
      sql`${table.status} IN ('VACANT', 'SEATED', 'ORDERED', 'SERVED', 'BILL_OUT')`
    ),
    check("chk_dining_tables_capacity", sql`${table.capacity} > 0`),
  ]
);

// ============================================================================
// 6. Orders & Financial Transactions
// ============================================================================
export const orders = nexusSchema.table(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "restrict" }),
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(), // e.g. 'FSR-20261109-0042'
    queueToken: integer("queue_token"), // 101, 102 for QSR
    tableId: uuid("table_id").references(() => diningTables.id, { onDelete: "set null" }),
    orderMode: varchar("order_mode", { length: 16 }).notNull(), // 'DINE_IN', 'TAKEAWAY', 'DELIVERY'

    subtotalGross: numeric("subtotal_gross", { precision: 10, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 10, scale: 2 }).default("0.00"),
    serviceChargeAmount: numeric("service_charge_amount", { precision: 10, scale: 2 }).default("0.00"),
    sstAmount: numeric("sst_amount", { precision: 10, scale: 2 }).default("0.00"), // 6%
    roundingAdjustment: numeric("rounding_adjustment", { precision: 5, scale: 2 }).default("0.00"), // BNM 5-sen rule
    totalPayable: numeric("total_payable", { precision: 10, scale: 2 }).notNull(),

    paymentMethod: varchar("payment_method", { length: 24 }), // 'CASH', 'DUITNOW', 'CARD', 'TNG'
    paymentStatus: varchar("payment_status", { length: 16 }).default("PENDING").notNull(), // 'PENDING', 'PAID', 'VOIDED', 'REFUNDED'

    lhdnStatus: varchar("lhdn_status", { length: 16 }).default("PENDING").notNull(), // 'PENDING', 'VALIDATED', 'CONSOLIDATED', 'EXEMPT'
    lhdnUuid: varchar("lhdn_uuid", { length: 64 }),
    lhdnValidationUrl: text("lhdn_validation_url"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_orders_outlet").on(table.outletId),
    index("idx_orders_number").on(table.orderNumber),
    index("idx_orders_table").on(table.tableId),
    index("idx_orders_created_at").on(table.createdAt),
    index("idx_orders_lhdn_status").on(table.lhdnStatus),
    index("idx_orders_payment_status").on(table.paymentStatus),
    index("idx_orders_outlet_created").on(table.outletId, table.createdAt),
    check("chk_orders_mode", sql`${table.orderMode} IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')`),
    check(
      "chk_orders_payment_status",
      sql`${table.paymentStatus} IN ('PENDING', 'PAID', 'VOIDED', 'REFUNDED')`
    ),
    check(
      "chk_orders_lhdn_status",
      sql`${table.lhdnStatus} IN ('PENDING', 'VALIDATED', 'CONSOLIDATED', 'EXEMPT')`
    ),
  ]
);

// ============================================================================
// 7. Shift Management (X/Z Reports)
// ============================================================================
export const shifts = nexusSchema.table(
  "shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "restrict" }),
    cashierId: uuid("cashier_id").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    openingFloat: numeric("opening_float", { precision: 10, scale: 2 }).notNull(),
    expectedCashEnd: numeric("expected_cash_end", { precision: 10, scale: 2 }),
    actualCashEnd: numeric("actual_cash_end", { precision: 10, scale: 2 }),
    cashVariance: numeric("cash_variance", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 16 }).default("OPEN").notNull(), // 'OPEN', 'CLOSED'
  },
  (table) => [
    index("idx_shifts_outlet").on(table.outletId),
    index("idx_shifts_cashier").on(table.cashierId),
    index("idx_shifts_status").on(table.status),
    index("idx_shifts_opened_at").on(table.openedAt),
    index("idx_shifts_outlet_status").on(table.outletId, table.status),
    check("chk_shifts_status", sql`${table.status} IN ('OPEN', 'CLOSED')`),
    check("chk_shifts_opening_float", sql`${table.openingFloat} >= 0`),
  ]
);

// ============================================================================
// Drizzle Relations
// ============================================================================
export const outletsRelations = relations(outlets, ({ many }) => ({
  diningTables: many(diningTables),
  orders: many(orders),
  shifts: many(shifts),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeBoms: many(recipeBom),
}));

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  recipeBoms: many(recipeBom),
}));

export const recipeBomRelations = relations(recipeBom, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [recipeBom.menuItemId],
    references: [menuItems.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeBom.ingredientId],
    references: [ingredients.id],
  }),
}));

export const diningTablesRelations = relations(diningTables, ({ one, many }) => ({
  outlet: one(outlets, {
    fields: [diningTables.outletId],
    references: [outlets.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  outlet: one(outlets, {
    fields: [orders.outletId],
    references: [outlets.id],
  }),
  table: one(diningTables, {
    fields: [orders.tableId],
    references: [diningTables.id],
  }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  outlet: one(outlets, {
    fields: [shifts.outletId],
    references: [outlets.id],
  }),
}));
