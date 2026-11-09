/**
 * Nexus FnB BMS - Recipe BOM Yield & Food Costing Engine
 * Malaysia Edition (TSK-INV-01, SSOT §3.4, §6.2)
 *
 * Implements real-time theoretical food cost percentage, gross profit margins,
 * wastage allowance scaling, and Unit of Measure (UOM) conversions.
 */

import {
  StandardUOM,
  UnitOfMeasure,
  FoodCostStatus,
  IngredientCostProfile,
  RecipeBomLineItem,
  BomLineCostDetail,
  RecipeCostBreakdown,
  BatchScaleResult,
} from "./types";

/**
 * Normalizes user-entered or legacy UOM strings to standard uppercase representation
 */
export function normalizeUOM(uom: UnitOfMeasure | string): StandardUOM {
  const cleaned = uom.trim().toUpperCase();
  switch (cleaned) {
    case "KG":
    case "KILOGRAM":
    case "KILOGRAMS":
      return "KG";
    case "G":
    case "GRAM":
    case "GRAMS":
      return "GRAM";
    case "L":
    case "LITER":
    case "LITERS":
    case "LITRE":
    case "LITRES":
      return "LITER";
    case "ML":
    case "MILLILITER":
    case "MILLILITERS":
    case "MILLILITRE":
    case "MILLILITRES":
      return "ML";
    case "PORTION":
    case "PORTIONS":
      return "PORTION";
    case "UNIT":
    case "UNITS":
    case "PCS":
    case "PC":
    case "PIECE":
    case "PIECES":
    default:
      return "UNIT";
  }
}

/**
 * Converts a quantity from one Unit of Measure to another.
 * Supports mass (KG, GRAM), volume (LITER, ML), discrete (UNIT, PORTION),
 * and cross-domain mass/volume conversion with optional density (g/ml, defaults to 1.0).
 */
export function convertQuantity(
  qty: number,
  from: UnitOfMeasure,
  to: UnitOfMeasure,
  densityGPerMl = 1.0
): number {
  if (qty === 0) return 0;
  const normFrom = normalizeUOM(from);
  const normTo = normalizeUOM(to);

  if (normFrom === normTo) return qty;

  // Mass <-> Mass conversions
  if (normFrom === "GRAM" && normTo === "KG") return qty / 1000;
  if (normFrom === "KG" && normTo === "GRAM") return qty * 1000;

  // Volume <-> Volume conversions
  if (normFrom === "ML" && normTo === "LITER") return qty / 1000;
  if (normFrom === "LITER" && normTo === "ML") return qty * 1000;

  // Discrete <-> Discrete conversions
  if (
    (normFrom === "UNIT" && normTo === "PORTION") ||
    (normFrom === "PORTION" && normTo === "UNIT")
  ) {
    return qty;
  }

  // Cross-domain conversions (Mass <-> Volume via density)
  const density = Math.max(0.0001, densityGPerMl);

  // Mass -> Volume
  if (normFrom === "GRAM" && normTo === "ML") return qty / density;
  if (normFrom === "GRAM" && normTo === "LITER") return qty / density / 1000;
  if (normFrom === "KG" && normTo === "ML") return (qty * 1000) / density;
  if (normFrom === "KG" && normTo === "LITER") return (qty * 1000) / density / 1000;

  // Volume -> Mass
  if (normFrom === "ML" && normTo === "GRAM") return qty * density;
  if (normFrom === "ML" && normTo === "KG") return (qty * density) / 1000;
  if (normFrom === "LITER" && normTo === "GRAM") return qty * 1000 * density;
  if (normFrom === "LITER" && normTo === "KG") return (qty * 1000 * density) / 1000;

  // Fallback for discrete units paired with non-discrete without conversion formula
  return qty;
}

/**
 * Evaluates F&B industry food cost percentage thresholds:
 * - HEALTHY: <= 30.0%
 * - ACCEPTABLE: 30.1% to 38.0%
 * - WARNING: 38.1% to 50.0%
 * - CRITICAL: > 50.0%
 */
export function classifyFoodCostStatus(foodCostPercentage: number): FoodCostStatus {
  if (foodCostPercentage <= 30.0) return "HEALTHY";
  if (foodCostPercentage <= 38.0) return "ACCEPTABLE";
  if (foodCostPercentage <= 50.0) return "WARNING";
  return "CRITICAL";
}

/**
 * Calculates theoretical food cost, wastage allowances, gross margins, and line details
 * for a Recipe Bill of Materials against an ingredient price catalog.
 */
export function calculateRecipeCost(
  items: RecipeBomLineItem[],
  ingredientCatalog: Map<string, IngredientCostProfile> | IngredientCostProfile[],
  basePrice: number,
  menuItemName?: string
): RecipeCostBreakdown {
  // Convert catalog array to Map for O(1) lookups if needed
  const catalogMap: Map<string, IngredientCostProfile> =
    ingredientCatalog instanceof Map
      ? ingredientCatalog
      : new Map(ingredientCatalog.map((item) => [item.id, item]));

  let totalCost = 0;
  const lineDetails: Array<Omit<BomLineCostDetail, "costSharePercent">> = [];

  for (const item of items) {
    const profile = catalogMap.get(item.ingredientId);
    if (!profile) continue;

    // Effective Quantity factoring in kitchen trim and prep wastage:
    // EffectiveQty = RecipeQty * (1 + WastagePercent / 100)
    const wastagePercent = Math.max(0, item.wastageAllowancePercent || 0);
    const wastageFactor = 1 + wastagePercent / 100;
    const effectiveQty = item.recipeQuantity * wastageFactor;

    const recipeStandardUom = normalizeUOM(item.recipeUom);
    const purchaseStandardUom = normalizeUOM(profile.uom);

    // Convert effective quantity into supplier's purchase UOM
    const normalizedQtyInPurchaseUom = convertQuantity(
      effectiveQty,
      recipeStandardUom,
      purchaseStandardUom
    );

    // Line total cost in MYR, rounded to 2 decimal places
    const lineTotal =
      Math.round(normalizedQtyInPurchaseUom * profile.currentCostPerUnit * 100) / 100;

    totalCost += lineTotal;

    lineDetails.push({
      ingredientId: item.ingredientId,
      ingredientName: profile.name,
      recipeQuantity: Math.round(item.recipeQuantity * 10000) / 10000,
      recipeUom: recipeStandardUom,
      effectiveQuantity: Math.round(effectiveQty * 10000) / 10000,
      purchaseUom: purchaseStandardUom,
      unitCost: profile.currentCostPerUnit,
      normalizedQuantityInPurchaseUom:
        Math.round(normalizedQtyInPurchaseUom * 10000) / 10000,
      totalCost: lineTotal,
    });
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const safeBasePrice = Math.max(0, basePrice);

  const foodCostPercentage =
    safeBasePrice > 0 ? Math.round((totalCost / safeBasePrice) * 10000) / 100 : 0;

  const grossMarginAmount =
    safeBasePrice > 0 ? Math.round((safeBasePrice - totalCost) * 100) / 100 : 0;

  const grossMarginPercentage =
    safeBasePrice > 0
      ? Math.round((grossMarginAmount / safeBasePrice) * 10000) / 100
      : 0;

  const costStatus = classifyFoodCostStatus(foodCostPercentage);

  // Compute cost share % for each line item
  const completeLineItems: BomLineCostDetail[] = lineDetails.map((detail) => ({
    ...detail,
    costSharePercent:
      totalCost > 0 ? Math.round((detail.totalCost / totalCost) * 10000) / 100 : 0,
  }));

  return {
    menuItemName,
    basePrice: safeBasePrice,
    totalCost,
    grossMarginAmount,
    grossMarginPercentage,
    foodCostPercentage,
    costStatus,
    lineItems: completeLineItems,
  };
}

/**
 * Computes suggested menu selling price (RM) given total recipe cost and target food cost percentage
 * Example: Cost = RM 8.00, Target = 30% -> Suggested Price = RM 26.67
 */
export function calculateSuggestedSellingPrice(
  totalCost: number,
  targetFoodCostPercent: number
): number {
  if (totalCost <= 0 || targetFoodCostPercent <= 0) return 0;
  const price = totalCost / (targetFoodCostPercent / 100);
  return Math.round(price * 100) / 100;
}

/**
 * Scales recipe BOM line items for central kitchen bulk batch preparation
 * Example: Single portion recipe scaled by 50 portions
 */
export function scaleRecipeBatch(
  breakdown: RecipeCostBreakdown,
  batchMultiplier: number
): BatchScaleResult {
  const multiplier = Math.max(1, batchMultiplier);
  const totalBatchCost = Math.round(breakdown.totalCost * multiplier * 100) / 100;

  const scaledLineItems = breakdown.lineItems.map((item) => ({
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName,
    scaledRecipeQuantity: Math.round(item.recipeQuantity * multiplier * 10000) / 10000,
    scaledEffectiveQuantity:
      Math.round(item.effectiveQuantity * multiplier * 10000) / 10000,
    recipeUom: item.recipeUom,
    totalCost: Math.round(item.totalCost * multiplier * 100) / 100,
  }));

  return {
    batchMultiplier: multiplier,
    totalBatchCost,
    scaledLineItems,
  };
}
