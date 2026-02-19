'use client';

import { useState } from 'react';
import { 
  FileText, Plus, Download, Building2, ChevronDown, Check, Users, Calendar, Archive, X, AlertCircle
} from 'lucide-react';
import SampleLoadingChallan from '../transit/SampleLoadingChallan';
import ManualLoadingChallan from './manual-loading-challan';

const ManualBiltyHeader = ({
  selectedBranch,
  branches,
  showBranchDropdown,
  setShowBranchDropdown,
  loadingBranches,
  handleBranchSelect,
  handleNewRecord,
  handleExport,
  handleOpenArchive,
  loading
}) => {
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const handleBlockedExport = () => {
    setShowBlockedModal(true);
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
      
      <div className="relative p-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          {/* Left Section - Title and Description */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Manual Bilty Management
              </h1>
              <p className="text-blue-100 text-lg font-medium">
                Manage consignor, consignee & GRs with speed and accuracy.
              </p>
              <div className="flex items-center gap-4 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Multi-branch Operations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>Instant Sync & Updates</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Section - Controls */}
          <div className="flex flex-col items-end gap-3">
            {/* Top Row - Branch Selector + Primary Action */}
            <div className="flex items-center gap-3">
              {/* Branch Selector */}
              <div className="relative z-[49]">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-3 hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg min-w-[190px] justify-between"
                  disabled={loadingBranches}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4.5 h-4.5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {selectedBranch ? selectedBranch.branch_name : 'Select Branch'}
                      </div>
                      {selectedBranch && (
                        <div className="text-[11px] text-blue-200">
                          {selectedBranch.branch_code} • {selectedBranch.city_code}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showBranchDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Enhanced Branch Dropdown */}
                {showBranchDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-[48]" 
                      onClick={() => setShowBranchDropdown(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[49] max-h-80 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                        <h3 className="font-semibold text-gray-900">Select Branch</h3>
                        <p className="text-sm text-gray-600">Choose your working branch</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-gray-100 pb-2">
                        {loadingBranches ? (
                          <div className="px-6 py-8 text-center text-gray-500">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="font-medium">Loading branches...</p>
                          </div>
                        ) : branches.length > 0 ? (
                          <div className="py-2">
                            {branches.map((branch) => (
                              <button
                                key={branch.id}
                                onClick={() => handleBranchSelect(branch)}
                                className={`w-full text-left px-6 py-4 hover:bg-blue-50 transition-all duration-200 flex items-center justify-between group border-b border-gray-50 last:border-b-0 ${
                                  selectedBranch?.id === branch.id ? 'bg-blue-100 border-r-4 border-blue-500' : ''
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className={`font-semibold ${selectedBranch?.id === branch.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                    {branch.branch_name}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
                                      {branch.branch_code}
                                    </span>
                                    <span>•</span>
                                    <span>{branch.city_code}</span>
                                  </div>
                                </div>
                                {selectedBranch?.id === branch.id && (
                                  <Check className="w-5 h-5 text-blue-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center text-gray-500">
                            <Building2 className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No branches found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleNewRecord}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Alt + N"
              >
                <Plus className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">New Entry</span>
              </button>
            </div>

            {/* Bottom Row - Secondary Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenArchive}
                className="bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 hover:bg-white/20 transition-all duration-300 border border-white/20"
                title="View Archived Bilties"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden lg:inline">Archive</span>
              </button>

              <button
                onClick={handleBlockedExport}
                disabled={loading}
                className="bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 hover:bg-white/20 transition-all duration-300 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-white/20 mx-0.5"></div>

              {/* Challan Actions Group */}
              <SampleLoadingChallan 
                userBranch={selectedBranch}
                permanentDetails={null}
              />
              
              <ManualLoadingChallan
                userBranch={selectedBranch}
                branches={branches}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Export Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 backdrop-blur-md backdrop-saturate-150 bg-slate-900/20 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-lg w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_45px_rgba(15,23,42,0.25)] border border-white/40 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="absolute inset-x-6 -top-2 h-1 rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-purple-500" aria-hidden="true"></div>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-t-3xl p-6 pb-8 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Talk with Eklavya</h2>
                  <p className="text-orange-100 text-sm">एक्लव्य से बात करें</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* English Message */}
              <div className="bg-gradient-to-br from-orange-50 via-rose-50 to-white border border-orange-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  English
                </h3>
                <p className="text-orange-800 leading-relaxed text-[15px]">
                  Please contact <span className="font-bold text-red-600">EKLAVYA SINGH</span> for more information. 
                  This export service has been blocked.
                </p>
              </div>

              {/* Hindi Message */}
              <div className="bg-gradient-to-br from-sky-50 via-indigo-50 to-white border border-sky-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🇮🇳</span>
                  हिंदी
                </h3>
                <p className="text-blue-800 leading-relaxed text-[15px]">
                  कृपया अधिक जानकारी के लिए <span className="font-bold text-red-600">एक्लव्य सिंह</span> से संपर्क करें। 
                  यह एक्सपोर्ट सेवा बंद कर दी गई है।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBlockedModal(false)}
                  className="flex-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-[0_15px_35px_rgba(79,70,229,0.35)] text-white font-semibold py-3.5 px-6 rounded-2xl transition-all"
                >
                  समझ गया / Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualBiltyHeader;
