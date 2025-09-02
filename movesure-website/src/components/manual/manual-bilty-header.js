'use client';

import { 
  FileText, Plus, Download, Building2, ChevronDown, Check, Users, Calendar
} from 'lucide-react';

const ManualBiltyHeader = ({
  selectedBranch,
  branches,
  showBranchDropdown,
  setShowBranchDropdown,
  loadingBranches,
  handleBranchSelect,
  handleNewRecord,
  handleExport,
  loading
}) => {
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
          <div className="flex items-center gap-4">
            {/* Branch Selector */}
            <div className="relative z-[49]">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-3 hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg min-w-[200px] justify-between"
                disabled={loadingBranches}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {selectedBranch ? selectedBranch.branch_name : 'Select Branch'}
                    </div>
                    {selectedBranch && (
                      <div className="text-xs text-blue-200">
                        {selectedBranch.branch_code} • {selectedBranch.city_code}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showBranchDropdown ? 'rotate-180' : ''}`} />
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

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewRecord}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Alt + N"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Entry</span>
              </button>

              <button
                onClick={handleExport}
                disabled={loading}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-3 hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBiltyHeader;
