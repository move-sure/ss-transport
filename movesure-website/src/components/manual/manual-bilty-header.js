'use client';

import { 
  FileText, Plus, Download, Building2, ChevronDown, Check
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
    <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl shadow-2xl p-6 mb-6 border border-purple-200">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Manual Bilty Summary</h1>
              <p className="text-purple-100">Manual entry and management of Manual bilty records</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-100 transition-all border border-gray-300 shadow-sm"
              disabled={loadingBranches}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedBranch ? selectedBranch.branch_name : 'Select Branch'}
              </span>
              <span className="sm:hidden">
                {selectedBranch ? selectedBranch.branch_code : 'Branch'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Branch Dropdown */}
            {showBranchDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowBranchDropdown(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-auto">
                  {loadingBranches ? (
                    <div className="px-4 py-3 text-center text-gray-500">
                      <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading branches...
                    </div>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchSelect(branch)}
                        className={`w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center justify-between ${
                          selectedBranch?.id === branch.id ? 'bg-purple-100 text-purple-700' : 'text-gray-900'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{branch.branch_name}</div>
                          <div className="text-sm text-gray-500">{branch.branch_code} - {branch.city_code}</div>
                        </div>
                        {selectedBranch?.id === branch.id && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-500">
                      No branches found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleNewRecord}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-50 transition-all shadow-lg"
            title="Alt + N"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>

          <button
            onClick={handleExport}
            disabled={loading}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-100 transition-all border border-gray-300 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualBiltyHeader;
