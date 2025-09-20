import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  BarChart3, 
  Plus,
  Shield,
  TrendingUp,
  Eye,
  Crown,
  Download,
  Calendar,
  Activity,
  DollarSign,
  Globe,
  UserCheck,
  Star,
  Heart,
  MessageCircle,
  Flag,
  Wifi
} from 'lucide-react';
import { modelsApi, contentApi, reportsApi, authApi } from '../../services/api';
import { adminApi } from '../../services/api';
import axios from 'axios';

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  totalModels: number;
  totalContent: number;
  totalViews: number;
  pendingReports: number;
  totalComments: number;
  totalLikes: number;
  recentUsers: number;
  topContent: any[];
  topModels: any[];
  recentActivity: any[];
  reportsByReason: any[];
  userGrowth: any[];
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalModels: 0,
    totalContent: 0,
    totalViews: 0,
    pendingReports: 0,
    totalComments: 0,
    totalLikes: 0,
    recentUsers: 0,
    topContent: [],
    topModels: [],
    recentActivity: [],
    reportsByReason: [],
    userGrowth: []
  });
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState({
    onlineUsers: 0,
    activeUsers1h: 0,
    activeUsers24h: 0,
    hourlyActivity: []
  });
  const [contentCharts, setContentCharts] = useState({
    contentByType: [],
    dailyUploads: []
  });

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadDashboardStats();
  }, [user, navigate]);

  const loadDashboardStats = async () => {
    try {
      // Load comprehensive admin stats
      const adminStats = await adminApi.getStats();
      
      setStats({
        totalUsers: adminStats.overview.totalUsers,
        premiumUsers: adminStats.overview.premiumUsers,
        totalModels: adminStats.overview.totalModels,
        totalContent: adminStats.overview.totalContent,
        totalViews: adminStats.overview.totalViews,
        pendingReports: adminStats.overview.pendingReports,
        totalComments: adminStats.overview.totalComments,
        totalLikes: adminStats.overview.totalLikes,
        recentUsers: adminStats.overview.recentUsers,
        topContent: adminStats.topContent || [],
        topModels: adminStats.topModels || [],
        recentActivity: [],
        reportsByReason: adminStats.reportsByReason || [],
        userGrowth: adminStats.userGrowth || []
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Fallback to basic stats if admin endpoint fails
      try {
        const [modelsRes, contentRes, reportsRes] = await Promise.all([
          modelsApi.getAll({ limit: 1 }),
          contentApi.getAll({ limit: 1 }),
          reportsApi.getAll({ limit: 1, status: 'pending' })
        ]);
        
        setStats({
          totalUsers: 0,
          premiumUsers: 0,
          totalModels: modelsRes.pagination?.totalItems || 0,
          totalContent: contentRes.pagination?.totalItems || 0,
          totalViews: 0,
          pendingReports: reportsRes.pagination?.totalItems || 0,
          totalComments: 0,
          totalLikes: 0,
          recentUsers: 0,
          topContent: [],
          topModels: [],
          recentActivity: [],
          reportsByReason: [],
          userGrowth: []
        });
      } catch (fallbackError) {
        console.error('Error loading fallback stats:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (views: number) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(views);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <main className="pt-20 min-h-screen bg-dark-300">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Complete platform overview and management</p>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Online Now"
            value={activeUsers.onlineUsers}
            icon={<Wifi className="w-6 h-6" />}
            color="green"
            loading={loading}
            subtitle="Last 15 minutes"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            loading={loading}
            subtitle={`${stats.recentUsers} new this week`}
          />
          <StatCard
            title="Premium Users"
            value={stats.premiumUsers}
            icon={<Crown className="w-6 h-6" />}
            color="yellow"
            loading={loading}
            subtitle={`${Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% conversion`}
          />
          <StatCard
            title="Pending Reports"
            value={stats.pendingReports}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="orange"
            loading={loading}
            subtitle="Needs attention"
          />
        </div>

        {/* Real-time Activity Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Active Users Real-time */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Real-time Activity</h3>
              </div>
              <div className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                <span className="text-sm">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="text-2xl font-bold text-green-400 mb-1">{activeUsers.onlineUsers}</div>
                <div className="text-xs text-gray-400">Online Now</div>
                <div className="text-xs text-green-300 mt-1">Last 15min</div>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400 mb-1">{activeUsers.activeUsers1h}</div>
                <div className="text-xs text-gray-400">Active</div>
                <div className="text-xs text-blue-300 mt-1">Last hour</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400 mb-1">{activeUsers.activeUsers24h}</div>
                <div className="text-xs text-gray-400">Active</div>
                <div className="text-xs text-purple-300 mt-1">Last 24h</div>
              </div>
            </div>

            {/* Hourly Activity Chart */}
            <div className="mt-6">
              <h4 className="text-white font-medium mb-3">Activity by Hour (Last 24h)</h4>
              <div className="flex items-end space-x-1 h-20">
                {Array.from({ length: 24 }, (_, i) => {
                  const hourData = activeUsers.hourlyActivity.find(h => h.hour === i);
                  const count = hourData?.count || 0;
                  const maxCount = Math.max(...activeUsers.hourlyActivity.map(h => h.count), 1);
                  const height = (count / maxCount) * 100;
                  
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary-500/30 hover:bg-primary-500/50 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${i}:00 - ${count} activities`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>

          {/* Content Performance Charts */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Content Analytics</h3>
            </div>
            
            {/* Content by Type */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Content Distribution</h4>
              <div className="space-y-3">
                {contentCharts.contentByType.map((item, index) => {
                  const total = contentCharts.contentByType.reduce((sum, type) => sum + parseInt(type.count), 0);
                  const percentage = total > 0 ? (parseInt(item.count) / total) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          item.type === 'video' ? 'bg-red-500' :
                          item.type === 'image' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="text-gray-300 capitalize">{item.type}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-dark-300 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.type === 'video' ? 'bg-red-500' :
                              item.type === 'image' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-white font-medium text-sm">{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-300/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{stats.totalContent}</div>
                <div className="text-xs text-gray-400">Total Content</div>
              </div>
              <div className="bg-dark-300/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{formatViews(stats.totalViews)}</div>
                <div className="text-xs text-gray-400">Total Views</div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Models"
            value={stats.totalModels}
            icon={<UserCheck className="w-6 h-6" />}
            color="indigo"
            loading={loading}
            subtitle="Active profiles"
          />
          <StatCard
            title="Total Views"
            value={stats.totalViews}
            icon={<Eye className="w-6 h-6" />}
            color="cyan"
            loading={loading}
            subtitle="All time views"
          />
          <StatCard
            title="Comments"
            value={stats.totalComments}
            icon={<MessageCircle className="w-6 h-6" />}
            color="purple"
            loading={loading}
            subtitle="User engagement"
          />
          <StatCard
            title="Likes"
            value={stats.totalLikes}
            icon={<Heart className="w-6 h-6" />}
            color="red"
            loading={loading}
            subtitle="Content appreciation"
          />
        </div>

        {/* Content Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Models */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Top Models</h3>
              </div>
              <Link
                to="/admin/models"
                className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
              >
                View All →
              </Link>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-12 h-12 bg-dark-300 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-300 rounded w-3/4" />
                      <div className="h-3 bg-dark-300 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : (
                stats.topModels.map((model, index) => (
                  <div key={model.id} className="flex items-center space-x-3 p-3 bg-dark-300/30 rounded-xl hover:bg-dark-300/50 transition-colors">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                      <img
                        src={model.photoUrl}
                        alt={model.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{model.name}</div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Eye size={12} className="mr-1" />
                        <span>{formatViews(model.views)} views</span>
                        <span className="mx-2">•</span>
                        <span>{model.ethnicity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Daily Upload Trends */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Upload Trends</h3>
              </div>
              <Link
                to="/admin/content"
                className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
              >
                View All →
              </Link>
            </div>
            
            {/* Upload Chart */}
            <div className="mb-6">
              <div className="flex items-end space-x-1 h-32">
                {contentCharts.dailyUploads.slice(-7).map((day, index) => {
                  const maxUploads = Math.max(...contentCharts.dailyUploads.map(d => d.uploads), 1);
                  const height = (day.uploads / maxUploads) * 100;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t hover:from-purple-400 hover:to-purple-300 transition-colors"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${new Date(day.date).toLocaleDateString()} - ${day.uploads} uploads`}
                      />
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Upload Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-300/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-400">
                  {contentCharts.dailyUploads.slice(-1)[0]?.uploads || 0}
                </div>
                <div className="text-xs text-gray-400">Today's Uploads</div>
              </div>
              <div className="bg-dark-300/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-400">
                  {Math.round(contentCharts.dailyUploads.reduce((sum, day) => sum + day.uploads, 0) / contentCharts.dailyUploads.length) || 0}
                </div>
                <div className="text-xs text-gray-400">Daily Average</div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* User Analytics */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">User Analytics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Users size={16} className="text-blue-400" />
                  </div>
                  <span className="text-gray-300">Total Registered</span>
                </div>
                <span className="text-white font-bold text-lg">{stats.totalUsers.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Crown size={16} className="text-yellow-400" />
                  </div>
                  <span className="text-gray-300">Premium Members</span>
                </div>
                <span className="text-yellow-400 font-bold text-lg">{stats.premiumUsers.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp size={16} className="text-green-400" />
                  </div>
                  <span className="text-gray-300">New This Week</span>
                </div>
                <span className="text-green-400 font-bold text-lg">{stats.recentUsers.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 size={16} className="text-purple-400" />
                  </div>
                  <span className="text-gray-300">Conversion Rate</span>
                </div>
                <span className="text-purple-400 font-bold text-lg">
                  {Math.round((stats.premiumUsers / stats.totalUsers) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Content Analytics */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Content Analytics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                    <FileText size={16} className="text-purple-400" />
                  </div>
                  <span className="text-gray-300">Total Content</span>
                </div>
                <span className="text-white font-bold text-lg">{stats.totalContent.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Eye size={16} className="text-indigo-400" />
                  </div>
                  <span className="text-gray-300">Total Views</span>
                </div>
                <span className="text-indigo-400 font-bold text-lg">{formatViews(stats.totalViews)}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Heart size={16} className="text-red-400" />
                  </div>
                  <span className="text-gray-300">Total Likes</span>
                </div>
                <span className="text-red-400 font-bold text-lg">{stats.totalLikes.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                    <MessageCircle size={16} className="text-blue-400" />
                  </div>
                  <span className="text-gray-300">Comments</span>
                </div>
                <span className="text-blue-400 font-bold text-lg">{stats.totalComments.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Moderation Analytics */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-3">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Moderation</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                  <span className="text-gray-300">Pending Reports</span>
                </div>
                <span className="text-red-400 font-bold text-lg">{stats.pendingReports}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Shield size={16} className="text-green-400" />
                  </div>
                  <span className="text-gray-300">Active Models</span>
                </div>
                <span className="text-green-400 font-bold text-lg">{stats.totalModels}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-dark-300/30 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Activity size={16} className="text-yellow-400" />
                  </div>
                  <span className="text-gray-300">Content Health</span>
                </div>
                <span className="text-yellow-400 font-bold text-lg">98%</span>
              </div>
              
              <Link
                to="/admin/reports"
                className="block w-full text-center px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all duration-200 border border-red-500/30 font-medium"
              >
                Review Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ActionCard
            title="Manage Models"
            description="Create, edit and manage model profiles"
            icon={<Users className="w-8 h-8" />}
            link="/admin/models"
            color="blue"
            stats={`${stats.totalModels} active models`}
          />
          <ActionCard
            title="Manage Content"
            description="Add and organize content for models"
            icon={<FileText className="w-8 h-8" />}
            link="/admin/content"
            color="green"
            stats={`${stats.totalContent} total items`}
          />
          <ActionCard
            title="Review Reports"
            description="Handle user reports and moderation"
            icon={<AlertTriangle className="w-8 h-8" />}
            link="/admin/reports"
            color="red"
            stats={`${stats.pendingReports} pending`}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Platform Overview</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Metrics */}
            <div className="bg-dark-300/30 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <DollarSign size={16} className="mr-2 text-green-500" />
                Revenue Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Monthly Revenue</span>
                  <span className="text-green-400 font-medium">$12,450</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg. per User</span>
                  <span className="text-white font-medium">$9.99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Growth</span>
                  <span className="text-green-400 font-medium">+15.2%</span>
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-dark-300/30 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <Activity size={16} className="mr-2 text-blue-500" />
                Engagement
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Daily Active Users</span>
                  <span className="text-blue-400 font-medium">{Math.floor(stats.totalUsers * 0.3).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg. Session</span>
                  <span className="text-white font-medium">8.5 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Bounce Rate</span>
                  <span className="text-green-400 font-medium">23.1%</span>
                </div>
              </div>
            </div>

            {/* Content Metrics */}
            <div className="bg-dark-300/30 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <BarChart3 size={16} className="mr-2 text-purple-500" />
                Content Performance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg. Views/Content</span>
                  <span className="text-purple-400 font-medium">
                    {Math.floor(stats.totalViews / (stats.totalContent || 1)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Top Category</span>
                  <span className="text-white font-medium">Videos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Upload Rate</span>
                  <span className="text-green-400 font-medium">+12/day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'indigo' | 'cyan' | 'orange';
  loading: boolean;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading, subtitle }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-400 border-blue-500/20',
    green: 'from-green-500 to-green-600 text-green-400 border-green-500/20',
    red: 'from-red-500 to-red-600 text-red-400 border-red-500/20',
    purple: 'from-purple-500 to-purple-600 text-purple-400 border-purple-500/20',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-400 border-yellow-500/20',
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-400 border-indigo-500/20',
    cyan: 'from-cyan-500 to-cyan-600 text-cyan-400 border-cyan-500/20',
    orange: 'from-orange-500 to-orange-600 text-orange-400 border-orange-500/20'
  };

  return (
    <div className="bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border border-dark-100/50 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <TrendingUp className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        {loading ? (
          <div className="h-8 bg-dark-300 rounded animate-pulse mb-2" />
        ) : (
          <p className="text-3xl font-bold text-white mb-2">{value.toLocaleString()}</p>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: 'blue' | 'green' | 'red';
  stats: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon, link, color, stats }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-400 border-blue-500/20 hover:border-blue-500/40',
    green: 'from-green-500 to-green-600 text-green-400 border-green-500/20 hover:border-green-500/40',
    red: 'from-red-500 to-red-600 text-red-400 border-red-500/20 hover:border-red-500/40'
  };

  return (
    <Link
      to={link}
      className={`block bg-gradient-to-br from-dark-200 to-dark-100 rounded-2xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <Plus className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-3">{description}</p>
      <p className="text-xs text-gray-500 font-medium">{stats}</p>
    </Link>
  );
};

export default AdminDashboard;