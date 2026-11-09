CREATE SCHEMA "nexus_fnb";
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."dining_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outlet_id" uuid NOT NULL,
	"table_number" varchar(16) NOT NULL,
	"section" varchar(32) DEFAULT 'MAIN_DINING',
	"capacity" integer DEFAULT 4,
	"status" varchar(16) DEFAULT 'VACANT' NOT NULL,
	"active_order_id" uuid,
	CONSTRAINT "uq_dining_tables_outlet_number" UNIQUE("outlet_id","table_number"),
	CONSTRAINT "chk_dining_tables_status" CHECK ("nexus_fnb"."dining_tables"."status" IN ('VACANT', 'SEATED', 'ORDERED', 'SERVED', 'BILL_OUT')),
	CONSTRAINT "chk_dining_tables_capacity" CHECK ("nexus_fnb"."dining_tables"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"uom" varchar(16) NOT NULL,
	"current_cost_per_unit" numeric(10, 4) NOT NULL,
	"supplier_name" varchar(128) NOT NULL,
	"is_halal_certified" boolean DEFAULT true,
	"halal_cert_body" varchar(64),
	"halal_cert_number" varchar(64),
	"halal_cert_expiry" date,
	"shelf_life_days" integer DEFAULT 7,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ingredients_sku_unique" UNIQUE("sku"),
	CONSTRAINT "chk_ingredients_cost" CHECK ("nexus_fnb"."ingredients"."current_cost_per_unit" >= 0),
	CONSTRAINT "chk_ingredients_uom" CHECK ("nexus_fnb"."ingredients"."uom" IN ('KG', 'GRAM', 'LITER', 'ML', 'UNIT', 'g', 'ml', 'unit', 'portion'))
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"category" varchar(64) NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"kitchen_station" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true,
	"packaging_fee" numeric(5, 2) DEFAULT '0.00',
	CONSTRAINT "menu_items_sku_unique" UNIQUE("sku"),
	CONSTRAINT "chk_menu_items_price" CHECK ("nexus_fnb"."menu_items"."base_price" >= 0),
	CONSTRAINT "chk_menu_items_packaging_fee" CHECK ("nexus_fnb"."menu_items"."packaging_fee" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outlet_id" uuid NOT NULL,
	"order_number" varchar(32) NOT NULL,
	"queue_token" integer,
	"table_id" uuid,
	"order_mode" varchar(16) NOT NULL,
	"subtotal_gross" numeric(10, 2) NOT NULL,
	"discount_total" numeric(10, 2) DEFAULT '0.00',
	"service_charge_amount" numeric(10, 2) DEFAULT '0.00',
	"sst_amount" numeric(10, 2) DEFAULT '0.00',
	"rounding_adjustment" numeric(5, 2) DEFAULT '0.00',
	"total_payable" numeric(10, 2) NOT NULL,
	"payment_method" varchar(24),
	"payment_status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"lhdn_status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"lhdn_uuid" varchar(64),
	"lhdn_validation_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"closed_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "chk_orders_mode" CHECK ("nexus_fnb"."orders"."order_mode" IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')),
	CONSTRAINT "chk_orders_payment_status" CHECK ("nexus_fnb"."orders"."payment_status" IN ('PENDING', 'PAID', 'VOIDED', 'REFUNDED')),
	CONSTRAINT "chk_orders_lhdn_status" CHECK ("nexus_fnb"."orders"."lhdn_status" IN ('PENDING', 'VALIDATED', 'CONSOLIDATED', 'EXEMPT'))
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."outlets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(128) NOT NULL,
	"outlet_type" varchar(8) NOT NULL,
	"sst_registration_number" varchar(32),
	"is_sst_enabled" boolean DEFAULT true,
	"service_charge_percent" numeric(5, 2) DEFAULT '10.00',
	"address_line1" varchar(255) NOT NULL,
	"state" varchar(64) NOT NULL,
	"postcode" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "outlets_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_outlets_type" CHECK ("nexus_fnb"."outlets"."outlet_type" IN ('FSR', 'QSR'))
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."recipe_bom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity_required" numeric(10, 4) NOT NULL,
	"wastage_allowance_percent" numeric(5, 2) DEFAULT '5.00',
	CONSTRAINT "uq_recipe_bom_item_ingredient" UNIQUE("menu_item_id","ingredient_id"),
	CONSTRAINT "chk_recipe_bom_qty" CHECK ("nexus_fnb"."recipe_bom"."quantity_required" > 0),
	CONSTRAINT "chk_recipe_bom_wastage" CHECK ("nexus_fnb"."recipe_bom"."wastage_allowance_percent" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nexus_fnb"."shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outlet_id" uuid NOT NULL,
	"cashier_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now(),
	"closed_at" timestamp with time zone,
	"opening_float" numeric(10, 2) NOT NULL,
	"expected_cash_end" numeric(10, 2),
	"actual_cash_end" numeric(10, 2),
	"cash_variance" numeric(10, 2),
	"status" varchar(16) DEFAULT 'OPEN' NOT NULL,
	CONSTRAINT "chk_shifts_status" CHECK ("nexus_fnb"."shifts"."status" IN ('OPEN', 'CLOSED')),
	CONSTRAINT "chk_shifts_opening_float" CHECK ("nexus_fnb"."shifts"."opening_float" >= 0)
);
--> statement-breakpoint
ALTER TABLE "nexus_fnb"."dining_tables" ADD CONSTRAINT "dining_tables_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "nexus_fnb"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_fnb"."orders" ADD CONSTRAINT "orders_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "nexus_fnb"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_fnb"."orders" ADD CONSTRAINT "orders_table_id_dining_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "nexus_fnb"."dining_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_fnb"."recipe_bom" ADD CONSTRAINT "recipe_bom_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "nexus_fnb"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_fnb"."recipe_bom" ADD CONSTRAINT "recipe_bom_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "nexus_fnb"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_fnb"."shifts" ADD CONSTRAINT "shifts_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "nexus_fnb"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dining_tables_outlet" ON "nexus_fnb"."dining_tables" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_dining_tables_status" ON "nexus_fnb"."dining_tables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dining_tables_outlet_status" ON "nexus_fnb"."dining_tables" USING btree ("outlet_id","status");--> statement-breakpoint
CREATE INDEX "idx_ingredients_sku" ON "nexus_fnb"."ingredients" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_ingredients_halal_expiry" ON "nexus_fnb"."ingredients" USING btree ("halal_cert_expiry");--> statement-breakpoint
CREATE INDEX "idx_ingredients_supplier" ON "nexus_fnb"."ingredients" USING btree ("supplier_name");--> statement-breakpoint
CREATE INDEX "idx_menu_items_sku" ON "nexus_fnb"."menu_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_menu_items_category" ON "nexus_fnb"."menu_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_menu_items_station" ON "nexus_fnb"."menu_items" USING btree ("kitchen_station");--> statement-breakpoint
CREATE INDEX "idx_menu_items_active" ON "nexus_fnb"."menu_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_orders_outlet" ON "nexus_fnb"."orders" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_orders_number" ON "nexus_fnb"."orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "idx_orders_table" ON "nexus_fnb"."orders" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "nexus_fnb"."orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_lhdn_status" ON "nexus_fnb"."orders" USING btree ("lhdn_status");--> statement-breakpoint
CREATE INDEX "idx_orders_payment_status" ON "nexus_fnb"."orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "idx_orders_outlet_created" ON "nexus_fnb"."orders" USING btree ("outlet_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_outlets_code" ON "nexus_fnb"."outlets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_outlets_type" ON "nexus_fnb"."outlets" USING btree ("outlet_type");--> statement-breakpoint
CREATE INDEX "idx_recipe_bom_menu_item" ON "nexus_fnb"."recipe_bom" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_bom_ingredient" ON "nexus_fnb"."recipe_bom" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_outlet" ON "nexus_fnb"."shifts" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_cashier" ON "nexus_fnb"."shifts" USING btree ("cashier_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_status" ON "nexus_fnb"."shifts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_shifts_opened_at" ON "nexus_fnb"."shifts" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "idx_shifts_outlet_status" ON "nexus_fnb"."shifts" USING btree ("outlet_id","status");