import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function RecipeScanner() {
  const [isUploading, setIsUploading] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState<Id<"scannedRecipes"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const scanRecipe = useMutation(api.recipes.scanRecipe);
  const deleteRecipe = useMutation(api.recipes.deleteRecipe);
  const currentRecipe = useQuery(
    api.recipes.getScannedRecipe,
    currentRecipeId ? { recipeId: currentRecipeId } : "skip"
  );
  const userRecipes = useQuery(api.recipes.getUserRecipes);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file (JPG, PNG, etc.)");
      return;
    }

    setIsUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();
      
      // Start recipe scanning
      const recipeId = await scanRecipe({ storageId });
      setCurrentRecipeId(recipeId);
      
      toast.success("📖 Recipe uploaded! AI is extracting the details...", {
        duration: 3000,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload recipe image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDeleteRecipe = async (recipeId: Id<"scannedRecipes">) => {
    try {
      await deleteRecipe({ recipeId });
      if (currentRecipeId === recipeId) {
        setCurrentRecipeId(null);
      }
      toast.success("Recipe deleted successfully");
    } catch (error) {
      toast.error("Failed to delete recipe");
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            📖 Scan Recipe Cards
          </h2>
          <p className="text-gray-600 text-sm">
            Digitize handwritten recipes, cookbook pages, or recipe cards
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleCameraCapture}
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>AI is reading your recipe...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📱</span>
                <span>Scan Recipe</span>
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Tips Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <span>💡</span>
              Tips for Perfect Scanning
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ensure the entire recipe is visible in the frame</li>
              <li>• Use good lighting to make text clearly readable</li>
              <li>• Keep the camera steady and avoid shadows</li>
              <li>• Works with handwritten notes, printed recipes, and screens</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Recipe */}
      {currentRecipe && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h3 className="text-xl font-bold text-gray-800">AI-Scanned Recipe</h3>
            </div>
            {currentRecipe.scanStatus === "completed" && (
              <button
                onClick={() => handleDeleteRecipe(currentRecipe._id)}
                className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <span>🗑️</span>
                Delete
              </button>
            )}
          </div>
          
          {currentRecipe.imageUrl && (
            <div className="mb-6">
              <img
                src={currentRecipe.imageUrl}
                alt="Scanned recipe"
                className="w-full h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          )}
          
          {currentRecipe.scanStatus === "processing" && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">AI is reading your recipe! 📚</h4>
              <p className="text-gray-600">
                Extracting ingredients, instructions, and cooking details...
              </p>
              <div className="mt-4 text-sm text-gray-500">
                This usually takes 15-45 seconds
              </div>
            </div>
          )}
          
          {currentRecipe.scanStatus === "failed" && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😔</div>
              <h4 className="text-lg font-semibold text-red-600 mb-2">Recipe Scan Failed</h4>
              <p className="text-gray-600 mb-4">
                We couldn't extract recipe information from this image. This might happen if:
              </p>
              <ul className="text-sm text-gray-500 text-left max-w-sm mx-auto space-y-1">
                <li>• The text is too small or blurry to read</li>
                <li>• The image quality is too low</li>
                <li>• No recipe text is visible in the photo</li>
                <li>• The lighting makes text hard to distinguish</li>
              </ul>
              <button
                onClick={handleCameraCapture}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {currentRecipe.scanStatus === "completed" && (
            <div className="space-y-8">
              {/* Success Header */}
              <div className="text-center bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-4xl mb-2">🎉</div>
                <h4 className="text-lg font-bold text-blue-800">Recipe Successfully Scanned!</h4>
                <p className="text-blue-700 text-sm">
                  AI extracted {currentRecipe.ingredients.length} ingredients and {currentRecipe.instructions.length} cooking steps
                </p>
              </div>

              {/* Recipe Header */}
              <div className="border-b pb-6">
                <h4 className="text-2xl font-bold text-gray-800 mb-4">{currentRecipe.name}</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  {currentRecipe.cookingTime && (
                    <span className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                      <span>⏱️</span>
                      <span>{currentRecipe.cookingTime}</span>
                    </span>
                  )}
                  {currentRecipe.servings && (
                    <span className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                      <span>👥</span>
                      <span>{currentRecipe.servings}</span>
                    </span>
                  )}
                  {currentRecipe.difficulty && (
                    <span className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200">
                      <span>📊</span>
                      <span>{currentRecipe.difficulty}</span>
                    </span>
                  )}
                  {currentRecipe.category && (
                    <span className="flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full border border-gray-200">
                      <span>🏷️</span>
                      <span>{currentRecipe.category}</span>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Ingredients */}
              {currentRecipe.ingredients.length > 0 && (
                <div>
                  <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">🥬</span>
                    Ingredients ({currentRecipe.ingredients.length})
                  </h5>
                  <ul className="space-y-3">
                    {currentRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-blue-600 font-bold text-lg">•</span>
                        <span className="text-gray-700 leading-relaxed">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Instructions */}
              {currentRecipe.instructions.length > 0 && (
                <div>
                  <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">👨‍🍳</span>
                    Cooking Instructions ({currentRecipe.instructions.length} steps)
                  </h5>
                  <ol className="space-y-4">
                    {currentRecipe.instructions.map((step, index) => (
                      <li key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Empty State */}
              {currentRecipe.ingredients.length === 0 && currentRecipe.instructions.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-4xl mb-2">🤔</div>
                  <p className="text-gray-600">
                    No recipe details could be extracted from this image.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try taking another photo with clearer text.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Previous Recipes */}
      {userRecipes && userRecipes.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📚</span>
            Your Recipe Collection ({userRecipes.length})
          </h3>
          <div className="space-y-3">
            {userRecipes.slice(0, 10).map((recipe) => (
              <div
                key={recipe._id}
                onClick={() => setCurrentRecipeId(recipe._id)}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
              >
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt="Recipe"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                    {recipe.name || "Untitled Recipe"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{new Date(recipe._creationTime).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{recipe.ingredients.length} ingredients</span>
                    <span>•</span>
                    <span>{recipe.instructions.length} steps</span>
                  </div>
                </div>
                <div className="text-lg">
                  {recipe.scanStatus === "completed" ? "✅" : 
                   recipe.scanStatus === "processing" ? "⏳" : "❌"}
                </div>
              </div>
            ))}
          </div>
          {userRecipes.length > 10 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing 10 most recent recipes
            </p>
          )}
        </div>
      )}
    </div>
  );
}
