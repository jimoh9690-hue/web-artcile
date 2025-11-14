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

export const scanRecipe = mutation({
  args: { 
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const recipeId = await ctx.db.insert("scannedRecipes", {
      userId,
      imageId: args.storageId,
      name: "",
      ingredients: [],
      instructions: [],
      scanStatus: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.recipes.processRecipeImage, {
      recipeId,
      storageId: args.storageId,
    });

    return recipeId;
  },
});

export const processRecipeImage = internalAction({
  args: {
    recipeId: v.id("scannedRecipes"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Image not found");
      }

      // Scan recipe using OpenAI Vision
      const recipeResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this recipe image and extract all the recipe information. Return a JSON object with this exact structure:
{
  "name": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
  "instructions": ["step 1", "step 2", "step 3"],
  "cookingTime": "30 minutes",
  "servings": "4 servings",
  "difficulty": "Easy",
  "category": "Main Course"
}

Extract all visible text including recipe name, ingredients list, cooking instructions, cooking time, servings, and any other relevant details. If some information is not visible, omit those fields or use reasonable defaults.`
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 1500,
      });

      let recipeData: any = {
        name: "Scanned Recipe",
        ingredients: [],
        instructions: [],
        cookingTime: "Unknown",
        servings: "Unknown",
        difficulty: "Medium",
        category: "Other"
      };

      try {
        const content = recipeResponse.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content);
          recipeData = { ...recipeData, ...parsed };
        }
      } catch (e) {
        // Fallback: try to extract text-based recipe
        const content = recipeResponse.choices[0].message.content || "";
        const lines = content.split('\n').filter(line => line.trim());
        
        // Try to find recipe name (usually first line or after "Recipe:" etc.)
        const nameMatch = lines.find(line => 
          line.toLowerCase().includes('recipe') || 
          line.toLowerCase().includes('title') ||
          (!line.includes(':') && line.length > 5 && line.length < 50)
        );
        if (nameMatch) {
          recipeData.name = nameMatch.replace(/recipe:?/i, '').trim();
        }

        // Extract ingredients (lines that start with numbers, bullets, or dashes)
        const ingredients = lines.filter(line => 
          /^[\d•\-*]/.test(line.trim()) || 
          line.toLowerCase().includes('cup') ||
          line.toLowerCase().includes('tbsp') ||
          line.toLowerCase().includes('tsp')
        ).map(line => line.replace(/^[\d•\-*.\s]+/, '').trim());
        
        if (ingredients.length > 0) {
          recipeData.ingredients = ingredients.slice(0, 15); // Limit to 15 ingredients
        }

        // Extract instructions (longer lines that describe actions)
        const instructions = lines.filter(line => 
          line.length > 20 && 
          (line.includes('cook') || line.includes('add') || line.includes('mix') || 
           line.includes('heat') || line.includes('bake') || line.includes('stir'))
        );
        
        if (instructions.length > 0) {
          recipeData.instructions = instructions.slice(0, 10); // Limit to 10 steps
        }
      }

      // Ensure we have at least some data
      if (recipeData.ingredients.length === 0 && recipeData.instructions.length === 0) {
        throw new Error("No recipe information could be extracted from the image");
      }

      await ctx.runMutation(internal.recipes.updateScannedRecipe, {
        recipeId: args.recipeId,
        recipeData,
        status: "completed",
      });

    } catch (error) {
      console.error("Recipe scan failed:", error);
      await ctx.runMutation(internal.recipes.updateScannedRecipe, {
        recipeId: args.recipeId,
        recipeData: {
          name: "Scan Failed",
          ingredients: [],
          instructions: [],
        },
        status: "failed",
      });
    }
  },
});

export const updateScannedRecipe = internalMutation({
  args: {
    recipeId: v.id("scannedRecipes"),
    recipeData: v.object({
      name: v.string(),
      ingredients: v.array(v.string()),
      instructions: v.array(v.string()),
      cookingTime: v.optional(v.string()),
      servings: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipeId, {
      name: args.recipeData.name,
      ingredients: args.recipeData.ingredients,
      instructions: args.recipeData.instructions,
      cookingTime: args.recipeData.cookingTime,
      servings: args.recipeData.servings,
      difficulty: args.recipeData.difficulty,
      category: args.recipeData.category,
      scanStatus: args.status,
    });
  },
});

export const getScannedRecipe = query({
  args: { recipeId: v.id("scannedRecipes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.userId !== userId) {
      return null;
    }

    const imageUrl = await ctx.storage.getUrl(recipe.imageId);
    
    return {
      ...recipe,
      imageUrl,
    };
  },
});

export const getUserRecipes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const recipes = await ctx.db
      .query("scannedRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return Promise.all(
      recipes.map(async (recipe) => ({
        ...recipe,
        imageUrl: await ctx.storage.getUrl(recipe.imageId),
      }))
    );
  },
});

export const deleteRecipe = mutation({
  args: { recipeId: v.id("scannedRecipes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.userId !== userId) {
      throw new Error("Recipe not found or not authorized");
    }

    await ctx.db.delete(args.recipeId);
  },
});
