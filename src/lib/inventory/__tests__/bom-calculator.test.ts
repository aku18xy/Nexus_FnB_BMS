/**
 * Unit Test Suite for Recipe BOM Yield & Food Costing Engine
 * Nexus FnB BMS (TSK-INV-01)
 */

import assert from "node:assert/strict";
import {
  normalizeUOM,
  convertQuantity,
  classifyFoodCostStatus,
  calculateRecipeCost,
  calculateSuggestedSellingPrice,
  scaleRecipeBatch,
} from "../bom-calculator";
import { IngredientCostProfile, RecipeBomLineItem } from "../types";

export function runBomCalculatorTests(): void {
  // Test 1: UOM Normalization
  assert.equal(normalizeUOM("kg"), "KG");
  assert.equal(normalizeUOM("kilograms"), "KG");
  assert.equal(normalizeUOM("g"), "GRAM");
  assert.equal(normalizeUOM("grams"), "GRAM");
  assert.equal(normalizeUOM("ml"), "ML");
  assert.equal(normalizeUOM("liters"), "LITER");
  assert.equal(normalizeUOM("unit"), "UNIT");
  assert.equal(normalizeUOM("portion"), "PORTION");

  // Test 2: Unit Conversions
  assert.equal(convertQuantity(500, "GRAM", "KG"), 0.5);
  assert.equal(convertQuantity(2.5, "KG", "GRAM"), 2500);
  assert.equal(convertQuantity(750, "ML", "LITER"), 0.75);
  assert.equal(convertQuantity(3, "LITER", "ML"), 3000);
  assert.equal(convertQuantity(4, "UNIT", "UNIT"), 4);

  // Test 2b: Cross-domain conversion with density
  // 1000ml liquid with density 1.05 g/ml = 1050g
  assert.equal(convertQuantity(1000, "ML", "GRAM", 1.05), 1050);

  // Test 3: Food Cost Threshold Classification
  assert.equal(classifyFoodCostStatus(25.0), "HEALTHY");
  assert.equal(classifyFoodCostStatus(30.0), "HEALTHY");
  assert.equal(classifyFoodCostStatus(32.5), "ACCEPTABLE");
  assert.equal(classifyFoodCostStatus(38.0), "ACCEPTABLE");
  assert.equal(classifyFoodCostStatus(42.0), "WARNING");
  assert.equal(classifyFoodCostStatus(50.0), "WARNING");
  assert.equal(classifyFoodCostStatus(55.0), "CRITICAL");

  // Test 4: Recipe BOM Cost Calculation with Wastage Allowances
  const mockCatalog: IngredientCostProfile[] = [
    {
      id: "ing-chk",
      sku: "ING-CHK-01",
      name: "Fresh Chicken Breast",
      uom: "KG",
      currentCostPerUnit: 18.0, // RM 18.00 per KG
      supplierName: "Ayamas Shoppe",
      isHalalCertified: true,
    },
    {
      id: "ing-ric",
      sku: "ING-RIC-01",
      name: "Fragrant Jasmine Rice",
      uom: "KG",
      currentCostPerUnit: 4.8, // RM 4.80 per KG
      supplierName: "Jasmine Food",
      isHalalCertified: true,
    },
    {
      id: "ing-oil",
      sku: "ING-OIL-01",
      name: "Saji Palm Cooking Oil",
      uom: "LITER",
      currentCostPerUnit: 6.5, // RM 6.50 per LITER
      supplierName: "Delima Oil Products",
      isHalalCertified: true,
    },
    {
      id: "ing-egg",
      sku: "ING-EGG-01",
      name: "Fresh Grade A Egg",
      uom: "UNIT",
      currentCostPerUnit: 0.45, // RM 0.45 per egg
      supplierName: "QL Deli Fresh",
      isHalalCertified: true,
    },
  ];

  const recipeItems: RecipeBomLineItem[] = [
    // 200g chicken with 10% wastage allowance:
    // effectiveQty = 200 * 1.10 = 220g = 0.220 kg
    // lineCost = 0.220 * 18.00 = RM 3.96
    {
      ingredientId: "ing-chk",
      recipeQuantity: 200,
      recipeUom: "GRAM",
      wastageAllowancePercent: 10.0,
    },
    // 150g rice with 0% wastage:
    // effectiveQty = 150g = 0.150 kg
    // lineCost = 0.150 * 4.80 = RM 0.72
    {
      ingredientId: "ing-ric",
      recipeQuantity: 150,
      recipeUom: "GRAM",
      wastageAllowancePercent: 0.0,
    },
    // 25ml oil with 4% wastage:
    // effectiveQty = 25 * 1.04 = 26ml = 0.026 LITER
    // lineCost = 0.026 * 6.50 = 0.169 -> RM 0.17
    {
      ingredientId: "ing-oil",
      recipeQuantity: 25,
      recipeUom: "ML",
      wastageAllowancePercent: 4.0,
    },
    // 1 egg with 0% wastage:
    // lineCost = 1 * 0.45 = RM 0.45
    {
      ingredientId: "ing-egg",
      recipeQuantity: 1,
      recipeUom: "UNIT",
      wastageAllowancePercent: 0.0,
    },
  ];

  const baseSellingPrice = 18.0; // Menu Selling Price RM 18.00
  const breakdown = calculateRecipeCost(
    recipeItems,
    mockCatalog,
    baseSellingPrice,
    "Signature Chicken Rice"
  );

  // Expected Total Cost = 3.96 + 0.72 + 0.17 + 0.45 = RM 5.30
  assert.equal(breakdown.totalCost, 5.3);

  // Expected Gross Margin = 18.00 - 5.30 = RM 12.70
  assert.equal(breakdown.grossMarginAmount, 12.7);

  // Expected Food Cost % = (5.30 / 18.00) * 100 = 29.44%
  assert.equal(breakdown.foodCostPercentage, 29.44);

  // Status should be HEALTHY (<30%)
  assert.equal(breakdown.costStatus, "HEALTHY");

  // Gross margin % = (12.70 / 18.00) * 100 = 70.56%
  assert.equal(breakdown.grossMarginPercentage, 70.56);

  // Verify Line details
  assert.equal(breakdown.lineItems.length, 4);
  assert.equal(breakdown.lineItems[0].ingredientName, "Fresh Chicken Breast");
  assert.equal(breakdown.lineItems[0].effectiveQuantity, 220);
  assert.equal(breakdown.lineItems[0].totalCost, 3.96);

  // Cost share percent should sum to approximately 100%
  const totalCostShare = breakdown.lineItems.reduce((acc, item) => acc + item.costSharePercent, 0);
  assert.ok(Math.abs(totalCostShare - 100.0) < 0.2);

  // Test 5: Suggested Price Calculation
  // Cost RM 5.30 with 30% target food cost -> RM 17.67
  const suggestedPrice = calculateSuggestedSellingPrice(5.3, 30.0);
  assert.equal(suggestedPrice, 17.67);

  // Test 6: Central Kitchen Batch Scaling
  // Scale single portion by 20 portions
  const batch = scaleRecipeBatch(breakdown, 20);
  assert.equal(batch.batchMultiplier, 20);
  assert.equal(batch.totalBatchCost, 106.0); // 5.30 * 20
  assert.equal(batch.scaledLineItems[0].scaledEffectiveQuantity, 4400); // 220g * 20 = 4400g
}

// Auto-run if executed directly via node
if (typeof require !== "undefined" && require.main === module) {
  runBomCalculatorTests();
  console.log("All BOM Calculator tests passed successfully.");
}
