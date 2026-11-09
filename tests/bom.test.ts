import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRecipeCost,
  convertQuantity,
  normalizeUOM,
  classifyFoodCostStatus,
  calculateSuggestedSellingPrice,
  scaleRecipeBatch,
} from "@/lib/inventory/bom-calculator";
import { IngredientCostProfile, RecipeBomLineItem } from "@/lib/inventory/types";

test("UOM Normalization - Standardizes uppercase string representations", () => {
  assert.equal(normalizeUOM("kg"), "KG");
  assert.equal(normalizeUOM("kilograms"), "KG");
  assert.equal(normalizeUOM("g"), "GRAM");
  assert.equal(normalizeUOM("gram"), "GRAM");
  assert.equal(normalizeUOM("l"), "LITER");
  assert.equal(normalizeUOM("litre"), "LITER");
  assert.equal(normalizeUOM("ml"), "ML");
  assert.equal(normalizeUOM("milliliters"), "ML");
  assert.equal(normalizeUOM("pcs"), "UNIT");
  assert.equal(normalizeUOM("portion"), "PORTION");
});

test("UOM Conversion - Mass and Volume unit conversions", () => {
  // Gram to Kg
  assert.equal(convertQuantity(250, "GRAM", "KG"), 0.25);
  assert.equal(convertQuantity(1500, "GRAM", "KG"), 1.5);
  // Kg to Gram
  assert.equal(convertQuantity(0.5, "KG", "GRAM"), 500);

  // Ml to Liter
  assert.equal(convertQuantity(750, "ML", "LITER"), 0.75);
  // Liter to Ml
  assert.equal(convertQuantity(2, "LITER", "ML"), 2000);

  // Same unit identity
  assert.equal(convertQuantity(100, "GRAM", "GRAM"), 100);
  assert.equal(convertQuantity(5, "UNIT", "UNIT"), 5);
});

test("UOM Conversion - Cross-domain with density factor", () => {
  // Density = 1.0 (water)
  assert.equal(convertQuantity(500, "GRAM", "ML", 1.0), 500);
  // Density = 1.25 (honey / syrup)
  // 500g / 1.25 = 400ml
  assert.equal(convertQuantity(500, "GRAM", "ML", 1.25), 400);
});

test("Food Cost Status Classification - Industry thresholds", () => {
  assert.equal(classifyFoodCostStatus(25.0), "HEALTHY"); // <= 30%
  assert.equal(classifyFoodCostStatus(30.0), "HEALTHY");
  assert.equal(classifyFoodCostStatus(34.5), "ACCEPTABLE"); // 30.1 - 38%
  assert.equal(classifyFoodCostStatus(38.0), "ACCEPTABLE");
  assert.equal(classifyFoodCostStatus(42.0), "WARNING"); // 38.1 - 50%
  assert.equal(classifyFoodCostStatus(50.0), "WARNING");
  assert.equal(classifyFoodCostStatus(55.2), "CRITICAL"); // > 50%
});

test("Recipe BOM Calculator - Nasi Lemak Ayam Goreng Berempah costing with wastage allowances", () => {
  const catalog: IngredientCostProfile[] = [
    {
      id: "ing-chk",
      sku: "ING-CHK",
      name: "Fresh Whole Chicken",
      uom: "KG",
      currentCostPerUnit: 12.0, // RM 12.00 / KG
      supplierName: "Ayamas Shoppe",
      isHalalCertified: true,
    },
    {
      id: "ing-rice",
      sku: "ING-RICE",
      name: "Siam Fragrant Rice",
      uom: "KG",
      currentCostPerUnit: 4.5, // RM 4.50 / KG
      supplierName: "Jasmine Rice",
      isHalalCertified: true,
    },
    {
      id: "ing-santan",
      sku: "ING-SANTAN",
      name: "Fresh Coconut Milk",
      uom: "LITER",
      currentCostPerUnit: 8.0, // RM 8.00 / LITER
      supplierName: "Pasar Borong",
      isHalalCertified: true,
    },
    {
      id: "ing-egg",
      sku: "ING-EGG",
      name: "Grade A Egg",
      uom: "UNIT",
      currentCostPerUnit: 0.6, // RM 0.60 / UNIT
      supplierName: "QL Foods",
      isHalalCertified: true,
    },
  ];

  const bomItems: RecipeBomLineItem[] = [
    {
      ingredientId: "ing-chk",
      recipeQuantity: 250, // 250g chicken
      recipeUom: "GRAM",
      wastageAllowancePercent: 12.0, // 12% skin/bone/trim wastage -> 280g gross = 0.28kg * RM12 = RM 3.36
    },
    {
      ingredientId: "ing-rice",
      recipeQuantity: 150, // 150g rice
      recipeUom: "GRAM",
      wastageAllowancePercent: 5.0, // 5% rinse wastage -> 157.5g = 0.1575kg * RM4.50 = RM 0.71
    },
    {
      ingredientId: "ing-santan",
      recipeQuantity: 50, // 50ml coconut milk
      recipeUom: "ML",
      wastageAllowancePercent: 0.0, // 0% wastage -> 0.05L * RM8.00 = RM 0.40
    },
    {
      ingredientId: "ing-egg",
      recipeQuantity: 1, // 1 egg
      recipeUom: "UNIT",
      wastageAllowancePercent: 0.0, // RM 0.60
    },
  ];

  // Base menu selling price: RM 18.00
  const result = calculateRecipeCost(bomItems, catalog, 18.0, "Nasi Lemak Ayam Goreng");

  // Expected line costs:
  // Chicken: 250 * 1.12 = 280g = 0.28kg * 12.00 = 3.36
  // Rice: 150 * 1.05 = 157.5g = 0.1575kg * 4.50 = 0.70875 -> 0.71
  // Santan: 50ml = 0.05L * 8.00 = 0.40
  // Egg: 1 * 0.60 = 0.60
  // Total cost = 3.36 + 0.71 + 0.40 + 0.60 = 5.07
  assert.equal(result.totalCost, 5.07);
  assert.equal(result.basePrice, 18.0);
  // Gross margin = 18.00 - 5.07 = 12.93
  assert.equal(result.grossMarginAmount, 12.93);
  // Food cost % = (5.07 / 18.00) * 100 = 28.17%
  assert.equal(result.foodCostPercentage, 28.17);
  // Cost status: HEALTHY (<= 30%)
  assert.equal(result.costStatus, "HEALTHY");
  assert.equal(result.lineItems.length, 4);

  // Check individual line details
  const chkLine = result.lineItems.find((l) => l.ingredientId === "ing-chk");
  assert.ok(chkLine);
  assert.equal(chkLine.effectiveQuantity, 280);
  assert.equal(chkLine.normalizedQuantityInPurchaseUom, 0.28);
  assert.equal(chkLine.totalCost, 3.36);
});

test("Suggested Selling Price Calculator", () => {
  // Cost RM 6.00 with target food cost 30% -> RM 20.00
  const suggested = calculateSuggestedSellingPrice(6.0, 30.0);
  assert.equal(suggested, 20.0);

  // Cost RM 5.00 with target food cost 25% -> RM 20.00
  assert.equal(calculateSuggestedSellingPrice(5.0, 25.0), 20.0);
});

test("Batch Recipe Scaling - Multiplier for 50-portion central kitchen preparation", () => {
  const catalog: IngredientCostProfile[] = [
    {
      id: "ing-1",
      sku: "ING-1",
      name: "Ingredient 1",
      uom: "KG",
      currentCostPerUnit: 10.0,
      supplierName: "Supplier",
      isHalalCertified: true,
    },
  ];
  const items: RecipeBomLineItem[] = [
    {
      ingredientId: "ing-1",
      recipeQuantity: 0.2, // 200g
      recipeUom: "KG",
      wastageAllowancePercent: 0,
    },
  ];

  const breakdown = calculateRecipeCost(items, catalog, 10.0, "Single Portion");
  assert.equal(breakdown.totalCost, 2.0); // 0.2 * 10 = RM 2.00

  const scaled = scaleRecipeBatch(breakdown, 50);
  assert.equal(scaled.batchMultiplier, 50);
  assert.equal(scaled.totalBatchCost, 100.0); // 2.00 * 50 = RM 100.00
  assert.equal(scaled.scaledLineItems[0].scaledRecipeQuantity, 10.0); // 0.2 * 50 = 10kg
});
