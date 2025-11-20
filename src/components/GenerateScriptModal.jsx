import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function GenerateScriptModal({ onSubmit, onClose, isGenerating, error }) {
  const [formData, setFormData] = useState({
    product: '',
    niche: '',
    customerBusiness: '',
    painPoint: 'Solve a critical business problem',
    cta: 'Book a discovery call',
    yourBusiness: '',
    yourName: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isGenerating) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
      {/* Animated Background Shapes */}
      <div className="fixed inset-0 z-10 overflow-hidden pointer-events-none">
        <div className="floating-shape absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="floating-shape absolute top-40 right-20 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full blur-2xl"></div>
        <div className="floating-shape absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300 bg-opacity-15 rounded-full blur-xl"></div>
        <div className="floating-shape absolute bottom-32 right-1/3 w-56 h-56 bg-blue-300 bg-opacity-10 rounded-full blur-2xl"></div>
        <div className="floating-shape absolute top-1/3 right-10 w-24 h-24 bg-yellow-200 bg-opacity-10 rounded-2xl blur-lg transform rotate-45"></div>
        <div className="floating-shape absolute bottom-1/4 left-1/2 w-32 h-32 bg-indigo-300 bg-opacity-15 rounded-2xl blur-xl transform rotate-12"></div>
      </div>

      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-20" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative z-50 rounded-2xl shadow-2xl w-full max-w-2xl p-8 overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 50%, #fce7f3 100%)' }}>
        {/* Popup Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-10 right-16 w-40 h-40 bg-blue-400 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute bottom-16 left-12 w-48 h-48 bg-purple-400 rounded-full opacity-25 blur-2xl"></div>
          <div className="absolute top-40 left-32 w-32 h-32 bg-pink-400 rounded-full opacity-20 blur-xl"></div>
          <div className="absolute bottom-32 right-24 w-36 h-36 bg-indigo-400 rounded-full opacity-30 blur-xl"></div>
        </div>

        {/* Content wrapper */}
        <div className="relative z-10">
          <h2 id="popup-title" className="text-3xl font-bold mb-6 text-gray-800">Generate AI Script</h2>
          <form id="script-form" className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="product" className="block text-sm font-semibold text-gray-700 mb-2">Your Product/Service</label>
                <input type="text" id="product" name="product" value={formData.product} onChange={handleChange} placeholder="e.g., Acme CRM" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label htmlFor="name-role" className="block text-sm font-semibold text-gray-700 mb-2">Your Name & Role</label>
                <input type="text" id="name-role" name="yourName" value={formData.yourName} onChange={handleChange} placeholder="e.g., Alex, Sales Rep" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label htmlFor="cta" className="block text-sm font-semibold text-gray-700 mb-2">Call to Action (Goal)*</label>
                <input type="text" id="cta" name="cta" value={formData.cta} onChange={handleChange} required placeholder="Book a discovery call" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label htmlFor="niche" className="block text-sm font-semibold text-gray-700 mb-2">Target Niche</label>
                <input type="text" id="niche" name="niche" value={formData.niche} onChange={handleChange} placeholder="e.g., CTOs at tech startups" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label htmlFor="business" className="block text-sm font-semibold text-gray-700 mb-2">Your Business Name</label>
                <input type="text" id="business" name="yourBusiness" value={formData.yourBusiness} onChange={handleChange} placeholder="e.g., Acme Inc." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label htmlFor="pain-point" className="block text-sm font-semibold text-gray-700 mb-2">Key Customer Pain Point*</label>
                <input type="text" id="pain-point" name="painPoint" value={formData.painPoint} onChange={handleChange} required placeholder="Solve a critical business problem" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <h3 className="text-lg font-bold text-red-800 mb-2">An error occurred:</h3>
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button type="button" id="cancel-btn" onClick={onClose} disabled={isGenerating} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" id="generate-btn" disabled={isGenerating} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
