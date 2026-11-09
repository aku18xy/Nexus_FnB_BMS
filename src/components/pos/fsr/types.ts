export type {
  TableStatus,
  TableShape,
  TableSection,
  TablePosition,
  TableDimensions,
  DiningTableLayout,
  TableTransitionAction,
} from "@/types/pos";

export { VALID_TABLE_TRANSITIONS } from "@/types/pos";

export interface TableCardProps {
  table: import("@/types/pos").DiningTableLayout;
  isSelected?: boolean;
  onSelect?: (table: import("@/types/pos").DiningTableLayout) => void;
  onTransitionStatus?: (
    tableId: string,
    nextStatus: import("@/types/pos").TableStatus,
    pax?: number,
    orderTotal?: number
  ) => void;
}

export interface TableGridProps {
  initialTables?: import("@/types/pos").DiningTableLayout[];
  onTableUpdate?: (tables: import("@/types/pos").DiningTableLayout[]) => void;
  readOnly?: boolean;
}

export interface FloorPlanDesignerProps {
  initialTables?: import("@/types/pos").DiningTableLayout[];
  onSaveLayout?: (tables: import("@/types/pos").DiningTableLayout[]) => void;
  activeSection?: import("@/types/pos").TableSection;
}
