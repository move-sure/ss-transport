'use client';

import { useState, useEffect } from 'react';

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Empty for now - will be populated later
  useEffect(() => {
    // Placeholder for future notification fetching
    setNotifications([
      {
        id: 1,
        title: 'Welcome to MoveSure Dashboard',
        message: 'Your dashboard is ready to use. Start creating bilties and challans.',
        type: 'info',
        time: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        title: 'System Update',
        message: 'New features have been added to the bilty creation module.',
        type: 'success',
        time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        read: false
      }
    ]);
  }, [userId]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const time = new Date(dateString);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayNotifications = showAll ? notifications : notifications.slice(0, 3);

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showAll ? 'Show Less' : 'View All'}
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔔</span>
              </div>
              <p className="text-gray-500">No notifications yet</p>              <p className="text-sm text-gray-400 mt-1">
                You&apos;ll see important updates here
              </p>
            </div>
          ) : (
            displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                  getNotificationBg(notification.type)
                } ${notification.read ? 'opacity-70' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        notification.read ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTimeAgo(notification.time)}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      notification.read ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div className="mt-2">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 3 && !showAll && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View {notifications.length - 3} more notifications
            </button>
          </div>
        )}

        {notifications.length > 0 && unreadCount > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
