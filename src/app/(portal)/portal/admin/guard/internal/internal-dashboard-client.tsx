'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  Activity,
  HardDrive,
  Cpu,
  Lock,
  Globe,
  Shield,
  Zap,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
// Simple date formatter to avoid date-fns dependency
function formatDistanceToNow(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

interface GuardAgent {
  id: string;
  name: string;
  status: string;
  hostname?: string;
  ipAddress?: string;
  os?: string;
  lastHeartbeat: string;
  metrics: any[];
  alerts: any[];
  devices: any[];
  serviceStatuses: any[];
}

interface InternalDashboardClientProps {
  initialAgent: GuardAgent;
}

export function InternalDashboardClient({ initialAgent }: InternalDashboardClientProps) {
  const [agent, setAgent] = useState(initialAgent);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/guard/internal');
        const data = await res.json();
        if (data.success) {
          setAgent(data.agent);
        }
      } catch (error) {
        console.error('Failed to refresh agent data:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setScanProgress((p) => Math.min(p + Math.random() * 30, 90));
      }, 300);

      const res = await fetch('/api/guard/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (res.ok) {
        const data = await res.json();
        setLastScan(new Date());

        // Refresh agent data
        const refreshRes = await fetch('/api/guard/internal');
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setAgent(refreshData.agent);
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
      }, 1000);
    }
  };

  const latestMetric = agent.metrics?.[0];
  const openAlerts = agent.alerts?.filter((a) => a.status === 'OPEN') ?? [];
  const criticalAlerts = openAlerts.filter((a) => a.severity === 'CRITICAL');

  const threatScore = Math.min(
    criticalAlerts.length * 25 +
      openAlerts.filter((a) => a.severity === 'HIGH').length * 10 +
      openAlerts.filter((a) => a.severity === 'MEDIUM').length * 5,
    100
  );

  const threatLevel =
    threatScore >= 75 ? 'CRITICAL' : threatScore >= 50 ? 'HIGH' : threatScore >= 25 ? 'MEDIUM' : 'LOW';

  return (
    <div className="space-y-6">
      {/* Threat Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Threat Score Ring */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Threat Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground opacity-20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={
                      threatLevel === 'CRITICAL'
                        ? 'rgb(239, 68, 68)'
                        : threatLevel === 'HIGH'
                        ? 'rgb(249, 115, 22)'
                        : threatLevel === 'MEDIUM'
                        ? 'rgb(234, 179, 8)'
                        : 'rgb(34, 197, 94)'
                    }
                    strokeWidth="3"
                    strokeDasharray={`${(threatScore / 100) * 282.6} 282.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{threatScore}</div>
                  <div className="text-xs text-muted-foreground">{threatLevel}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="w-4 h-4" /> CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latestMetric?.cpuUsage?.toFixed(1) ?? 0}%</div>
            <Progress value={latestMetric?.cpuUsage ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">Load: {latestMetric?.systemLoad?.toFixed(2) ?? 0}</p>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latestMetric?.memoryUsage?.toFixed(1) ?? 0}%</div>
            <Progress value={latestMetric?.memoryUsage ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {((latestMetric?.memoryRss ?? 0) / 1024).toFixed(0)} MB
            </p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Disk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latestMetric?.diskUsage?.toFixed(1) ?? 0}%</div>
            <Progress value={latestMetric?.diskUsage ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {((latestMetric?.diskFree ?? 0) / 1024 / 1024).toFixed(1)} GB free
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Scan Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Run Full Scan'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
            </Button>
          </div>

          {isScanning && (
            <div className="space-y-2">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{scanProgress.toFixed(0)}% complete</p>
            </div>
          )}

          {lastScan && (
            <p className="text-xs text-muted-foreground">
              Last scan: {formatDistanceToNow(lastScan)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Security Findings ({openAlerts.length})
          </CardTitle>
          <CardDescription>
            {criticalAlerts.length} critical • {openAlerts.filter((a) => a.severity === 'HIGH').length} high
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openAlerts.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">All systems secure. No active threats detected.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {openAlerts.slice(0, 10).map((alert) => (
                <Alert key={alert.id} className="border-l-4" style={{
                  borderLeftColor: alert.severity === 'CRITICAL' ? 'rgb(239, 68, 68)' : 'rgb(249, 115, 22)'
                }}>
                  <div className="flex items-start gap-2">
                    {alert.severity === 'CRITICAL' ? (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <Badge
                          variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      {alert.recommendations && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer font-medium">View fix</summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {alert.recommendations}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
              {openAlerts.length > 10 && (
                <p className="text-xs text-muted-foreground">+{openAlerts.length - 10} more findings</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Status */}
      {agent.serviceStatuses && agent.serviceStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Services Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {agent.serviceStatuses.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{service.serviceName}</span>
                  {service.isActive ? (
                    <Badge className="bg-green-600">Running</Badge>
                  ) : (
                    <Badge variant="destructive">Down</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agent.metrics && agent.metrics.length > 0 && (
              <>
                <div>
                  <div className="text-sm font-medium mb-2">CPU Usage Trend</div>
                  <div className="flex gap-1 items-end h-12">
                    {agent.metrics.slice(0, 20).reverse().map((m, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100"
                        style={{ height: `${(m.cpuUsage / 100) * 100}%`, minHeight: '2px' }}
                        title={`CPU: ${m.cpuUsage?.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Memory Usage Trend</div>
                  <div className="flex gap-1 items-end h-12">
                    {agent.metrics.slice(0, 20).reverse().map((m, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-purple-500 rounded-t opacity-70 hover:opacity-100"
                        style={{ height: `${(m.memoryUsage / 100) * 100}%`, minHeight: '2px' }}
                        title={`Memory: ${m.memoryUsage?.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agent Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Agent Name</p>
            <p className="text-sm font-medium">{agent.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              {agent.status === 'online' ? (
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              ) : (
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              )}
              <p className="text-sm font-medium capitalize">{agent.status}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Heartbeat</p>
            <p className="text-sm font-medium">
              {formatDistanceToNow(new Date(agent.lastHeartbeat))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IP Address</p>
            <p className="text-sm font-medium">{agent?.ipAddress ?? "localhost"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
