/**
 * Nexus FnB BMS - Inventory & Recipe BOM Data Contracts
 * Malaysia Edition (SSOT §3.4, §6.2, TSK-INV-01)
 */

export type StandardUOM = "KG" | "GRAM" | "LITER" | "ML" | "UNIT" | "PORTION";

export type UnitOfMeasure =
  | StandardUOM
  | "kg"
  | "g"
  | "gram"
  | "grams"
  | "l"
  | "liter"
  | "liters"
  | "ml"
  | "unit"
  | "units"
  | "portion"
  | "portions";

export type FoodCostStatus = "HEALTHY" | "ACCEPTABLE" | "WARNING" | "CRITICAL";

export interface IngredientCostProfile {
  id: string;
  sku: string;
  name: string;
  uom: UnitOfMeasure;
  currentCostPerUnit: number; // Cost in MYR per purchase UOM
  supplierName: string;
  isHalalCertified: boolean;
  halalCertBody?: string;
  halalCertNumber?: string;
  halalCertExpiry?: string;
  shelfLifeDays?: number;
}

export interface RecipeBomLineItem {
  id?: string;
  ingredientId: string;
  recipeQuantity: number;
  recipeUom: UnitOfMeasure;
  wastageAllowancePercent: number; // e.g. 5.0 for 5%
}

export interface BomLineCostDetail {
  ingredientId: string;
  ingredientName: string;
  recipeQuantity: number;
  recipeUom: StandardUOM;
  effectiveQuantity: number; // recipeQuantity * (1 + wastage / 100)
  purchaseUom: StandardUOM;
  unitCost: number; // MYR per purchase UOM
  normalizedQuantityInPurchaseUom: number;
  totalCost: number; // MYR rounded to 2 decimal places
  costSharePercent: number; // % of total recipe cost
}

export interface RecipeCostBreakdown {
  menuItemId?: string;
  menuItemName?: string;
  basePrice: number; // Menu selling price before SST/Service Charge
  totalCost: number; // Total theoretical ingredient cost in MYR
  grossMarginAmount: number; // basePrice - totalCost
  grossMarginPercentage: number; // (grossMarginAmount / basePrice) * 100
  foodCostPercentage: number; // (totalCost / basePrice) * 100
  costStatus: FoodCostStatus;
  lineItems: BomLineCostDetail[];
}

export interface BatchScaleResult {
  batchMultiplier: number;
  totalBatchCost: number;
  scaledLineItems: Array<{
    ingredientId: string;
    ingredientName: string;
    scaledRecipeQuantity: number;
    scaledEffectiveQuantity: number;
    recipeUom: StandardUOM;
    totalCost: number;
  }>;
}
