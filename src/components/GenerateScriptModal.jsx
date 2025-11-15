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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Generate AI Script</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" disabled={isGenerating}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Product/Service</label>
              <input type="text" name="product" value={formData.product} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g., Acme CRM" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name & Role</label>
              <input type="text" name="yourName" value={formData.yourName} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g., Alex, Sales Rep" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action (Goal)*</label>
              <input type="text" name="cta" value={formData.cta} onChange={handleChange} required className="w-full p-2 border rounded-md" />
            </div>
            
            {/* Column 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Niche</label>
              <input type="text" name="niche" value={formData.niche} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g., CTOs at tech startups" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Business Name</label>
              <input type="text" name="yourBusiness" value={formData.yourBusiness} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g., Acme Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Customer Pain Point*</label>
              <input type="text" name="painPoint" value={formData.painPoint} onChange={handleChange} required className="w-full p-2 border rounded-md" />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md mr-3 hover:bg-gray-300" disabled={isGenerating}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
