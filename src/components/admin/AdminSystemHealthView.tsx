import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, Cpu, HardDrive, RefreshCw, 
  CheckCircle, AlertTriangle, ShieldCheck, Zap, Layers, Clock 
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, SystemHealthDiagnostics } from '../../services/adminApi';

export const AdminSystemHealthView: React.FC = () => {
  const { t } = useI18n();
  const [diagnostics, setDiagnostics] = useState<SystemHealthDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Maintenance runner state
  const [runningMaintenance, setRunningMaintenance] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<{
    success: boolean;
    message?: string;
    timestamp?: string;
    cleanedSnapshots?: number;
    checkedPartitions?: number;
    auditLogsCount?: number;
  } | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getSystemHealth();
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRunMaintenance = async () => {
    if (!window.confirm(t('admin.confirmRunMaintenance'))) return;
    try {
      setRunningMaintenance(true);
      const res = await adminApi.runMaintenance();
      setMaintenanceResult(res);
      await fetchHealth();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Maintenance failed');
    } finally {
      setRunningMaintenance(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            {t('admin.systemHealthDiagnostics')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.systemHealthSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </button>
          <button
            onClick={handleRunMaintenance}
            disabled={runningMaintenance}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Zap className={`w-3.5 h-3.5 ${runningMaintenance ? 'animate-spin' : ''}`} />
            {runningMaintenance ? t('admin.runningMaintenance') : t('admin.runMaintenance')}
          </button>
        </div>
      </div>

      {loading && !diagnostics ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {t('admin.loadingDiagnostics')}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 bg-slate-900 border border-rose-900/40 rounded-xl">
          {error}
        </div>
      ) : diagnostics ? (
        <div className="space-y-6">
          {/* Maintenance Banner if run */}
          {maintenanceResult && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-200">{t('admin.maintenanceCompleted')}</p>
                <p className="text-emerald-400 mt-0.5">
                  Checked {maintenanceResult.checkedPartitions} tenant partitions. Audit log contains {maintenanceResult.auditLogsCount} events.
                </p>
              </div>
            </div>
          )}

          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs">{t('admin.databaseStatus')}</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-lg font-bold text-white capitalize">{diagnostics.database.status}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {diagnostics.database.engine}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs">{t('admin.serverUptime')}</span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-lg font-bold text-white font-mono">
                {formatUptime(diagnostics.server.uptimeSeconds)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Node {diagnostics.server.nodeVersion} ({diagnostics.server.platform})
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs">{t('admin.memoryHeapUsed')}</span>
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-lg font-bold text-white font-mono">
                {diagnostics.memory.heapUsedMB} MB
              </p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (diagnostics.memory.heapUsedMB / diagnostics.memory.heapTotalMB) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                of {diagnostics.memory.heapTotalMB} MB total heap
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs">{t('admin.auditEvents')}</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-lg font-bold text-white font-mono">
                {diagnostics.database.records.auditLogs.toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                {t('admin.tamperEvidentActive')}
              </span>
            </div>
          </div>

          {/* Database Records Inventory */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-indigo-400" />
              {t('admin.databaseRecordCounts')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.users')}</span>
                <span className="text-2xl font-bold text-white font-mono">
                  {diagnostics.database.records.users}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.personalProjects')}</span>
                <span className="text-2xl font-bold text-blue-400 font-mono">
                  {diagnostics.database.records.personalProjects}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.teamProjects')}</span>
                <span className="text-2xl font-bold text-purple-400 font-mono">
                  {diagnostics.database.records.teamProjects}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.tasks')}</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">
                  {diagnostics.database.records.tasks}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.teams')}</span>
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {diagnostics.database.records.teams}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">{t('admin.auditLogs')}</span>
                <span className="text-2xl font-bold text-sky-400 font-mono">
                  {diagnostics.database.records.auditLogs}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Detailed View */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-purple-400" />
              {t('admin.processMemoryAllocation')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">RSS (Resident Set Size)</span>
                <span className="text-lg font-mono font-bold text-white">{diagnostics.memory.rssMB} MB</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">Heap Total</span>
                <span className="text-lg font-mono font-bold text-slate-200">{diagnostics.memory.heapTotalMB} MB</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">Heap Used</span>
                <span className="text-lg font-mono font-bold text-purple-400">{diagnostics.memory.heapUsedMB} MB</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">External Buffers</span>
                <span className="text-lg font-mono font-bold text-slate-400">{diagnostics.memory.externalMB} MB</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
