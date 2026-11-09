export type MenuCategory =
  | "APPETIZER"
  | "MAIN_COURSE"
  | "NOODLES_RICE"
  | "BEVERAGE"
  | "DESSERT"
  | "SNACKS"
  | "SPECIALTY";

export type KitchenStation =
  | "HOT_WOK"
  | "COLD_KITCHEN"
  | "DRINK_BAR"
  | "PASTRY_DESSERT"
  | "CENTRAL_KITCHEN";

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: "g" | "ml" | "unit" | "portion";
  wastagePercentage: number;
  halalCertified: boolean;
}

export interface MenuItemModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: MenuItemModifierOption[];
}

export interface MenuItem {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  nameMalay?: string;
  description?: string;
  category: MenuCategory;
  basePrice: number;
  sstApplicable: boolean;
  halalCertified: boolean;
  kitchenStation: KitchenStation;
  imageUrl?: string;
  isAvailable: boolean;
  modifierGroups?: MenuItemModifierGroup[];
  ingredients?: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
}
