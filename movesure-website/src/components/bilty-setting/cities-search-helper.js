// Helper functions for cities management

export const searchCities = (cities, searchTerm) => {
  if (!searchTerm.trim()) return cities;
  
  const searchLower = searchTerm.toLowerCase();
  return cities.filter(city => 
    city.city_code?.toLowerCase().includes(searchLower) ||
    city.city_name?.toLowerCase().includes(searchLower)
  );
};

export const findDuplicateCityNames = (cities) => {
  const nameCount = {};
  const duplicates = new Set();
  
  cities.forEach(city => {
    const name = city.city_name?.toLowerCase().trim();
    if (name) {
      nameCount[name] = (nameCount[name] || 0) + 1;
      if (nameCount[name] > 1) {
        duplicates.add(name);
      }
    }
  });
  
  return duplicates;
};

export const filterDuplicateCities = (cities) => {
  const duplicateNames = findDuplicateCityNames(cities);
  return cities.filter(city => 
    duplicateNames.has(city.city_name?.toLowerCase().trim())
  );
};

export const sortCities = (cities, sortBy = 'name', order = 'asc') => {
  return [...cities].sort((a, b) => {
    let aVal, bVal;
    
    switch(sortBy) {
      case 'code':
        aVal = a.city_code || '';
        bVal = b.city_code || '';
        break;
      case 'name':
      default:
        aVal = a.city_name || '';
        bVal = b.city_name || '';
        break;
    }
    
    const comparison = aVal.localeCompare(bVal);
    return order === 'asc' ? comparison : -comparison;
  });
};

export const exportToCSV = (cities, filename = 'cities') => {
  if (cities.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = ['City Code', 'City Name'];
  const csvContent = [
    headers.join(','),
    ...cities.map(city => [
      `"${city.city_code || ''}"`,
      `"${city.city_name || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return cities.length;
};

export const validateCityCode = (code) => {
  if (!code || !code.trim()) return 'City code is required';
  if (code.length < 2) return 'City code must be at least 2 characters';
  if (code.length > 10) return 'City code must be less than 10 characters';
  return null;
};

export const validateCityName = (name) => {
  if (!name || !name.trim()) return 'City name is required';
  if (name.length < 2) return 'City name must be at least 2 characters';
  if (name.length > 100) return 'City name must be less than 100 characters';
  return null;
};
