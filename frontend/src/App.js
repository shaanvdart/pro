import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('512x512');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load image history on mount
  useEffect(() => {
    loadImageHistory();
  }, []);

  const loadImageHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/images`);
      const data = await response.json();
      setGeneratedImages(data.images || []);
    } catch (err) {
      console.error('Error loading image history:', err);
    }
  };

  const handleGenerateImage = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');
    setCurrentImage(null);

    try {
      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          size
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const newImage = await response.json();
      setCurrentImage(newImage);
      setGeneratedImages([newImage, ...generatedImages]);
      
    } catch (err) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (imageData, filename) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = filename;
    link.click();
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all image history?')) {
      try {
        await fetch(`${API_URL}/api/images`, { method: 'DELETE' });
        setGeneratedImages([]);
        setCurrentImage(null);
      } catch (err) {
        setError('Failed to clear history');
      }
    }
  };

  const examplePrompts = [
    "A futuristic cityscape at sunset with flying cars",
    "A magical forest with glowing mushrooms and fairy lights",
    "A steampunk robot playing chess with a cat",
    "A cozy library with books floating in the air",
    "A space station orbiting a colorful nebula",
    "A dragon sleeping on a pile of golden coins",
    "A cyberpunk street market with neon lights",
    "A peaceful zen garden with a flowing waterfall"
  ];

  const fillExamplePrompt = (examplePrompt) => {
    setPrompt(examplePrompt);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              🎨 AI Image Generator
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  showHistory
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showHistory ? 'Hide History' : 'Show History'}
              </button>
              {generatedImages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                >
                  Clear History
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Generation Form */}
          <div className="space-y-6">
            
            {/* Generation Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Your Image</h2>
              
              <form onSubmit={handleGenerateImage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your image
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A beautiful landscape with mountains and a lake at golden hour..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows="4"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="realistic">Realistic</option>
                      <option value="artistic">Artistic</option>
                      <option value="cartoon">Cartoon</option>
                      <option value="professional">Professional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="512x512">Square (512x512)</option>
                      <option value="768x512">Landscape (768x512)</option>
                      <option value="512x768">Portrait (512x768)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate Image ✨'
                  )}
                </button>
              </form>
            </div>

            {/* Example Prompts */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Example Prompts</h3>
              <div className="grid grid-cols-1 gap-2">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => fillExamplePrompt(example)}
                    className="text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-200 transition-all duration-200 text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Generated Image */}
          <div className="space-y-6">
            {currentImage && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Generated Image</h3>
                  <button
                    onClick={() => downloadImage(currentImage.image_data, `generated_${currentImage.id}.png`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Download
                  </button>
                </div>
                
                <img
                  src={`data:image/png;base64,${currentImage.image_data}`}
                  alt="Generated"
                  className="w-full rounded-lg shadow-md"
                />
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Prompt:</strong> {currentImage.prompt}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Style:</strong> {currentImage.style} | 
                    <strong> Size:</strong> {currentImage.size} | 
                    <strong> Created:</strong> {new Date(currentImage.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* History */}
            {showHistory && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Image History ({generatedImages.length})
                </h3>
                
                {generatedImages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No images generated yet. Create your first image!</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {generatedImages.map((image) => (
                      <div
                        key={image.id}
                        className="border border-gray-200 rounded-lg p-2 hover:border-purple-300 transition-colors cursor-pointer"
                        onClick={() => setCurrentImage(image)}
                      >
                        <img
                          src={`data:image/png;base64,${image.image_data}`}
                          alt="Generated"
                          className="w-full h-24 object-cover rounded-md mb-2"
                        />
                        <p className="text-xs text-gray-600 truncate">
                          {image.prompt}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(image.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;