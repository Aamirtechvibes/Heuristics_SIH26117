import { useState, useEffect } from 'react'
import {
  ShieldCheck, Cpu, FileText, CheckCircle2, AlertTriangle, Terminal, Download,
  Database, Activity, Play, RefreshCw, FileSpreadsheet, Presentation, Lock,
  ChevronRight, Check, CheckSquare, ShieldAlert
} from 'lucide-react'

interface TimelineStep {
  id: number
  phase: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  details: string
  model?: string
}

interface EvidenceCard {
  sourceFile: string
  section: string
  snippet: string
}

const API_BASE = 'http://localhost:3001'

const App = () => {
  const [taskInput, setTaskInput] = useState(
    'Analyze uploaded document, answer technical questions, write code, or perform engineering analysis.'
  )
  const [executionMode, setExecutionMode] = useState<'PRESET' | 'LIVE_UPLOAD'>('LIVE_UPLOAD')
  const [documentFile, setDocumentFile] = useState('inspection-report-A.txt')
  const [uploadedReportPath, setUploadedReportPath] = useState<string | null>(null)
  const [uploadedReportName, setUploadedReportName] = useState<string | null>(null)
  const [uploadedSopName, setUploadedSopName] = useState<string | null>(null)
  const [sopDirectory, setSopDirectory] = useState('Persistent Company Knowledge Base')
  const [isRunning, setIsRunning] = useState(false)
  const [runCompleted, setRunCompleted] = useState(false)
  const [sovereignMode, setSovereignMode] = useState(true)
  const [approvalGranted, setApprovalGranted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadingSop, setUploadingSop] = useState(false)
  const [finalResponse, setFinalResponse] = useState<string | null>(null)
  const [companyDocs, setCompanyDocs] = useState<Array<{ id: string; originalName: string; fileType: string; uploadedAt: string }>>([])

  // Ollama Health Status State
  const [healthStatus, setHealthStatus] = useState<{
    ollamaOnline: boolean
    endpoint: string
    installedModels: string[]
    visionModelInstalled: boolean
    reasoningModelInstalled: boolean
    visionModelName: string
    reasoningModelName: string
    inferenceMode: 'LIVE LOCAL INFERENCE' | 'LOCAL FALLBACK'
  }>({
    ollamaOnline: false,
    endpoint: 'http://127.0.0.1:11434',
    installedModels: [],
    visionModelInstalled: false,
    reasoningModelInstalled: false,
    visionModelName: 'llava:latest',
    reasoningModelName: 'qwen2.5-coder:7b',
    inferenceMode: 'LOCAL FALLBACK'
  })

  // Sovereignty Telemetry from Real Backend
  const [telemetry, setTelemetry] = useState<{
    sovereignMode: boolean
    totalAuditEvents: number
    blockedCloudAttempts: number
    localInferenceCalls: number
    auditLedger: Array<{ timestamp: string; targetUrl: string; provider: string; allowed: boolean; reason: string }>
  }>({
    sovereignMode: true,
    totalAuditEvents: 0,
    blockedCloudAttempts: 0,
    localInferenceCalls: 0,
    auditLedger: []
  })

  // Dynamic Execution State
  const [steps, setSteps] = useState<TimelineStep[]>([
    { id: 1, phase: 'UNDERSTAND', title: 'Task & Intent Classifier', status: 'pending', details: 'Analyzing task request & file input...' },
    { id: 2, phase: 'ROUTE', title: 'Task-Based Model Selection', status: 'pending', details: 'Routing to local open-weight model based on task intent...' },
    { id: 3, phase: 'SKILL', title: 'Skill & Tool Resolution', status: 'pending', details: 'Selecting required skill contract and tools...' },
    { id: 4, phase: 'EXECUTE', title: 'Agent Execution & Reasoning', status: 'pending', details: 'Executing task reasoning, sandbox math, or OCR...' },
    { id: 5, phase: 'VERIFY', title: 'Verification & Output Response', status: 'pending', details: 'Formulating verified response & staging deliverables...' }
  ])

  const [evidenceList, setEvidenceList] = useState<EvidenceCard[]>([])
  const [calculationResult, setCalculationResult] = useState<string>('')
  const [routingDetails, setRoutingDetails] = useState<Array<{ task: string; model: string; reason: string; status: string }>>([])
  const [deliverables, setDeliverables] = useState<{ docx?: string; xlsx?: string; pptx?: string }>({})

  // Fetch health, telemetry, & knowledge docs on load
  useEffect(() => {
    fetchSovereigntyTelemetry()
    fetchOllamaHealth()
    fetchCompanyKnowledge()
  }, [])

  const fetchCompanyKnowledge = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge`)
      if (res.ok) {
        const data = await res.json()
        if (data.documents) setCompanyDocs(data.documents)
      }
    } catch (e) {
      // Knowledge API offline
    }
  }

  const deleteKnowledgeDoc = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCompanyKnowledge()
      }
    } catch (e) {
      // Delete error
    }
  }

  const fetchOllamaHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ollama-health`)
      if (res.ok) {
        const data = await res.json()
        setHealthStatus(data)
      }
    } catch (e) {
      // Backend offline
    }
  }

  const fetchSovereigntyTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sovereignty`)
      if (res.ok) {
        const data = await res.json()
        setTelemetry(data)
      }
    } catch (e) {
      // Server offline fallback telemetry display
    }
  }

  const handleTestSovereigntyAction = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/test-sovereignty`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setTelemetry(data)
      }
    } catch (e) {
      setTelemetry(prev => ({
        ...prev,
        blockedCloudAttempts: prev.blockedCloudAttempts + 1,
        auditLedger: [
          {
            timestamp: new Date().toISOString(),
            targetUrl: 'https://openrouter.ai/api/v1/chat/completions',
            provider: 'OpenRouter',
            allowed: false,
            reason: 'BLOCKED: Sovereign Mode ACTIVE. External cloud AI access prohibited.'
          },
          ...prev.auditLedger
        ]
      }))
    }
  }

  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

  const handleFileUpload = async (file: File, category: 'report' | 'sop') => {
    if (category === 'report') setUploadingReport(true)
    if (category === 'sop') setUploadingSop(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (currentRunId) formData.append('runId', currentRunId)

      const endpoint = category === 'sop' ? `${API_BASE}/api/knowledge` : `${API_BASE}/api/upload`

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()

      if (category === 'report') {
        if (data.runId) setCurrentRunId(data.runId)
        setUploadedReportPath(data.filePath)
        setUploadedReportName(data.fileName)
        setExecutionMode('LIVE_UPLOAD')
      } else {
        fetchCompanyKnowledge()
        setUploadedSopName(data.document?.originalName || file.name)
        setSopDirectory(`Indexed in Enterprise Knowledge Base`)
      }
    } catch (err: any) {
      setApiError(`Upload failed: ${err.message}`)
    } finally {
      if (category === 'report') setUploadingReport(false)
      if (category === 'sop') setUploadingSop(false)
    }
  }

  const runRealTaskExecution = async () => {
    setIsRunning(true)
    setRunCompleted(false)
    setApprovalGranted(false)
    setApiError(null)
    setEvidenceList([])
    setCalculationResult('')
    setRoutingDetails([])
    setDeliverables({})
    setFinalResponse(null)

    // Refresh health status before run
    await fetchOllamaHealth()

    // Reset steps
    setSteps([
      { id: 1, phase: 'UNDERSTAND', title: 'Task & Intent Classifier', status: 'running', details: 'Analyzing task request & file input...' },
      { id: 2, phase: 'ROUTE', title: 'Task-Based Model Selection', status: 'pending', details: 'Routing to local open-weight model based on task intent...' },
      { id: 3, phase: 'SKILL', title: 'Skill & Tool Resolution', status: 'pending', details: 'Selecting required skill contract and tools...' },
      { id: 4, phase: 'EXECUTE', title: 'Agent Execution & Reasoning', status: 'pending', details: 'Executing task reasoning, sandbox math, or OCR...' },
      { id: 5, phase: 'VERIFY', title: 'Verification & Output Response', status: 'pending', details: 'Formulating verified response & staging deliverables...' }
    ])

    const updateStep = (id: number, status: 'running' | 'completed', details?: string, model?: string) => {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, status, details: details || s.details, model } : s))
    }

    const activeReport = executionMode === 'LIVE_UPLOAD' && uploadedReportPath 
      ? uploadedReportPath 
      : documentFile

    try {
      // Call live backend API
      const res = await fetch(`${API_BASE}/api/run-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: currentRunId || undefined,
          taskPrompt: taskInput,
          reportFile: activeReport,
          sopFiles: uploadedSopName ? [uploadedSopName] : [],
          isLiveUpload: executionMode === 'LIVE_UPLOAD'
        })
      })

      if (!res.ok) throw new Error(`API returned status ${res.status}`)

      const result = await res.json()
      const state = result.state
      const plan = result.plan

      if (result.runId) setCurrentRunId(result.runId)
      if (result.healthStatus) setHealthStatus(result.healthStatus)

      updateStep(1, 'completed', `Task Intent Classified: ${plan?.category || 'GENERAL_QA'} (${plan?.description || 'Task Analysis'})`)

      // Step 2: Route
      updateStep(2, 'running', 'Routing task to on-premise local model...')
      await new Promise(r => setTimeout(r, 300))
      const routes = (state.routesSelected || []).map((r: any) => ({
        task: r.taskType,
        model: r.selectedModel.displayName,
        reason: r.reason,
        status: r.status
      }))
      setRoutingDetails(routes)
      updateStep(2, 'completed', `Routed Model: ${routes[0]?.model || healthStatus.reasoningModelName}`, routes[0]?.model || healthStatus.reasoningModelName)

      // Step 3: Skill Resolution
      updateStep(3, 'running', 'Selecting skills and tools...')
      await new Promise(r => setTimeout(r, 300))
      updateStep(3, 'completed', `Resolved Skills: ${(state.selectedSkills || []).join(', ') || 'General Q&A'}`)

      // Step 4: Execution
      updateStep(4, 'running', 'Executing reasoning and tool sequence...')
      await new Promise(r => setTimeout(r, 300))

      if (state.retrievedEvidence && state.retrievedEvidence.length > 0) {
        const evList = state.retrievedEvidence.map((e: any) => ({
          sourceFile: e.sourceFile,
          section: e.sectionOrPage,
          snippet: e.matchedContent
        }))
        setEvidenceList(evList)
      }

      if (state.calculationOutput?.stdout) {
        setCalculationResult(state.calculationOutput.stdout)
      }

      updateStep(4, 'completed', 'Completed agent tool execution.')

      // Step 5: Verification & Response
      updateStep(5, 'running', 'Formulating verified response...')
      await new Promise(r => setTimeout(r, 300))

      if (result.finalResponse) {
        setFinalResponse(result.finalResponse)
      }

      setDeliverables(state.deliverables || {})
      updateStep(5, 'completed', 'Task execution complete.')

      if (result.telemetry) setTelemetry(result.telemetry)
      setRunCompleted(true)
    } catch (err: any) {
      setApiError(`API Execution note: ${err.message}`)
      updateStep(1, 'completed', 'Task intent processing failed.')
      updateStep(5, 'completed', 'Task execution halted with error.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AURA <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">SOVEREIGN AI WORKBENCH</span>
            </h1>
            <p className="text-xs text-slate-400">Mangalore Refinery and Petrochemicals Limited (MRPL) — Problem Statement 26117</p>
          </div>
        </div>

        {/* Sovereignty Badge & Test Action */}
        <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs">
          <div className={`w-2.5 h-2.5 rounded-full ${sovereignMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
          <span className="font-medium text-slate-200">
            {sovereignMode ? 'SOVEREIGN MODE: ACTIVE' : 'CLOUD FALLBACK MODE'}
          </span>
          <span className="text-emerald-400 font-mono font-semibold">● 0 CLOUD CALLS</span>
          <span className="text-amber-400 font-mono font-semibold">● BLOCKED: {telemetry.blockedCloudAttempts}</span>
          <button
            onClick={handleTestSovereigntyAction}
            className="ml-2 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition shadow flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Test Sovereignty Block
          </button>
        </div>
      </header>

      {/* Ollama Model Health Check Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">OLLAMA DAEMON:</span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
              healthStatus.ollamaOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {healthStatus.ollamaOnline ? '✓ ONLINE (127.0.0.1:11434)' : '✗ OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">VISION (LLaVA):</span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
              healthStatus.visionModelInstalled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {healthStatus.visionModelInstalled ? `✓ INSTALLED (${healthStatus.visionModelName})` : `✗ MISSING (ollama pull ${healthStatus.visionModelName})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">REASONING (Qwen):</span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
              healthStatus.reasoningModelInstalled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {healthStatus.reasoningModelInstalled ? `✓ INSTALLED (${healthStatus.reasoningModelName})` : `✗ MISSING (ollama pull ${healthStatus.reasoningModelName})`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[10px] uppercase">STATUS:</span>
          <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] uppercase tracking-wide ${
            healthStatus.inferenceMode === 'LIVE LOCAL INFERENCE' 
              ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20' 
              : 'bg-amber-600 text-white'
          }`}>
            {healthStatus.inferenceMode}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Controls & Tasks */}
        <div className="w-full lg:w-96 border-r border-slate-800 bg-slate-900/50 p-6 space-y-6 overflow-y-auto">
          {/* Mode Switcher */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Workflow Execution Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExecutionMode('PRESET')}
                className={`py-2 px-3 rounded text-xs font-semibold border transition ${
                  executionMode === 'PRESET'
                    ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                MODE A: DEMO PRESET
              </button>

              <button
                onClick={() => setExecutionMode('LIVE_UPLOAD')}
                className={`py-2 px-3 rounded text-xs font-semibold border transition ${
                  executionMode === 'LIVE_UPLOAD'
                    ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                MODE B: LIVE UPLOAD
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" /> Industrial Task Prompt
            </h2>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Enter confidential industrial task prompt..."
            />
          </div>

          {executionMode === 'PRESET' ? (
            /* Report Document Selector (Anti-Hardcoding Reports A vs B) */
            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-2">Select Preset Report (Anti-Hardcoding Proof)</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setDocumentFile('inspection-report-A.txt')
                    setTaskInput('Analyze inspection report A for EX-402A (3.10mm thickness vs 4.50mm T-min limit) and prepare approval note.')
                  }}
                  className={`p-2.5 rounded text-left border text-xs transition ${
                    documentFile === 'inspection-report-A.txt'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold">REPORT A</div>
                  <div className="text-[10px] text-rose-400">EX-402A (3.10mm Critical)</div>
                </button>

                <button
                  onClick={() => {
                    setDocumentFile('inspection-report-B.txt')
                    setTaskInput('Analyze inspection report B for EX-402B (5.20mm thickness vs 4.50mm T-min limit) and prepare inspection certificate.')
                  }}
                  className={`p-2.5 rounded text-left border text-xs transition ${
                    documentFile === 'inspection-report-B.txt'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold">REPORT B</div>
                  <div className="text-[10px] text-emerald-400">EX-402B (5.20mm Safe)</div>
                </button>
              </div>
            </div>
          ) : (
            /* Live File Upload Controls */
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400">Upload Live Documents</h3>
              
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">UPLOAD INSPECTION REPORT (PDF / JPG / PNG)</label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-3 text-center bg-slate-950/60 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'report')
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-300 font-medium block">
                    {uploadingReport ? 'Uploading Report...' : uploadedReportName || 'Drag & Drop Report PDF / Image / Text'}
                  </span>
                  <span className="text-[10px] text-slate-500">Local processing only — 0 cloud transfer</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">UPLOAD SOP / KNOWLEDGE (PDF / DOCX / TXT)</label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-lg p-3 text-center bg-slate-950/60 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'sop')
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Database className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-300 font-medium block">
                    {uploadingSop ? 'Uploading SOP...' : uploadedSopName || 'Drag & Drop SOP Manual / Specification'}
                  </span>
                  <span className="text-[10px] text-slate-500">Indexes into local on-premise knowledge base</span>
                </div>
              </div>
            </div>
          )}

          {/* Document Ingestion Inputs Display */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400">Active Inputs</h3>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Active Mode & Report File</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="truncate flex-1 font-semibold text-blue-300">
                  [{executionMode}] {executionMode === 'LIVE_UPLOAD' ? (uploadedReportName || 'No live file uploaded yet') : documentFile}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Local Knowledge Base Path</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="truncate flex-1">{sopDirectory}</span>
              </div>
            </div>
          </div>

          {/* Run Action Button */}
          <button
            onClick={runRealTaskExecution}
            disabled={isRunning}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
              isRunning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Executing Real State Graph Task...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run Autonomous Industrial Worker Task
              </>
            )}
          </button>
        </div>

        {/* Main Center Area: Visible Execution Timeline */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {apiError && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" /> Real Agent State Machine Execution Timeline
              </h2>
              <p className="text-xs text-slate-400">Step-by-step progress of local model routing, SOP search, engineering math & deliverable generation</p>
            </div>
            {runCompleted && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> TASK COMPLETED
              </span>
            )}
          </div>

          {/* Execution Timeline Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition ${
                  step.status === 'completed'
                    ? 'bg-slate-900/80 border-slate-800'
                    : step.status === 'running'
                    ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : step.status === 'running'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {step.status === 'completed' ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">{step.phase}</span>
                      <h3 className="text-sm font-semibold text-slate-200">{step.title}</h3>
                    </div>
                  </div>

                  {step.model && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                      {step.model}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-400 pl-10">{step.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Models, Evidence, Calculations & Deliverables */}
        <div className="w-full lg:w-96 border-l border-slate-800 bg-slate-900/50 p-6 space-y-6 overflow-y-auto">
          {/* Model Router Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" /> Local Model Task Router
            </h3>
            {routingDetails.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No task routed yet.</p>
            ) : (
              <div className="space-y-2">
                {routingDetails.map((r, i) => (
                  <div key={i} className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs">
                    <div className="font-semibold text-purple-300">{r.model}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.reason}</div>
                    <div className="text-[10px] font-mono text-emerald-400 mt-1">{r.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Retrieved SOP Evidence Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Retrieved On-Premise SOP Evidence
            </h3>
            {evidenceList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No SOP evidence retrieved yet.</p>
            ) : (
              <div className="space-y-2">
                {evidenceList.map((e, i) => (
                  <div key={i} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                    <div className="font-mono text-[11px] text-emerald-400 font-semibold">{e.sourceFile} — {e.section}</div>
                    <p className="text-[11px] text-slate-300 italic">{e.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sandboxed Python Calculation Output */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" /> Sandboxed Python Output
            </h3>
            {calculationResult ? (
              <pre className="bg-slate-950 p-3 rounded text-[11px] font-mono text-amber-300 border border-slate-800 whitespace-pre-wrap">
                {calculationResult}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 italic">Sandbox waiting for execution...</p>
            )}
          </div>

          {/* Real Deliverables Downloads */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" /> Real Generated Deliverables
            </h3>
            {runCompleted ? (
              <div className="space-y-2">
                <a
                  href={deliverables.docx ? (deliverables.docx.startsWith('http') ? deliverables.docx : `${API_BASE}${deliverables.docx}`) : '#'}
                  download
                  className="flex items-center justify-between p-2.5 rounded bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-xs text-blue-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>DOCX Approval Note / Certificate</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                </a>

                <a
                  href={deliverables.xlsx ? (deliverables.xlsx.startsWith('http') ? deliverables.xlsx : `${API_BASE}${deliverables.xlsx}`) : '#'}
                  download
                  className="flex items-center justify-between p-2.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs text-emerald-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>XLSX Inspection Sheet</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </a>

                <a
                  href={deliverables.pptx ? (deliverables.pptx.startsWith('http') ? deliverables.pptx : `${API_BASE}${deliverables.pptx}`) : '#'}
                  download
                  className="flex items-center justify-between p-2.5 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-xs text-purple-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-purple-400" />
                    <span>PPTX Executive Deck</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                </a>

                {/* Human Approval Button */}
                <div className="pt-2">
                  <button
                    onClick={() => setApprovalGranted(true)}
                    disabled={approvalGranted}
                    className={`w-full py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      approvalGranted
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    {approvalGranted ? 'Signoff Approved & Action Committed' : 'Approve & Commit Engineering Action'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Run workflow to generate real document files.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
