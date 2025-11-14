import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  fridgeAnalyses: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    ingredients: v.array(v.string()),
    recipes: v.array(v.object({
      name: v.string(),
      ingredients: v.array(v.string()),
      instructions: v.array(v.string()),
      cookingTime: v.string(),
      difficulty: v.string(),
    })),
    analysisStatus: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  }).index("by_user", ["userId"]),
  
  scannedRecipes: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    name: v.string(),
    ingredients: v.array(v.string()),
    instructions: v.array(v.string()),
    cookingTime: v.optional(v.string()),
    servings: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    category: v.optional(v.string()),
    scanStatus: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
