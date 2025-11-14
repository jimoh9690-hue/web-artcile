import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const analyzeImage = mutation({
  args: { 
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const analysisId = await ctx.db.insert("fridgeAnalyses", {
      userId,
      imageId: args.storageId,
      ingredients: [],
      recipes: [],
      analysisStatus: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.fridge.processImage, {
      analysisId,
      storageId: args.storageId,
    });

    return analysisId;
  },
});

export const processImage = internalAction({
  args: {
    analysisId: v.id("fridgeAnalyses"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Image not found");
      }

      // Analyze ingredients using OpenAI Vision
      const ingredientsResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image of a fridge or food items. List all the ingredients and food items you can identify. Return only a JSON array of ingredient names as strings, like: [\"tomatoes\", \"cheese\", \"bread\", \"milk\"]. Be specific but concise."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500,
      });

      let ingredients: string[] = [];
      try {
        const content = ingredientsResponse.choices[0].message.content;
        if (content) {
          ingredients = JSON.parse(content);
        }
      } catch (e) {
        // Fallback: extract ingredients from text response
        const content = ingredientsResponse.choices[0].message.content || "";
        ingredients = content.split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(item => item.length > 0)
          .slice(0, 10);
      }

      if (ingredients.length === 0) {
        throw new Error("No ingredients identified");
      }

      // Generate recipes based on ingredients
      const recipesResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Based on these ingredients: ${ingredients.join(", ")}, suggest 3 recipes that can be made using some or all of these ingredients. Return a JSON array with this exact structure:
[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient1", "ingredient2"],
    "instructions": ["step 1", "step 2", "step 3"],
    "cookingTime": "30 minutes",
    "difficulty": "Easy"
  }
]
Make the recipes practical and delicious. Each recipe should use at least 2-3 of the available ingredients.`
          }
        ],
        max_tokens: 1500,
      });

      let recipes: any[] = [];
      try {
        const content = recipesResponse.choices[0].message.content;
        if (content) {
          recipes = JSON.parse(content);
        }
      } catch (e) {
        // Fallback recipes if parsing fails
        recipes = [
          {
            name: "Simple Stir Fry",
            ingredients: ingredients.slice(0, 4),
            instructions: ["Heat oil in pan", "Add ingredients", "Stir fry for 5-7 minutes", "Season and serve"],
            cookingTime: "15 minutes",
            difficulty: "Easy"
          }
        ];
      }

      await ctx.runMutation(internal.fridge.updateAnalysis, {
        analysisId: args.analysisId,
        ingredients,
        recipes,
        status: "completed",
      });

    } catch (error) {
      console.error("Analysis failed:", error);
      await ctx.runMutation(internal.fridge.updateAnalysis, {
        analysisId: args.analysisId,
        ingredients: [],
        recipes: [],
        status: "failed",
      });
    }
  },
});

export const updateAnalysis = internalMutation({
  args: {
    analysisId: v.id("fridgeAnalyses"),
    ingredients: v.array(v.string()),
    recipes: v.array(v.object({
      name: v.string(),
      ingredients: v.array(v.string()),
      instructions: v.array(v.string()),
      cookingTime: v.string(),
      difficulty: v.string(),
    })),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      ingredients: args.ingredients,
      recipes: args.recipes,
      analysisStatus: args.status,
    });
  },
});

export const getAnalysis = query({
  args: { analysisId: v.id("fridgeAnalyses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.userId !== userId) {
      return null;
    }

    const imageUrl = await ctx.storage.getUrl(analysis.imageId);
    
    return {
      ...analysis,
      imageUrl,
    };
  },
});

export const getUserAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const analyses = await ctx.db
      .query("fridgeAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return Promise.all(
      analyses.map(async (analysis) => ({
        ...analysis,
        imageUrl: await ctx.storage.getUrl(analysis.imageId),
      }))
    );
  },
});
