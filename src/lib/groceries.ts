import { GROCERY_CATEGORIES, type GroceryCategory } from "@/db/schema";

/** Human-facing aisle labels, keyed by schema enum. */
export const CATEGORY_LABEL: Record<GroceryCategory, string> = {
  produce: "Produce",
  "meat-fish": "Meat & Fish",
  "dairy-eggs": "Dairy & Eggs",
  pantry: "Pantry",
  frozen: "Frozen",
  household: "Household",
};

/** Fixed aisle order for grouping (matches GROCERY_CATEGORIES). */
export const CATEGORY_ORDER = GROCERY_CATEGORIES;

/** True when the value is a valid grocery category enum. */
export function isGroceryCategory(v: string): v is GroceryCategory {
  return (GROCERY_CATEGORIES as readonly string[]).includes(v);
}
