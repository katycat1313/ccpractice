import React, { useState } from 'react';
import { X, Sparkles, Hammer, Bot, PhoneCall, DollarSign } from 'lucide-react';

const PRESET_OFFERINGS = [
  {
    id: 'contractor-paas',
    name: 'Contractor Management PaaS',
    icon: Hammer,
    color: 'from-amber-500 to-orange-600',
    data: {
      product: 'Custom Contractor Management Platform (Job dispatch, sub tracking, digital change orders, mobile draws)',
      yourName: 'Alex, Solutions Architect',
      yourBusiness: 'BuildSync Technologies',
      niche: 'Roofing, HVAC, Plumbing & General Contractors',
      painPoint: 'Losing thousands on unbilled change orders, messy paper job tickets, and bloated $400/mo software crews refuse to use',
      cta: 'Book a 15-minute live screen share and custom workflow audit',
      customerBusiness: 'Local Trade Contractor'
    }
  },
  {
    id: 'ai-receptionist',
    name: '24/7 AI Receptionist',
    icon: Bot,
    color: 'from-blue-500 to-indigo-600',
    data: {
      product: '24/7 AI Receptionist & Emergency Triage System (Direct calendar booking, quote screening, call recording)',
      yourName: 'Alex, Founder',
      yourBusiness: 'Apex Voice Automations',
      niche: 'Emergency Plumbing, HVAC, Roofing & Service Contractors',
      painPoint: 'Missing $2,500+ emergency customer calls while on ladders or under sinks that immediately call competitors on Google',
      cta: 'Text a live demo phone number to test-call the AI right now',
      customerBusiness: 'Residential Trade Business'
    }
  },
  {
    id: 'missed-call-text',
    name: 'Missed Call Text Back',
    icon: PhoneCall,
    color: 'from-emerald-500 to-teal-600',
    data: {
      product: 'Instant 5-Second Missed Call Text Back & Quote Rescue Engine',
      yourName: 'Alex, Automation Specialist',
      yourBusiness: 'FastLead Systems',
      niche: 'Busy Independent Contractors & Local Service Businesses',
      painPoint: '62% of missed callers hire the next contractor on Google within 90 seconds if no immediate response',
      cta: 'Run a 3-minute simulated missed call test to see the customer experience',
      customerBusiness: 'Local Home Services'
    }
  },
  {
    id: 'freelance-deposit',
    name: 'Freelance Dev (50% Deposit Close)',
    icon: DollarSign,
    color: 'from-purple-500 to-pink-600',
    data: {
      product: 'Custom Client Portal & Workflow Automation Engineering (Dedicated Sprint Model)',
      yourName: 'Alex, Lead Developer',
      yourBusiness: 'Peak Digital Engineering',
      niche: 'Growing Local Businesses & Agencies Needing Custom Software',
      painPoint: 'Stuck with off-the-shelf software limitations; need custom portal but worried about paying 50% upfront deposits',
      cta: 'Lock in a dedicated development sprint with a milestone-protected 50% kickoff deposit',
      customerBusiness: 'Small Business Owner'
    }
  }
];

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

  const handleSelectPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      ...preset.data
    }));
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Modal */}
      <div className="relative z-50 rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 bg-slate-900 border border-slate-700 text-white my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Generate Sales Script</h2>
              <p className="text-xs text-slate-400">Choose a pre-configured high-ticket offering or enter custom details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Offerings Presets */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Quick 1-Click Offer Presets:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {PRESET_OFFERINGS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = formData.product.includes(preset.data.product.slice(0, 20));
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40'
                      : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${preset.color} text-white mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-100 leading-tight">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product" className="block text-xs font-medium text-slate-300 mb-1">
                Your Product / Service Offering *
              </label>
              <input
                type="text"
                id="product"
                name="product"
                value={formData.product}
                onChange={handleChange}
                required
                placeholder="e.g. Custom Contractor PaaS"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="niche" className="block text-xs font-medium text-slate-300 mb-1">
                Target Niche / Prospects *
              </label>
              <input
                type="text"
                id="niche"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                required
                placeholder="e.g. Roofing & HVAC trade contractors"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="yourName" className="block text-xs font-medium text-slate-300 mb-1">
                Your Name & Role
              </label>
              <input
                type="text"
                id="yourName"
                name="yourName"
                value={formData.yourName}
                onChange={handleChange}
                placeholder="e.g. Alex, Founder"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="yourBusiness" className="block text-xs font-medium text-slate-300 mb-1">
                Your Business / Brand Name
              </label>
              <input
                type="text"
                id="yourBusiness"
                name="yourBusiness"
                value={formData.yourBusiness}
                onChange={handleChange}
                placeholder="e.g. BuildSync PaaS"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="painPoint" className="block text-xs font-medium text-slate-300 mb-1">
                Key Customer Pain Point / Problem Solved *
              </label>
              <textarea
                rows={2}
                id="painPoint"
                name="painPoint"
                value={formData.painPoint}
                onChange={handleChange}
                required
                placeholder="e.g. Losing emergency calls while on ladders, unbilled change orders, or fears over 50% deposit"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="cta" className="block text-xs font-medium text-slate-300 mb-1">
                Call to Action (Goal of Call) *
              </label>
              <input
                type="text"
                id="cta"
                name="cta"
                value={formData.cta}
                onChange={handleChange}
                required
                placeholder="e.g. Book 15-min demo, test live AI phone number, or close with 50% kickoff deposit"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/40 border border-red-500 rounded-lg text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-sm font-semibold text-white shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Building Script...' : 'Generate Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
