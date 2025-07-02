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
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Loading transport directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          SS Transport City With Mobile Number List
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
          Find transporters and logistics providers across India
        </p>
        <div className="mt-4 flex justify-center items-center space-x-4 text-xs md:text-sm text-gray-500">
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
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 border border-gray-100">
        <div className="relative" ref={searchRef}>
          <label htmlFor="citySearch" className="block text-sm md:text-base font-semibold text-gray-800 mb-2">
            Search by City
          </label>
          <div className="relative">
            <input
              id="citySearch"
              type="text"
              value={searchCity}
              onChange={handleSearchChange}
              onFocus={() => searchCity.length > 0 && setShowDropdown(true)}
              placeholder="Enter city name or code..."
              className="w-full px-4 py-3 pl-10 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base transition-all"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchCity && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && filteredCities.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none transition-all"
                >
                  <div className="font-semibold text-gray-900 text-sm">{city.city_name}</div>
                  <div className="text-xs text-gray-500">Code: {city.city_code}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected City Info */}
        {selectedCity && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-blue-900 text-sm">Showing results for: </span>
                <span className="text-blue-800 font-bold text-sm">{selectedCity.city_name}</span>
                <span className="text-blue-600 ml-2 text-xs">({selectedCity.city_code})</span>
              </div>
              <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
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
          <span className="ml-2 text-gray-600 text-sm">Filtering transporters...</span>
        </div>
      )}

      {/* All Transporters Display */}
      {!searchLoading && (
        <div className="space-y-6">
          {selectedCity ? (
            // Show filtered results for selected city
            filteredTransports.length > 0 ? (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  Transporters in {selectedCity.city_name}
                  <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {filteredTransports.length} found
                  </span>
                </h2>
                <TransportsList transports={filteredTransports} />
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transporters found</h3>
                <p className="text-gray-500 text-sm">There are no transporters registered in {selectedCity.city_name} yet.</p>
                <button
                  onClick={clearSearch}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  View All Transporters
                </button>
              </div>
            )
          ) : (
            // Show all transporters grouped by city
            Object.keys(groupedTransports).length > 0 ? (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  All Transporters by City
                  <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {allTransports.length} total
                  </span>
                </h2>
                
                {Object.entries(groupedTransports)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cityName, cityTransports]) => (
                    <div key={cityName} className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center">
                          {cityName}
                          <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {cityTransports.length} transporters
                          </span>
                        </h3>
                      </div>
                      
                      <TransportsList transports={cityTransports} />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 003.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transporters available</h3>
                <p className="text-gray-500 text-sm">No transporters are currently registered in the directory.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

// Copy Button Component
const CopyButton = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded-md hover:bg-gray-100 transition-colors flex items-center"
      title={`Copy ${label}`}
    >
      {copied ? (
        <div className="flex items-center text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs ml-1 font-medium">Copied</span>
        </div>
      ) : (
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

// Transports List Component
const TransportsList = ({ transports }) => {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile Number
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transports.map((transport) => (
                <tr key={transport.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transport.transport_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{transport.city_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transport.mob_number && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a 
                          href={`tel:${transport.mob_number}`}
                          className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {transport.mob_number}
                        </a>
                        <CopyButton text={transport.mob_number} label="mobile number" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {transports.map((transport) => (
          <div key={transport.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="space-y-3">
              <div className="font-semibold text-gray-900 text-sm">
                {transport.transport_name}
              </div>
              <div className="text-sm text-gray-600">
                {transport.city_name}
              </div>
              {transport.mob_number && (
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 mt-2">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a 
                      href={`tel:${transport.mob_number}`}
                      className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {transport.mob_number}
                    </a>
                  </div>
                  <CopyButton text={transport.mob_number} label="mobile number" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default StationSearch;
