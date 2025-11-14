import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function FridgeAnalyzer() {
  const [isUploading, setIsUploading] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<Id<"fridgeAnalyses"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateUploadUrl = useMutation(api.fridge.generateUploadUrl);
  const analyzeImage = useMutation(api.fridge.analyzeImage);
  const currentAnalysis = useQuery(
    api.fridge.getAnalysis,
    currentAnalysisId ? { analysisId: currentAnalysisId } : "skip"
  );
  const userAnalyses = useQuery(api.fridge.getUserAnalyses);

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
      
      // Start analysis
      const analysisId = await analyzeImage({ storageId });
      setCurrentAnalysisId(analysisId);
      
      toast.success("📸 Photo uploaded! AI is analyzing your ingredients...", {
        duration: 3000,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Please try again.");
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

  return (
    <div className="space-y-6">
      {/* Camera/Upload Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            📸 Analyze Your Fridge
          </h2>
          <p className="text-gray-600 text-sm">
            Take a clear photo of your fridge contents or ingredients
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleCameraCapture}
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>AI is processing your photo...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📷</span>
                <span>Start Fridge Analysis</span>
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
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <span>💡</span>
              Tips for Best Results
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Ensure good lighting when taking the photo</li>
              <li>• Include as many ingredients as possible in the frame</li>
              <li>• Make sure labels and items are clearly visible</li>
              <li>• Hold the camera steady for a sharp image</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Analysis */}
      {currentAnalysis && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-xl font-bold text-gray-800">AI Analysis Results</h3>
          </div>
          
          {currentAnalysis.imageUrl && (
            <div className="mb-6">
              <img
                src={currentAnalysis.imageUrl}
                alt="Your fridge contents"
                className="w-full h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          )}
          
          {currentAnalysis.analysisStatus === "processing" && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">AI is working its magic! ✨</h4>
              <p className="text-gray-600">
                Identifying ingredients and generating personalized recipes...
              </p>
              <div className="mt-4 text-sm text-gray-500">
                This usually takes 10-30 seconds
              </div>
            </div>
          )}
          
          {currentAnalysis.analysisStatus === "failed" && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😔</div>
              <h4 className="text-lg font-semibold text-red-600 mb-2">Analysis Failed</h4>
              <p className="text-gray-600 mb-4">
                We couldn't identify ingredients in this image. This might happen if:
              </p>
              <ul className="text-sm text-gray-500 text-left max-w-sm mx-auto space-y-1">
                <li>• The image is too dark or blurry</li>
                <li>• No food items are clearly visible</li>
                <li>• The photo quality is too low</li>
              </ul>
              <button
                onClick={handleCameraCapture}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {currentAnalysis.analysisStatus === "completed" && (
            <div className="space-y-8">
              {/* Success Header */}
              <div className="text-center bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-4xl mb-2">🎉</div>
                <h4 className="text-lg font-bold text-green-800">Analysis Complete!</h4>
                <p className="text-green-700 text-sm">
                  Found {currentAnalysis.ingredients.length} ingredients and generated {currentAnalysis.recipes.length} recipe suggestions
                </p>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">🥬</span>
                  Ingredients Detected by AI
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200 shadow-sm"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
                {currentAnalysis.ingredients.length === 0 && (
                  <p className="text-gray-500 italic">No ingredients were detected in this image.</p>
                )}
              </div>
              
              {/* Recipes */}
              <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">👨‍🍳</span>
                  AI-Generated Recipe Suggestions
                </h4>
                <div className="space-y-6">
                  {currentAnalysis.recipes.map((recipe, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="text-lg font-bold text-gray-800">{recipe.name}</h5>
                        <div className="text-xs text-gray-500 text-right space-y-1">
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{recipe.cookingTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📊</span>
                            <span>{recipe.difficulty}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <span>🥄</span>
                          Ingredients Needed:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.map((ing, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                          <span>📝</span>
                          Cooking Instructions:
                        </p>
                        <ol className="text-sm text-gray-600 space-y-2">
                          {recipe.instructions.map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="bg-green-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ))}
                </div>
                {currentAnalysis.recipes.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-4xl mb-2">🤔</div>
                    <p className="text-gray-600">
                      No recipes could be generated with the detected ingredients.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try taking another photo with more visible ingredients.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Analyses */}
      {userAnalyses && userAnalyses.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📚</span>
            Your Previous Analyses
          </h3>
          <div className="space-y-3">
            {userAnalyses.slice(0, 5).map((analysis) => (
              <div
                key={analysis._id}
                onClick={() => setCurrentAnalysisId(analysis._id)}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
              >
                {analysis.imageUrl && (
                  <img
                    src={analysis.imageUrl}
                    alt="Previous fridge analysis"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {analysis.ingredients.length > 0 
                      ? `${analysis.ingredients.slice(0, 3).join(", ")}${analysis.ingredients.length > 3 ? "..." : ""}`
                      : "Analysis in progress..."
                    }
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{new Date(analysis._creationTime).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{analysis.ingredients.length} ingredients</span>
                    <span>•</span>
                    <span>{analysis.recipes.length} recipes</span>
                  </div>
                </div>
                <div className="text-lg">
                  {analysis.analysisStatus === "completed" ? "✅" : 
                   analysis.analysisStatus === "processing" ? "⏳" : "❌"}
                </div>
              </div>
            ))}
          </div>
          {userAnalyses.length > 5 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing 5 most recent analyses
            </p>
          )}
        </div>
      )}
    </div>
  );
}
