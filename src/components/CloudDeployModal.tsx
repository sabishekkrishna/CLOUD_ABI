import { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Clock,
  Server,
  Zap,
  Play,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DeploymentInfo {
  isProduction: boolean;
  port: number;
  nodeVersion: string;
  uptimeSeconds: number;
  cronSecretConfigured: boolean;
  dataDir: string;
  appUrl: string;
  telegramBot: string;
}

interface CloudDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername?: string;
}

export function CloudDeployModal({ isOpen, onClose, botUsername = 'abisundar_bot' }: CloudDeployModalProps) {
  const [activeTab, setActiveTab] = useState<'cloudrun' | 'railway' | 'render' | 'docker' | 'cron'>('cloudrun');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deployInfo, setDeployInfo] = useState<DeploymentInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [cronTestStatus, setCronTestStatus] = useState<{
    loading: boolean;
    result?: any;
    error?: string;
  }>({ loading: false });

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingInfo(true);
    fetch('/api/deployment-info')
      .then((res) => res.json())
      .then((data) => {
        setDeployInfo(data);
      })
      .catch((err) => {
        console.error('Failed to load deployment info:', err);
      })
      .finally(() => {
        setIsLoadingInfo(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestCron = async () => {
    setCronTestStatus({ loading: true });
    try {
      const res = await fetch('/api/cron/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setCronTestStatus({ loading: false, result: data });
      } else {
        setCronTestStatus({ loading: false, error: data.error || 'Cron check failed' });
      }
    } catch (err: any) {
      setCronTestStatus({ loading: false, error: err.message || 'Network error triggering cron' });
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const cronEndpointUrl = `${currentHost}/api/cron/check`;

  const cloudRunDeployCmd = `gcloud run deploy cubelelo-tracker \\
  --source . \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --set-env-vars NODE_ENV=production,TELEGRAM_TOKEN="YOUR_BOT_TOKEN",TELEGRAM_CHAT_ID="YOUR_CHAT_ID"`;

  const cloudSchedulerCmd = `gcloud scheduler jobs create http cubelelo-price-check \\
  --schedule="*/30 * * * *" \\
  --uri="${cronEndpointUrl}" \\
  --http-method=POST \\
  --time-zone="Asia/Kolkata"`;

  const dockerRunCmd = `docker build -t cubelelo-tracker .
docker run -d -p 3000:3000 \\
  -e NODE_ENV=production \\
  -e TELEGRAM_TOKEN="YOUR_BOT_TOKEN" \\
  -e TELEGRAM_CHAT_ID="YOUR_CHAT_ID" \\
  -v tracker_data:/app/data \\
  --name cubelelo-tracker cubelelo-tracker`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Serverless Cloud Deployment</h3>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Deploy 24/7 to Google Cloud Run, Railway, Render, or Docker with zero server management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Runtime Diagnostics Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-slate-600">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Port: <strong className="text-slate-800">{deployInfo?.port || 3000}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span>Runtime: <strong className="text-slate-800">{deployInfo?.isProduction ? 'Production' : 'Dev / Hot'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Node: <strong className="text-slate-800">{deployInfo?.nodeVersion || 'v22+'}</strong></span>
            </div>
          </div>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs hover:bg-indigo-50"
          >
            Health Probe (/api/health)
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          {[
            { id: 'cloudrun', label: 'Google Cloud Run' },
            { id: 'railway', label: 'Railway' },
            { id: 'render', label: 'Render' },
            { id: 'docker', label: 'Docker' },
            { id: 'cron', label: 'Serverless Cron (Free)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4 max-h-[62vh] overflow-y-auto">
          {/* TAB: Cloud Run */}
          {activeTab === 'cloudrun' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 flex items-start gap-3">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-950">Why Google Cloud Run?</p>
                  <p className="mt-0.5 text-sky-800 leading-relaxed">
                    Cloud Run is Google’s serverless container platform. It scales down to <strong>0 instances</strong> when idle, meaning it costs <strong>₹0 / month</strong> within the 2 million free monthly requests tier!
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    1-Line Deploy Command (Automatic Docker Build)
                  </label>
                  <button
                    onClick={() => copyToClipboard(cloudRunDeployCmd, 'cloudrun-cmd')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedId === 'cloudrun-cmd' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {cloudRunDeployCmd}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Cloud Scheduler Command (Every 30 Mins)
                  </label>
                  <button
                    onClick={() => copyToClipboard(cloudSchedulerCmd, 'sched-cmd')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedId === 'sched-cmd' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {cloudSchedulerCmd}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: Railway */}
          {activeTab === 'railway' && (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-xs text-violet-950">
                <h4 className="font-semibold text-violet-900 mb-1">Railway 1-Click Git Deployment</h4>
                <p className="text-violet-800 leading-relaxed">
                  Railway detects the included <code className="bg-violet-100 px-1 py-0.5 rounded text-violet-900">Dockerfile</code> and configures SSL and domain names automatically.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">1</span>
                  <p>Push your repository to GitHub or run <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">railway up</code>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">2</span>
                  <p>In Railway dashboard, add environment variables:</p>
                </div>
                <div className="ml-7 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 font-mono text-[11px] text-slate-800">
                  <div>NODE_ENV=production</div>
                  <div>TELEGRAM_TOKEN=your_bot_token</div>
                  <div>TELEGRAM_CHAT_ID=your_chat_id</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">3</span>
                  <p>Click <strong>Deploy</strong>. Railway automatically builds and launches the server on a public HTTPS URL!</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Render */}
          {activeTab === 'render' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
                <h4 className="font-semibold text-emerald-900 mb-1">Render Blueprint Ready</h4>
                <p className="text-emerald-800 leading-relaxed">
                  This project includes a pre-configured <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">render.yaml</code> blueprint file.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <p>To deploy on Render:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1 text-slate-600">
                  <li>Visit <a href="https://render.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">render.com</a> and sign in.</li>
                  <li>Click <strong>New +</strong> &rarr; <strong>Blueprint</strong> and select this GitHub repository.</li>
                  <li>Render will read <code className="font-mono bg-slate-100 px-1 rounded">render.yaml</code>, set up the Web Service, and prompt you to input your <code className="font-mono bg-slate-100 px-1 rounded">TELEGRAM_TOKEN</code> and <code className="font-mono bg-slate-100 px-1 rounded">TELEGRAM_CHAT_ID</code>.</li>
                  <li>Click <strong>Apply</strong>. Render builds the Vite frontend, packages the Express backend, and serves your app!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: Docker */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  Docker Multi-Stage Build & Run
                </label>
                <button
                  onClick={() => copyToClipboard(dockerRunCmd, 'docker-cmd')}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  {copiedId === 'docker-cmd' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {dockerRunCmd}
              </pre>
              <p className="text-xs text-slate-500">
                The Docker container runs as a non-root <code className="font-mono bg-slate-100 px-1 rounded">node</code> user, persists speedcube data in a named volume (<code className="font-mono bg-slate-100 px-1 rounded">tracker_data</code>), and binds cleanly to port 3000.
              </p>
            </div>
          )}

          {/* TAB: Serverless Cron */}
          {activeTab === 'cron' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950">
                <h4 className="font-semibold text-amber-900 mb-1">Automated Checks When Scaled to Zero</h4>
                <p className="text-amber-800 leading-relaxed">
                  In serverless environments (Cloud Run, Render Free Tier), containers sleep when no web requests arrive. Ping the dedicated <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">/api/cron/check</code> endpoint every 15-30 minutes using free services!
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Your Webhook Endpoint URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={cronEndpointUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(cronEndpointUrl, 'cron-url')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shrink-0"
                  >
                    {copiedId === 'cron-url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'cron-url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Live Test Trigger */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Test Serverless Cron Live</span>
                  <button
                    onClick={handleTestCron}
                    disabled={cronTestStatus.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-60 transition-colors"
                  >
                    <Play className={`w-3.5 h-3.5 ${cronTestStatus.loading ? 'animate-spin' : ''}`} />
                    <span>{cronTestStatus.loading ? 'Testing...' : 'Trigger Now'}</span>
                  </button>
                </div>

                {cronTestStatus.result && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Cron test succeeded!</span>
                      <p className="text-[11px] text-emerald-800">
                        Checked: {cronTestStatus.result.checkedCount} items &bull; Alerts dispatched: {cronTestStatus.result.alertsSent} &bull; Time: {cronTestStatus.result.durationMs}ms
                      </p>
                    </div>
                  </div>
                )}

                {cronTestStatus.error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>Error: {cronTestStatus.error}</span>
                  </div>
                )}
              </div>

              {/* Free Cron Providers */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Recommended Free Cron Services:</span>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>GitHub Actions</strong>: Already included in <code className="bg-slate-100 px-1 rounded">.github/workflows/cron.yml</code>.</li>
                  <li><strong>Google Cloud Scheduler</strong>: Free 3 jobs/month forever.</li>
                  <li><strong>cron-job.org</strong>: 100% free web cron with email failure alerts.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            For step-by-step guides, check <strong className="text-slate-700">DEPLOYMENT.md</strong> in your workspace.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
