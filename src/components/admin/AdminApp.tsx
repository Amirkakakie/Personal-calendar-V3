import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { adminApi, AdminOverviewStats, AdminUserDetail } from '../../services/adminApi.ts';
import { AdminLayout, AdminTab } from './AdminLayout.tsx';
import { AdminAccessDenied } from './AdminAccessDenied.tsx';
import { AdminOverviewView } from './AdminOverviewView.tsx';
import { AdminAnalyticsView } from './AdminAnalyticsView.tsx';
import { AdminUsersView } from './AdminUsersView.tsx';
import { AdminProjectsView } from './AdminProjectsView.tsx';
import { AdminTeamsView } from './AdminTeamsView.tsx';
import { AdminTasksView } from './AdminTasksView.tsx';
import { AdminAuditLogsView } from './AdminAuditLogsView.tsx';
import { AdminSystemHealthView } from './AdminSystemHealthView.tsx';
import { AdminSettingsView } from './AdminSettingsView.tsx';
import { ShieldAlert, RefreshCw } from 'lucide-react';

import { getAuthToken } from '../../services/api.ts';

interface AdminAppProps {
  onExitToWorkspace: () => void;
  onOpenAuthModal?: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = ({ 
  onExitToWorkspace,
  onOpenAuthModal 
}) => {
  const { currentUser, logout } = useAuth();
  const token = getAuthToken();
  const { t } = useI18n();

  // Tab routing
  const getTabFromUrl = (): AdminTab => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'admin' && parts[1]) {
      const validTabs: AdminTab[] = [
        'overview', 'analytics', 'users', 'projects', 'teams', 
        'tasks', 'audit-logs', 'system', 'settings'
      ];
      if (validTabs.includes(parts[1] as AdminTab)) {
        return parts[1] as AdminTab;
      }
    }
    return 'overview';
  };

  const [currentTab, setCurrentTab] = useState<AdminTab>(getTabFromUrl);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUserDetail | null>(null);
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab: AdminTab) => {
    setCurrentTab(tab);
    const targetPath = tab === 'overview' ? '/admin' : `/admin/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch overview stats
  const fetchOverviewStats = useCallback(async () => {
    try {
      setIsRefreshingStats(true);
      const data = await adminApi.getOverview();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin overview stats:', err);
    } finally {
      setIsRefreshingStats(false);
    }
  }, []);

  // Verify Super Admin access on server
  const verifySuperAdmin = useCallback(async () => {
    setIsVerifying(true);
    try {
      if (!token) {
        setIsAuthorized(false);
        setIsVerifying(false);
        return;
      }

      const res = await adminApi.getMe();
      if (res && res.role === 'superadmin') {
        setIsAuthorized(true);
        setAdminUser(res);
        fetchOverviewStats();
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      setIsAuthorized(false);
    } finally {
      setIsVerifying(false);
    }
  }, [token, fetchOverviewStats]);

  useEffect(() => {
    verifySuperAdmin();
  }, [verifySuperAdmin]);

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-neutral-400 font-medium">
          {t('admin.verifyingSuperAdminPermissions')}
        </p>
      </div>
    );
  }

  // Unauthorized screen (HTTP 403 Forbidden)
  if (!isAuthorized) {
    return (
      <AdminAccessDenied
        onReturnToApp={() => {
          window.history.pushState(null, '', '/');
          onExitToWorkspace();
        }}
        onSwitchAccount={() => {
          logout();
          if (onOpenAuthModal) {
            onOpenAuthModal();
          }
        }}
      />
    );
  }

  // Super Admin view
  return (
    <AdminLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onExitToApp={() => {
        window.history.pushState(null, '', '/');
        onExitToWorkspace();
      }}
      onRefreshData={fetchOverviewStats}
      isRefreshing={isRefreshingStats}
    >
      {currentTab === 'overview' && (
        <AdminOverviewView stats={stats} onNavigateTab={handleTabChange} />
      )}
      {currentTab === 'analytics' && <AdminAnalyticsView />}
      {currentTab === 'users' && <AdminUsersView />}
      {currentTab === 'projects' && <AdminProjectsView />}
      {currentTab === 'teams' && <AdminTeamsView />}
      {currentTab === 'tasks' && <AdminTasksView />}
      {currentTab === 'audit-logs' && <AdminAuditLogsView />}
      {currentTab === 'system' && <AdminSystemHealthView />}
      {currentTab === 'settings' && <AdminSettingsView currentAdmin={adminUser} />}
    </AdminLayout>
  );
};
