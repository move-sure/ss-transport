'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Weight, 
  DollarSign, 
  FileText,
  Users,
  MapPin,
  Truck,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Navbar from '../../components/dashboard/navbar';
import { useAuth } from '../utils/auth';
import StatCard from '../../components/analytics/stat-card';
import BarChart from '../../components/analytics/bar-chart';
import LineChart from '../../components/analytics/line-chart';
import PieChart from '../../components/analytics/pie-chart';
import InteractiveBarChart from '../../components/analytics/interactive-bar-chart';
import StaffPerformanceCard from '../../components/analytics/staff-performance-card';
import AnalyticsPDFGenerator from '../../components/analytics/analytics-pdf-generator';

export default function AnalyticsPage() {
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id) {
      fetchAnalytics();
    }
  }, [mounted, user?.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics?userId=${user.id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setAnalyticsData(result.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const formatNumber = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(0);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              </div>
              <p className="text-gray-600">Business insights and performance metrics</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Analytics</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && !error && analyticsData && (
          <div className="space-y-8">
            {/* PDF Download Button */}
            <div className="flex justify-end">
              <AnalyticsPDFGenerator analyticsData={analyticsData} />
            </div>

            {/* Combined Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Combined Revenue"
                value={formatCurrency(analyticsData.biltyStats.totalRevenue + analyticsData.summaryStats.totalAmount)}
                icon={DollarSign}
                color="green"
                subtitle={`Bilty: ${formatCurrency(analyticsData.biltyStats.totalRevenue)} + Summary: ${formatCurrency(analyticsData.summaryStats.totalAmount)}`}
              />
              <StatCard
                title="Total Records"
                value={formatNumber(analyticsData.biltyStats.totalBilty + analyticsData.summaryStats.totalRecords)}
                icon={FileText}
                color="blue"
                subtitle={`Bilty: ${formatNumber(analyticsData.biltyStats.totalBilty)} + Summary: ${formatNumber(analyticsData.summaryStats.totalRecords)}`}
              />
              <StatCard
                title="Total Packages"
                value={formatNumber(analyticsData.biltyStats.totalPackages + analyticsData.summaryStats.totalPackets)}
                icon={Package}
                color="purple"
                subtitle={`Bilty: ${formatNumber(analyticsData.biltyStats.totalPackages)} + Summary: ${formatNumber(analyticsData.summaryStats.totalPackets)}`}
              />
              <StatCard
                title="Total Weight"
                value={`${formatNumber(analyticsData.biltyStats.totalWeight + analyticsData.summaryStats.totalWeight)} kg`}
                icon={Weight}
                color="orange"
                subtitle={`Bilty: ${formatNumber(analyticsData.biltyStats.totalWeight)}kg + Summary: ${formatNumber(analyticsData.summaryStats.totalWeight)}kg`}
              />
            </div>

            {/* Bilty Type Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Regular Bilty Stats */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Regular Bilty</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">System-generated bilty records</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Revenue:</span>
                    <span className="text-lg font-bold text-blue-900">{formatCurrency(analyticsData.biltyStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Bilty Count:</span>
                    <span className="text-lg font-bold text-blue-900">{formatNumber(analyticsData.biltyStats.totalBilty)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Packages:</span>
                    <span className="text-lg font-bold text-blue-900">{formatNumber(analyticsData.biltyStats.totalPackages)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Weight:</span>
                    <span className="text-lg font-bold text-blue-900">{formatNumber(analyticsData.biltyStats.totalWeight)} kg</span>
                  </div>
                </div>
              </div>

              {/* Manual Bilty Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-900">Manual Bilty</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Station-wise manual entry bilty</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Revenue:</span>
                    <span className="text-lg font-bold text-purple-900">{formatCurrency(analyticsData.summaryStats.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Bilty Count:</span>
                    <span className="text-lg font-bold text-purple-900">{formatNumber(analyticsData.summaryStats.totalRecords)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Packets:</span>
                    <span className="text-lg font-bold text-purple-900">{formatNumber(analyticsData.summaryStats.totalPackets)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Weight:</span>
                    <span className="text-lg font-bold text-purple-900">{formatNumber(analyticsData.summaryStats.totalWeight)} kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Combined Monthly Trend */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Combined Monthly Revenue Trend</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LineChart
                  data={analyticsData.monthlyTrend}
                  xKey="month"
                  yKey="revenue"
                  title="Bilty Monthly Revenue"
                  color="blue"
                />
                <LineChart
                  data={analyticsData.summaryMonthlyTrend}
                  xKey="month"
                  yKey="amount"
                  title="Summary Monthly Amount"
                  color="purple"
                />
              </div>
            </div>

            {/* Payment Distribution Comparison */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Distribution Comparison</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieChart
                  data={analyticsData.paymentModeStats}
                  labelKey="mode"
                  valueKey="total"
                  title="Payment Mode (Bilty)"
                />
                <PieChart
                  data={analyticsData.summaryPaymentStats}
                  labelKey="status"
                  valueKey="amount"
                  title="Payment Status (Summary)"
                />
              </div>
            </div>

            {/* Revenue Breakdown (Bilty Only) */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Bilty Revenue Breakdown by Charge Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                {[
                  { label: 'Freight', value: analyticsData.revenueStats?.freight || 0, color: 'blue' },
                  { label: 'Labour', value: analyticsData.revenueStats?.labour || 0, color: 'green' },
                  { label: 'Bill', value: analyticsData.revenueStats?.bill || 0, color: 'purple' },
                  { label: 'Toll', value: analyticsData.revenueStats?.toll || 0, color: 'orange' },
                  { label: 'DD', value: analyticsData.revenueStats?.dd || 0, color: 'red' },
                  { label: 'Other', value: analyticsData.revenueStats?.other || 0, color: 'indigo' },
                  { label: 'PF', value: analyticsData.revenueStats?.pf || 0, color: 'pink' },
                ].map((item, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <p className="text-sm text-gray-600 mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(item.value)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analyticsData.biltyStats?.totalRevenue > 0 ? ((item.value / analyticsData.biltyStats.totalRevenue) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer & Consignor Comparison */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Customers & Consignors Comparison</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InteractiveBarChart
                  data={analyticsData.topCustomers}
                  xKey="name"
                  yKey="totalRevenue"
                  title="Top 10 Customers (Bilty)"
                  color="green"
                />
                <InteractiveBarChart
                  data={analyticsData.summaryTopConsignors}
                  xKey="name"
                  yKey="amount"
                  title="Top 10 Consignors (Summary)"
                  color="indigo"
                />
              </div>
            </div>

            {/* Consignees Analysis */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Consignees Analysis (Summary Data)</h3>
              <InteractiveBarChart
                data={analyticsData.summaryTopConsignees}
                xKey="name"
                yKey="amount"
                title="Top 10 Consignees"
                color="blue"
              />
            </div>

            {/* Station Bilty Count Analysis */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-6 h-6 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900">Station-wise Bilty Distribution</h2>
              </div>
              <p className="text-gray-600">Bilty count comparison across all stations (Regular + Manual)</p>
            </div>

            {/* Station Bilty Count Interactive Chart */}
            <InteractiveBarChart
              data={Object.entries(analyticsData.stationBiltyCount || {}).map(([station, count]) => ({
                station,
                count
              })).sort((a, b) => b.count - a.count)}
              xKey="station"
              yKey="count"
              title="Bilty Count per Station"
              color="orange"
              onBarClick={(data) => console.log('Clicked station:', data)}
            />

            {/* Staff Performance Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Staff Performance Overview</h2>
              </div>
              <p className="text-gray-600">Top performing staff across regular and manual bilty operations</p>
            </div>

            {/* Top 10 Staff Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyticsData.staffPerformance.slice(0, 10).map((staff, index) => (
                <StaffPerformanceCard key={staff.staffId} staff={staff} rank={index + 1} />
              ))}
            </div>

            {/* Staff Performance Bar Chart */}
            <InteractiveBarChart
              data={analyticsData.staffPerformance.slice(0, 15)}
              xKey="staffName"
              yKey="totalRevenue"
              title="Top 15 Staff by Total Revenue (Regular + Manual Bilty)"
              color="green"
            />

            {/* Station & Delivery Type Analysis */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Station & Delivery Type Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart
                  data={analyticsData.stationStats}
                  xKey="station"
                  yKey="totalAmount"
                  title="Top 10 Stations by Revenue"
                  color="orange"
                />
                <div className="space-y-6">
                  <PieChart
                    data={analyticsData.deliveryTypeStats}
                    labelKey="type"
                    valueKey="total"
                    title="Delivery Type (Bilty)"
                  />
                  <PieChart
                    data={analyticsData.summaryDeliveryStats}
                    labelKey="type"
                    valueKey="amount"
                    title="Delivery Type (Summary)"
                  />
                </div>
              </div>
            </div>

            {/* Detailed Staff Performance Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Staff Performance Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Staff Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Post</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-blue-700">Regular Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-blue-700">Regular Count</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-purple-700">Manual Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-purple-700">Manual Count</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-green-700">Total Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-green-700">Total Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.staffPerformance.map((staff, index) => (
                      <tr key={staff.staffId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 font-bold">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `#${index + 1}`}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">{staff.staffName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{staff.staffPost}</td>
                        <td className="py-3 px-4 text-sm text-blue-900 text-right font-medium">
                          {formatCurrency(staff.regularRevenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-blue-600 text-right">{staff.regularCount}</td>
                        <td className="py-3 px-4 text-sm text-purple-900 text-right font-medium">
                          {formatCurrency(staff.manualRevenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-purple-600 text-right">{staff.manualCount}</td>
                        <td className="py-3 px-4 text-lg text-green-900 text-right font-bold">
                          {formatCurrency(staff.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-green-700 text-right font-semibold">{staff.totalCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Station Performance with Bilty Count */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Station-wise Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Station</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Bilty Count</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Packets</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Weight (kg)</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-green-700">Paid</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-orange-700">To Pay</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-blue-700">Avg/Bilty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.stationStats.map((station, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">{station.station}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-bold">
                          {formatCurrency(station.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right font-semibold">{station.count}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{station.packets}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {station.weight.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-green-600 text-right font-medium">{station.paid}</td>
                        <td className="py-3 px-4 text-sm text-orange-600 text-right font-medium">{station.toPay}</td>
                        <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">
                          {formatCurrency(station.totalAmount / station.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-800">
                <Calendar className="h-4 w-4" />
                <span>Data updated in real-time • Last refresh: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}