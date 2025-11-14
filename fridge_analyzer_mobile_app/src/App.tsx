import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { FridgeAnalyzer } from "./FridgeAnalyzer";
import { RecipeScanner } from "./RecipeScanner";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🥗</span>
          <div>
            <h2 className="text-xl font-bold text-green-700">FridgeChef</h2>
            <p className="text-xs text-gray-500 hidden sm:block">AI-Powered Kitchen Assistant</p>
          </div>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [activeTab, setActiveTab] = useState<"fridge" | "recipes">("fridge");

  if (loggedInUser === undefined) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="text-gray-600 animate-pulse">Loading your kitchen assistant...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Authenticated>
        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to FridgeChef! 👋
          </h1>
          <p className="text-gray-600 text-sm">
            Your AI-powered kitchen companion for smart cooking
          </p>
        </div>

        {/* Tab Navigation with Enhanced Descriptions */}
        <div className="bg-white rounded-2xl p-3 shadow-lg mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("fridge")}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "fridge"
                  ? "bg-green-600 text-white shadow-md transform scale-105"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">🥗</div>
                <div className="text-sm font-bold">Fridge Analysis</div>
                <div className="text-xs opacity-80 mt-1">
                  {activeTab === "fridge" ? "Get recipe suggestions" : "Scan your fridge"}
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("recipes")}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "recipes"
                  ? "bg-blue-600 text-white shadow-md transform scale-105"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">📖</div>
                <div className="text-sm font-bold">Recipe Scanner</div>
                <div className="text-xs opacity-80 mt-1">
                  {activeTab === "recipes" ? "Digitize recipes" : "Save recipe cards"}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white/80 rounded-xl p-4 mb-6 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            How AI Helps You Cook
          </h3>
          {activeTab === "fridge" ? (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">1.</span>
                <span>Take a photo of your fridge or ingredients</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>AI identifies all available ingredients</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>Get personalized recipe suggestions instantly</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Photograph recipe cards or cookbook pages</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>AI extracts ingredients and instructions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Save recipes digitally for easy access</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "fridge" ? <FridgeAnalyzer /> : <RecipeScanner />}
      </Authenticated>
      
      <Unauthenticated>
        <div className="text-center mb-8">
          <div className="text-8xl mb-6">🤖🥗</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">FridgeChef</h1>
          <p className="text-lg text-gray-600 mb-4 leading-relaxed">
            Your AI-powered kitchen assistant that turns photos into recipes
          </p>
          
          {/* Feature Highlights */}
          <div className="bg-white/80 rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              ✨ What FridgeChef Can Do
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📸</span>
                <div>
                  <h3 className="font-semibold text-gray-800">Smart Fridge Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Snap a photo of your fridge and get instant recipe suggestions based on what you have
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <h3 className="font-semibold text-gray-800">Recipe Card Scanner</h3>
                  <p className="text-sm text-gray-600">
                    Digitize handwritten recipes and cookbook pages with AI-powered text extraction
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <h3 className="font-semibold text-gray-800">AI-Powered Intelligence</h3>
                  <p className="text-sm text-gray-600">
                    Advanced computer vision identifies ingredients and extracts recipe details automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SignInForm />
      </Unauthenticated>
    </div>
  );
}
