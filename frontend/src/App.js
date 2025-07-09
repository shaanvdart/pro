import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentView, setCurrentView] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [generatedAds, setGeneratedAds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    product_service: '',
    target_audience: '',
    brand_description: '',
    website: ''
  });

  // Ad generation form state
  const [adForm, setAdForm] = useState({
    ad_type: 'banner',
    style: 'modern',
    custom_prompt: ''
  });

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/companies`);
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError('Failed to load companies');
      console.error('Error loading companies:', err);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      const newCompany = await response.json();
      setCompanies([...companies, newCompany]);
      setCompanyForm({
        name: '',
        industry: '',
        product_service: '',
        target_audience: '',
        brand_description: '',
        website: ''
      });
      setCurrentView('companies');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAd = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/generate-ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...adForm
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate ad');
      }

      const newAd = await response.json();
      setGeneratedAds([newAd, ...generatedAds]);
      setAdForm({
        ad_type: 'banner',
        style: 'modern',
        custom_prompt: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyAds = async (companyId) => {
    try {
      const response = await fetch(`${API_URL}/api/ads/${companyId}`);
      const data = await response.json();
      setGeneratedAds(data);
    } catch (err) {
      setError('Failed to load ads');
      console.error('Error loading ads:', err);
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setCurrentView('generate');
    loadCompanyAds(company.id);
  };

  const downloadImage = (imageData, filename) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              🎨 AI Ad Generator
            </h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setCurrentView('companies')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentView === 'companies'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Companies
              </button>
              <button
                onClick={() => setCurrentView('create')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentView === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Add Company
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Companies View */}
        {currentView === 'companies' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Companies</h2>
            {companies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No companies yet. Create your first company to get started!</p>
                <button
                  onClick={() => setCurrentView('create')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Company
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => selectCompany(company)}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                    <p className="text-gray-600 mb-1">Industry: {company.industry}</p>
                    <p className="text-gray-600 mb-1">Product: {company.product_service}</p>
                    <p className="text-gray-600 mb-4">Target: {company.target_audience}</p>
                    <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Generate Ads
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Company View */}
        {currentView === 'create' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Company</h2>
            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry *
                  </label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({...companyForm, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product/Service *
                  </label>
                  <input
                    type="text"
                    value={companyForm.product_service}
                    onChange={(e) => setCompanyForm({...companyForm, product_service: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience *
                  </label>
                  <input
                    type="text"
                    value={companyForm.target_audience}
                    onChange={(e) => setCompanyForm({...companyForm, target_audience: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Description
                  </label>
                  <textarea
                    value={companyForm.brand_description}
                    onChange={(e) => setCompanyForm({...companyForm, brand_description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Company'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Generate Ad View */}
        {currentView === 'generate' && selectedCompany && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Generate Ads for {selectedCompany.name}
              </h2>
              <button
                onClick={() => setCurrentView('companies')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Companies
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ad Generation Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Ad</h3>
                <form onSubmit={handleGenerateAd} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad Type
                    </label>
                    <select
                      value={adForm.ad_type}
                      onChange={(e) => setAdForm({...adForm, ad_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="banner">Banner</option>
                      <option value="square">Square</option>
                      <option value="story">Story</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style
                    </label>
                    <select
                      value={adForm.style}
                      onChange={(e) => setAdForm({...adForm, style: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Prompt (Optional)
                    </label>
                    <textarea
                      value={adForm.custom_prompt}
                      onChange={(e) => setAdForm({...adForm, custom_prompt: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Additional requirements for your ad..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Generating...' : 'Generate Ad'}
                  </button>
                </form>
              </div>

              {/* Company Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Company Details</h3>
                <div className="space-y-2">
                  <p><strong>Industry:</strong> {selectedCompany.industry}</p>
                  <p><strong>Product:</strong> {selectedCompany.product_service}</p>
                  <p><strong>Target Audience:</strong> {selectedCompany.target_audience}</p>
                  {selectedCompany.brand_description && (
                    <p><strong>Brand:</strong> {selectedCompany.brand_description}</p>
                  )}
                  {selectedCompany.website && (
                    <p><strong>Website:</strong> 
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                        {selectedCompany.website}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Generated Ads */}
            {generatedAds.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Generated Ads</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedAds.map((ad) => (
                    <div key={ad.id} className="bg-white rounded-lg shadow-md p-4">
                      <img
                        src={`data:image/png;base64,${ad.image_data}`}
                        alt="Generated Ad"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <div className="text-sm text-gray-600 mb-2">
                        <p>Type: {ad.ad_type} | Style: {ad.style}</p>
                        <p>Created: {new Date(ad.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => downloadImage(ad.image_data, `${selectedCompany.name}_ad_${ad.id}.png`)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;