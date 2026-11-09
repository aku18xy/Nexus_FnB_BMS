/**
 * QSR Rapid Tap POS Types and Sample Catalog
 * SSOT Section 2, Section 5.1 SRS-FOH-05/06 & TASKS TSK-POS-04/05
 */

import {
  QsrOrderMode,
  ComboModifierItem,
  ComboModifierGroup,
  QsrMenuItem,
  SelectedCombo,
  QsrCartItem,
  QueueToken,
  TokenStatus,
  RapidTapFlowMetrics,
} from "@/types/pos";

export type {
  QsrOrderMode,
  ComboModifierItem,
  ComboModifierGroup,
  QsrMenuItem,
  SelectedCombo,
  QsrCartItem,
  QueueToken,
  TokenStatus,
  RapidTapFlowMetrics,
};

export interface RapidOrderMatrixProps {
  onOrderCompleted?: (order: {
    tokenNumber: number;
    cart: QsrCartItem[];
    orderMode: QsrOrderMode;
    paymentMethod: string;
    totalPayable: number;
    tapCount: number;
    elapsedSeconds: number;
  }) => void;
  onTokenGenerated?: (token: QueueToken) => void;
  initialTokenNumber?: number;
}

export interface ComboUpsellModalProps {
  isOpen: boolean;
  item: QsrMenuItem | null;
  onConfirm: (item: QsrMenuItem, combo?: SelectedCombo) => void;
  onCancel: () => void;
}

export interface TokenCallingScreenProps {
  tokens?: QueueToken[];
  onBumpStatus?: (tokenNumber: number, nextStatus: TokenStatus) => void;
}

// Sample combo modifier items
export const SAMPLE_COMBO_DRINKS: ComboModifierItem[] = [
  { id: "drk-1", name: "Teh Tarik Kaw (Hot)", priceDelta: 2.0, station: "DRINK_BAR" },
  { id: "drk-2", name: "Kopi O Ping (Iced)", priceDelta: 2.5, station: "DRINK_BAR" },
  { id: "drk-3", name: "Iced Lemon Tea", priceDelta: 2.8, station: "DRINK_BAR" },
  { id: "drk-4", name: "Air Sirap Bandung", priceDelta: 2.2, station: "DRINK_BAR" },
  { id: "drk-5", name: "Mineral Water (500ml)", priceDelta: 1.0, station: "DRINK_BAR" },
];

export const SAMPLE_COMBO_SIDES: ComboModifierItem[] = [
  { id: "side-1", name: "Telur Mata (Fried Egg)", priceDelta: 1.5, station: "HOT_WOK" },
  { id: "side-2", name: "Ayam Goreng Berempah", priceDelta: 4.9, station: "HOT_WOK" },
  { id: "side-3", name: "Sambal Kerang Extra", priceDelta: 3.5, station: "COLD_KITCHEN" },
  { id: "side-4", name: "Crispy Papadom (3pcs)", priceDelta: 1.8, station: "HOT_WOK" },
];

export const SAMPLE_QSR_MENU: QsrMenuItem[] = [
  {
    id: "m-01",
    sku: "QSR-NSL-01",
    name: "Nasi Lemak Sambal Sotong",
    nameMalay: "Nasi Lemak Sotong Sambal",
    price: 14.9,
    category: "Mains",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: true,
    comboDrinkOptions: SAMPLE_COMBO_DRINKS,
    comboSideOptions: SAMPLE_COMBO_SIDES,
    isAvailable: true,
  },
  {
    id: "m-02",
    sku: "QSR-CKT-01",
    name: "Char Kway Teow Special",
    nameMalay: "Kuey Teow Goreng Kerang",
    price: 13.5,
    category: "Mains",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: true,
    comboDrinkOptions: SAMPLE_COMBO_DRINKS,
    comboSideOptions: SAMPLE_COMBO_SIDES,
    isAvailable: true,
  },
  {
    id: "m-03",
    sku: "QSR-AYM-01",
    name: "Nasi Ayam Hainan Roasted",
    nameMalay: "Nasi Ayam Panggang",
    price: 12.8,
    category: "Mains",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: true,
    comboDrinkOptions: SAMPLE_COMBO_DRINKS,
    comboSideOptions: SAMPLE_COMBO_SIDES,
    isAvailable: true,
  },
  {
    id: "m-04",
    sku: "QSR-RTC-01",
    name: "Roti Canai (2 pcs) + Dhal & Sambal",
    nameMalay: "Roti Canai Kuah Dhal",
    price: 4.8,
    category: "Breakfast",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: true,
    comboDrinkOptions: SAMPLE_COMBO_DRINKS,
    isAvailable: true,
  },
  {
    id: "m-05",
    sku: "QSR-RTB-01",
    name: "Roti Telur Bawang Special",
    nameMalay: "Roti Telur Bawang Garing",
    price: 6.5,
    category: "Breakfast",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: true,
    comboDrinkOptions: SAMPLE_COMBO_DRINKS,
    isAvailable: true,
  },
  {
    id: "m-06",
    sku: "QSR-BEV-01",
    name: "Teh Tarik Kaw",
    nameMalay: "Teh Tarik Kaw Buih",
    price: 3.8,
    category: "Beverages",
    kitchenStation: "DRINK_BAR",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-07",
    sku: "QSR-BEV-02",
    name: "Kopi O Ping (Iced)",
    nameMalay: "Kopi O Ais Kurang Manis",
    price: 3.5,
    category: "Beverages",
    kitchenStation: "DRINK_BAR",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-08",
    sku: "QSR-BEV-03",
    name: "Milo Dinosaur",
    nameMalay: "Milo Ais Tabur",
    price: 5.5,
    category: "Beverages",
    kitchenStation: "DRINK_BAR",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-09",
    sku: "QSR-DES-01",
    name: "Cendol Durian D24",
    nameMalay: "Cendol Santan Durian D24",
    price: 9.9,
    category: "Desserts",
    kitchenStation: "PASTRY_DESSERT",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-10",
    sku: "QSR-DES-02",
    name: "ABC Ais Kacang Special",
    nameMalay: "Ais Batu Campur Jagung",
    price: 6.9,
    category: "Desserts",
    kitchenStation: "PASTRY_DESSERT",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-11",
    sku: "QSR-SID-01",
    name: "Ayam Goreng Berempah (1 pc)",
    nameMalay: "Ayam Goreng Rempah Panas",
    price: 5.5,
    category: "Sides",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: false,
    isAvailable: true,
  },
  {
    id: "m-12",
    sku: "QSR-SID-02",
    name: "Keropok Lekor Terengganu (5 pcs)",
    nameMalay: "Keropok Lekor Sos Cili",
    price: 4.5,
    category: "Sides",
    kitchenStation: "HOT_WOK",
    hasComboUpsell: false,
    isAvailable: true,
  },
];

export const INITIAL_QUEUE_TOKENS: QueueToken[] = [
  {
    tokenNumber: 104,
    tokenDisplay: "#104",
    orderId: "ord-104",
    orderMode: "TAKEAWAY",
    itemsSummary: "1x Nasi Lemak Sambal Sotong (Combo Teh Tarik)",
    totalPayable: 18.45,
    status: "PREPARING",
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    tokenNumber: 105,
    tokenDisplay: "#105",
    orderId: "ord-105",
    orderMode: "DINE_IN",
    itemsSummary: "2x Roti Canai, 1x Teh Tarik Kaw",
    totalPayable: 14.2,
    status: "PREPARING",
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    tokenNumber: 106,
    tokenDisplay: "#106",
    orderId: "ord-106",
    orderMode: "TAKEAWAY",
    itemsSummary: "1x Char Kway Teow Special",
    totalPayable: 15.35,
    status: "CALLING",
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
  {
    tokenNumber: 107,
    tokenDisplay: "#107",
    orderId: "ord-107",
    orderMode: "DINE_IN",
    itemsSummary: "1x Nasi Ayam Hainan, 1x Kopi O Ping",
    totalPayable: 17.3,
    status: "CALLING",
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];
