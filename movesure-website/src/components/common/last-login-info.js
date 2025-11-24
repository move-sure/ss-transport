'use client';

export default function LastLoginInfo({ data, loading }) {
  const loginInfo = data || { lastLogin: null, totalLogins: 0 };

  const formatLastLogin = (loginTime) => {
    if (!loginTime) return 'Never';
    
    const now = new Date();
    const login = new Date(loginTime);
    const diffInMinutes = Math.floor((now - login) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return login.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
            <span className="mr-2">�</span> Last Login
          </h3>
          <p className="text-lg font-bold text-gray-900">
            {formatLastLogin(loginInfo.lastLogin?.login_time)}
          </p>
          {loginInfo.lastLogin && (
            <p className="text-xs text-gray-600 mt-1">
              {new Date(loginInfo.lastLogin.login_time).toLocaleString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            {loginInfo.totalLogins}
          </div>
          <p className="text-xs text-gray-600">Total Logins</p>
        </div>
      </div>
    </div>
  );
}
