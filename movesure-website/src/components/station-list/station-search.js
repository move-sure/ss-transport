'use client';

import { useState, useEffect, useRef } from 'react';
import supabase from '../../app/utils/supabase';

const StationSearch = () => {
  const [cities, setCities] = useState([]);
  const [allTransports, setAllTransports] = useState([]);
  const [transports, setTransports] = useState([]);
  const [filteredTransports, setFilteredTransports] = useState([]);
  const [searchCity, setSearchCity] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Fetch cities and all transports on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter cities based on search input
  const filteredCities = cities.filter(city =>
    city.city_name.toLowerCase().includes(searchCity.toLowerCase()) ||
    city.city_code.toLowerCase().includes(searchCity.toLowerCase())
  );

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch cities
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .order('city_name');

      if (citiesError) throw citiesError;
      setCities(citiesData || []);

      // Fetch all transports
      const { data: transportsData, error: transportsError } = await supabase
        .from('transports')
        .select('*')
        .order('city_name', { ascending: true })
        .order('transport_name', { ascending: true });

      if (transportsError) throw transportsError;
      setAllTransports(transportsData || []);
      setFilteredTransports(transportsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportsByCity = async (cityId) => {
    try {
      setSearchLoading(true);
      const cityTransports = allTransports.filter(transport => transport.city_id === cityId);
      setTransports(cityTransports);
      setFilteredTransports(cityTransports);
    } catch (error) {
      console.error('Error filtering transports:', error);
      alert('Failed to filter transporters. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSearchCity(city.city_name);
    setShowDropdown(false);
    fetchTransportsByCity(city.id);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchCity(value);
    
    if (value.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setSelectedCity(null);
      setTransports([]);
      setFilteredTransports(allTransports);
    }
  };

  const clearSearch = () => {
    setSearchCity('');
    setSelectedCity(null);
    setTransports([]);
    setFilteredTransports(allTransports);
    setShowDropdown(false);
  };

  // Group transports by city for display
  const groupedTransports = filteredTransports.reduce((acc, transport) => {
    const cityName = transport.city_name;
    if (!acc[cityName]) {
      acc[cityName] = [];
    }
    acc[cityName].push(transport);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading transport directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          🚛 Transport Directory
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Find transporters and logistics providers across India. Search by city or browse all available services.
        </p>
        <div className="mt-6 flex justify-center items-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="font-medium text-blue-600">{cities.length}</span>
            <span className="ml-1">Cities</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-green-600">{allTransports.length}</span>
            <span className="ml-1">Transporters</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
        <div className="relative" ref={searchRef}>
          <label htmlFor="citySearch" className="block text-lg font-semibold text-gray-800 mb-3">
            🔍 Search by City
          </label>
          <div className="relative">
            <input
              id="citySearch"
              type="text"
              value={searchCity}
              onChange={handleSearchChange}
              onFocus={() => searchCity.length > 0 && setShowDropdown(true)}
              placeholder="Enter city name or code (e.g., Mumbai, DEL, Bangalore)..."
              className="w-full px-6 py-4 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchCity && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && filteredCities.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
              {filteredCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full px-6 py-4 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none transition-all"
                >
                  <div className="font-semibold text-gray-900">{city.city_name}</div>
                  <div className="text-sm text-gray-500">Code: {city.city_code}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected City Info */}
        {selectedCity && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-blue-900">🎯 Showing results for: </span>
                <span className="text-blue-800 font-bold">{selectedCity.city_name}</span>
                <span className="text-blue-600 ml-2">({selectedCity.city_code})</span>
              </div>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {transports.length} transporters
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading for search */}
      {searchLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Filtering transporters...</span>
        </div>
      )}

      {/* All Transporters Display */}
      {!searchLoading && (
        <div className="space-y-8">
          {selectedCity ? (
            // Show filtered results for selected city
            filteredTransports.length > 0 ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  🚚 Transporters in {selectedCity.city_name}
                  <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {filteredTransports.length} found
                  </span>
                </h2>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredTransports.map((transport) => (
                    <TransportCard key={transport.id} transport={transport} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No transporters found</h3>
                <p className="text-gray-500">There are no transporters registered in {selectedCity.city_name} yet.</p>
                <button
                  onClick={clearSearch}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View All Transporters
                </button>
              </div>
            )
          ) : (
            // Show all transporters grouped by city
            Object.keys(groupedTransports).length > 0 ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  🌍 All Transporters by City
                  <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {allTransports.length} total
                  </span>
                </h2>
                
                {Object.entries(groupedTransports)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cityName, cityTransports]) => (
                    <div key={cityName} className="mb-12">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center">
                          📍 {cityName}
                          <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {cityTransports.length} transporters
                          </span>
                        </h3>
                      </div>
                      
                      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {cityTransports.map((transport) => (
                          <TransportCard key={transport.id} transport={transport} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No transporters available</h3>
                <p className="text-gray-500">No transporters are currently registered in the directory.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

// Transport Card Component
const TransportCard = ({ transport }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:border-blue-300">
      <div className="space-y-4">
        {/* Transport Name */}
        <div className="border-b border-gray-100 pb-3">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-1">
            {transport.transport_name}
          </h3>
          <p className="text-sm text-blue-600 font-medium">{transport.city_name}</p>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          {transport.mob_number && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <a 
                href={`tel:${transport.mob_number}`} 
                className="text-green-700 hover:text-green-900 font-semibold text-sm flex-1 transition-colors"
              >
                {transport.mob_number}
              </a>
            </div>
          )}

          {transport.address && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-gray-600 text-sm line-clamp-3 flex-1">
                {transport.address}
              </span>
            </div>
          )}

          {transport.branch_owner_name && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-gray-700 text-sm font-medium line-clamp-2 flex-1">
                {transport.branch_owner_name}
              </span>
            </div>
          )}

          {transport.gst_number && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-gray-600 text-xs font-mono break-all flex-1">
                {transport.gst_number}
              </span>
            </div>
          )}

          {transport.website && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <a 
                href={transport.website.startsWith('http') ? transport.website : `https://${transport.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 text-sm line-clamp-2 flex-1 transition-colors"
              >
                {transport.website}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationSearch;
