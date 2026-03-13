"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  TrendingDown, Building2, AlertTriangle, Network, 
  Play, FileText, Download, Loader2, Sparkles,
  ChevronRight, Target, BarChart3, PieChart,
  DollarSign, Shield, Zap, Users, Plus, Eye,
  ArrowRight, ArrowDown, CheckCircle2, Clock,
  Send, Database, Mail, Link2
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend, Sankey
} from "recharts"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  type: "보험사" | "증권사" | "연기금"
  totalAum: number
  egAum: number
  egFunds: { id: string; name: string; aum: number }[]
}

interface TriggerEvent {
  id: string
  name: string
  type: "시공사부도" | "금리변동" | "임차인이탈" | "신용등급하향" | "환율급변" | "커스텀"
  target?: string
  severity: "mild" | "moderate" | "severe"
}

interface ImpactResult {
  egExposure: number
  bestCase: { loss: number; pct: number }
  expected: { loss: number; pct: number }
  worstCase: { loss: number; pct: number }
  kicsImpact: number
  propagationPath: PropagationNode[]
}

interface PropagationNode {
  id: string
  name: string
  type: string
  exposure: number
  impactPct: number
  relation?: string
  children?: PropagationNode[]
}

interface ExternalPortfolio {
  id: string
  evaluator: string
  aum: number
  fundCount: number
  assetTypes: string[]
  mainContractors: string[]
  avgLTV: number
  region: string
  dataLevel: "HIGH" | "MEDIUM" | "LOW"
}

// ────────────────────────────────────────────────────────────────────────────
// Sample Data
// ────────────────────────────────────────────────────────────────────────────

const SAMPLE_CLIENTS: Client[] = [
  {
    id: "client-001",
    name: "삼성생명",
    type: "보험사",
    totalAum: 8500,
    egAum: 3300,
    egFunds: [
      { id: "fund-001", name: "EG 대체투자 1호", aum: 2000 },
      { id: "fund-002", name: "EG 인프라 펀드", aum: 800 },
      { id: "fund-003", name: "EG 부동산 2호", aum: 500 }
    ]
  },
  {
    id: "client-002",
    name: "한화생명",
    type: "보험사",
    totalAum: 6200,
    egAum: 2100,
    egFunds: [
      { id: "fund-001", name: "EG 대체투자 1호", aum: 1200 },
      { id: "fund-004", name: "EG PE 펀드", aum: 900 }
    ]
  },
  {
    id: "client-003",
    name: "미래에셋증권",
    type: "증권사",
    totalAum: 4800,
    egAum: 1500,
    egFunds: [
      { id: "fund-001", name: "EG 대체투자 1호", aum: 800 },
      { id: "fund-002", name: "EG 인프라 펀드", aum: 700 }
    ]
  }
]

const TRIGGER_EVENTS: TriggerEvent[] = [
  { id: "evt-001", name: "시공사 부도", type: "시공사부도", severity: "severe" },
  { id: "evt-002", name: "금리 +100bp", type: "금리변동", severity: "moderate" },
  { id: "evt-003", name: "주요 임차인 이탈", type: "임차인이탈", severity: "moderate" },
  { id: "evt-004", name: "신용등급 하향", type: "신용등급하향", severity: "mild" },
  { id: "evt-005", name: "환율 급변 (10%)", type: "환율급변", severity: "moderate" },
  { id: "evt-006", name: "커스텀 시나리오", type: "커스텀", severity: "moderate" }
]

const CONTRACTORS = [
  "한양건설", "대우건설", "GS건설", "현대건설", "삼성물산", "롯데건설", "포스코건설"
]

const SAMPLE_EXTERNAL_PORTFOLIOS: ExternalPortfolio[] = [
  { id: "ext-001", evaluator: "FN자산평가", aum: 2100, fundCount: 6, assetTypes: ["부동산 PF", "수익형 부동산"], mainContractors: ["한양건설", "대우건설"], avgLTV: 58, region: "서울/수도권", dataLevel: "MEDIUM" },
  { id: "ext-002", evaluator: "한국자산평가", aum: 1800, fundCount: 5, assetTypes: ["인프라", "부동산 PF"], mainContractors: ["GS건설"], avgLTV: 55, region: "전국", dataLevel: "LOW" },
  { id: "ext-003", evaluator: "KIS자산평가", aum: 800, fundCount: 3, assetTypes: ["부동산 PF"], mainContractors: ["현대건설"], avgLTV: 60, region: "서울", dataLevel: "LOW" },
  { id: "ext-004", evaluator: "나이스P&I", aum: 500, fundCount: 2, assetTypes: ["특수자산"], mainContractors: [], avgLTV: 45, region: "해외", dataLevel: "LOW" }
]

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function PortfolioImpactDashboard() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(SAMPLE_CLIENTS[0])
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerEvent | null>(null)
  const [selectedContractor, setSelectedContractor] = useState<string>("")
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("moderate")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ImpactResult | null>(null)
  const [activeTab, setActiveTab] = useState("analysis")
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState("")
  const [externalPortfolios, setExternalPortfolios] = useState<ExternalPortfolio[]>(SAMPLE_EXTERNAL_PORTFOLIOS)
  const [addExternalDialogOpen, setAddExternalDialogOpen] = useState(false)
  const [analysisWorkflowDialogOpen, setAnalysisWorkflowDialogOpen] = useState(false)
  const [workflowStep, setWorkflowStep] = useState(0)
  const [sendReportDialogOpen, setSendReportDialogOpen] = useState(false)
  const [isSendingReport, setIsSendingReport] = useState(false)
  const { toast } = useToast()

  // Run impact analysis with workflow visualization
  const runAnalysis = async () => {
    if (!selectedClient || !selectedTrigger) {
      toast({ title: "분석 실행 불가", description: "고객사와 트리거 이벤트를 선택해주세요.", variant: "destructive" })
      return
    }

    // Open workflow dialog
    setAnalysisWorkflowDialogOpen(true)
    setWorkflowStep(0)
    setIsAnalyzing(true)

    // Step 0: Graph DB 연결
    await new Promise(resolve => setTimeout(resolve, 800))
    setWorkflowStep(1)

    // Step 1: 관계 조회
    await new Promise(resolve => setTimeout(resolve, 1200))
    setWorkflowStep(2)

    // Step 2: 영향계수 로드
    await new Promise(resolve => setTimeout(resolve, 1000))
    setWorkflowStep(3)

    // Step 3: 전파경로 매핑
    await new Promise(resolve => setTimeout(resolve, 1500))
    setWorkflowStep(4)

    // Step 4: 임팩트 계산
    await new Promise(resolve => setTimeout(resolve, 1200))
    setWorkflowStep(5)

    // Step 5: 결과 생성
    await new Promise(resolve => setTimeout(resolve, 800))
    setWorkflowStep(6)

    const baseExposure = selectedClient.egAum * 0.25 // 25% exposure estimate
    const severityMultiplier = severity === "severe" ? 1.5 : severity === "moderate" ? 1.0 : 0.6

    const result: ImpactResult = {
      egExposure: baseExposure,
      bestCase: { loss: Math.round(baseExposure * 0.05 * severityMultiplier), pct: 5.1 * severityMultiplier },
      expected: { loss: Math.round(baseExposure * 0.12 * severityMultiplier), pct: 11.9 * severityMultiplier },
      worstCase: { loss: Math.round(baseExposure * 0.22 * severityMultiplier), pct: 22.4 * severityMultiplier },
      kicsImpact: -0.8 * severityMultiplier,
      propagationPath: [
        {
          id: "node-1",
          name: selectedContractor || "한양건설",
          type: "시공사",
          exposure: 0,
          impactPct: 100,
          relation: "GUARANTEES",
          children: [
            {
              id: "node-2",
              name: "강남 오피스 PF",
              type: "프로젝트",
              exposure: 750,
              impactPct: 85,
              relation: "OWNS",
              children: [
                {
                  id: "node-3",
                  name: "EG 대체투자 1호",
                  type: "펀드",
                  exposure: 450,
                  impactPct: 60,
                  relation: "INVESTS_IN",
                  children: [
                    {
                      id: "node-4",
                      name: selectedClient.name,
                      type: "투자자",
                      exposure: Math.round(baseExposure),
                      impactPct: 25
                    }
                  ]
                }
              ]
            },
            {
              id: "node-5",
              name: "해운대 호텔 PF",
              type: "프로젝트",
              exposure: 500,
              impactPct: 70,
              relation: "OWNS",
              children: [
                {
                  id: "node-6",
                  name: "EG 부동산 2호",
                  type: "펀드",
                  exposure: 300,
                  impactPct: 60,
                  relation: "INVESTS_IN",
                  children: [
                    {
                      id: "node-7",
                      name: selectedClient.name,
                      type: "투자자",
                      exposure: Math.round(baseExposure * 0.6),
                      impactPct: 18
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    setAnalysisResult(result)
    setIsAnalyzing(false)

    // Close workflow dialog after a brief moment
    setTimeout(() => {
      setAnalysisWorkflowDialogOpen(false)
    }, 1500)
  }

  // Send report to customer
  const handleSendReport = async () => {
    setIsSendingReport(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSendingReport(false)
    setSendReportDialogOpen(false)
    toast({
      title: "리포트 전송 완료",
      description: `${selectedClient?.name} 담당자에게 임팩트 분석 리포트가 전송되었습니다.`
    })
  }

  // Generate narrative report
  const generateReport = async () => {
    if (!analysisResult || !selectedClient || !selectedTrigger) return

    setReportDialogOpen(true)
    setIsGeneratingReport(true)

    await new Promise(resolve => setTimeout(resolve, 2500))

    const report = `# ${selectedClient.name} 포트폴리오 임팩트 분석 보고서

## 1. 이벤트 요약

${selectedContractor || "한양건설"}(시공사)의 ${selectedTrigger.name}이 발생할 경우, ${selectedClient.name}의 EG 담당 대체투자 포트폴리오에 미치는 영향을 분석하였습니다. 본 분석은 Neo4j 그래프 데이터베이스에 저장된 자산-기업-펀드-투자자 간 관계 데이터를 기반으로 수행되었습니다.

## 2. 1차 전파 경로 상세

${selectedContractor || "한양건설"}은 강남 오피스 PF에 750억원 규모의 공사완성보증(GUARANTEES, propagationWeight: 0.85)을 제공하고 있습니다. 부도 시 이 보증이 소멸되어, 해당 프로젝트의 할인율이 8.5%에서 11.2%로 상승하고, 공정가치가 약 195억원(-16.3%) 하락할 것으로 추정됩니다.

또한 해운대 호텔 PF에 대해서도 500억원 규모의 책임준공 보증을 제공하고 있어, 해당 프로젝트 역시 유사한 영향을 받을 것으로 예상됩니다.

## 3. 2차 전파 경로 (연쇄 영향)

강남 오피스 PF는 EG 대체투자 1호 펀드가 60% 지분으로 보유(OWNS)하고 있으며, 이 펀드에 ${selectedClient.name}이 25% 지분으로 투자(INVESTS_IN)하고 있습니다. 따라서 ${selectedClient.name}의 실질 노출액은 1,200억 × 60% × 25% = 180억원이며, 가치 하락분의 실질 영향은 약 29.3억원입니다.

## 4. 포트폴리오 수준 종합 영향

**EG 담당분 정량 임팩트:**
- 총 노출액: ${analysisResult.egExposure}억원
- Best Case 손실: -${analysisResult.bestCase.loss}억원 (-${analysisResult.bestCase.pct.toFixed(1)}%)
- Expected 손실: -${analysisResult.expected.loss}억원 (-${analysisResult.expected.pct.toFixed(1)}%)
- Worst Case 손실: -${analysisResult.worstCase.loss}억원 (-${analysisResult.worstCase.pct.toFixed(1)}%)
- K-ICS 자본적정성 영향: ${analysisResult.kicsImpact.toFixed(1)}%p

## 5. 유사 사례 및 시사점

2024년 태영건설 워크아웃 사례에서 유사한 전파 패턴이 ���찰되었으며, 당시 보증 소멸에 따른 실질 손실률은 15~25% 범위였습니다. 본 분석의 Expected 손실 추정치(${analysisResult.expected.pct.toFixed(1)}%)는 해당 범위 내에 있어 합리적인 수준으로 판단됩니다.

## 6. 권고 액션플랜

1. **단기 (1주 내):** ${selectedContractor || "한양건설"} 관련 보증 현황 및 재무상태 긴급 점검
2. **중기 (1개월 내):** 대체 보증 확보 방안 검토 (신용보강, 타 시공사 공동보증 등)
3. **장기:** 포트폴리오 시공사 집중도 관리 기준 수립 및 분산 투자 원칙 강화

---
*본 보고서는 AI 분석 엔진에 의해 자동 생성되었습니다. 최종 의사결정 전 담당자 검토가 필요합니다.*
`

    setGeneratedReport(report)
    setIsGeneratingReport(false)
  }

  // Calculate total portfolio impact including external
  const calculateTotalImpact = () => {
    if (!analysisResult || !selectedClient) return null

    const egLoss = analysisResult.expected.loss
    const externalAum = externalPortfolios.reduce((sum, p) => sum + p.aum, 0)
    
    // Estimate external loss based on similarity (simplified)
    const externalLossRate = analysisResult.expected.pct * 0.85 // Assume 85% of EG rate
    const externalLoss = Math.round(externalAum * 0.25 * externalLossRate / 100)
    
    return {
      egLoss,
      externalLoss,
      totalLoss: egLoss + externalLoss,
      totalAum: selectedClient.totalAum,
      totalPct: ((egLoss + externalLoss) / (selectedClient.totalAum * 0.25) * 100).toFixed(1)
    }
  }

  const totalImpact = calculateTotalImpact()

  // Render propagation tree node
  const renderPropagationNode = (node: PropagationNode, depth: number = 0) => {
    const nodeColors: Record<string, string> = {
      "시공사": "red",
      "프로젝트": "amber",
      "펀드": "blue",
      "투자자": "emerald"
    }
    const color = nodeColors[node.type] || "zinc"

    return (
      <div key={node.id} className={`${depth > 0 ? "ml-8 border-l-2 border-zinc-700 pl-4" : ""}`}>
        <div className={`flex items-center gap-3 p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/30 mb-2`}>
          <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{node.name}</span>
              <Badge className="text-[10px]" variant="outline">{node.type}</Badge>
            </div>
            {node.exposure > 0 && (
              <div className="text-xs text-zinc-500 mt-1">
                노출: {node.exposure}억원 | 영향: -{node.impactPct}%
              </div>
            )}
          </div>
          {node.relation && (
            <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">
              {node.relation}
            </Badge>
          )}
        </div>
        {depth < 3 && node.children?.map(child => renderPropagationNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">포트폴리오 임팩트 분석</h2>
          <p className="text-sm text-zinc-400 mt-1">
            고객사 전체 포트폴리오 연쇄부도 영향 분석 및 서술형 리포트 생성
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Configuration */}
        <div className="col-span-4 space-y-4">
          {/* Client Selection */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              고객사 선택
            </h3>
            <Select value={selectedClient?.id} onValueChange={(v) => setSelectedClient(SAMPLE_CLIENTS.find(c => c.id === v) || null)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="고객사 선택" />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_CLIENTS.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedClient && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <div className="text-xs text-zinc-500">전체 AUM</div>
                    <div className="text-lg font-bold">{selectedClient.totalAum.toLocaleString()}억</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xs text-emerald-400">EG 담당</div>
                    <div className="text-lg font-bold text-emerald-400">{selectedClient.egAum.toLocaleString()}억</div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  EG 담당 펀드: {selectedClient.egFunds.map(f => f.name).join(", ")}
                </div>
              </div>
            )}
          </Card>

          {/* Trigger Event Selection */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              이벤트/트리거 선택
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {TRIGGER_EVENTS.map(event => (
                  <Button
                    key={event.id}
                    variant={selectedTrigger?.id === event.id ? "default" : "outline"}
                    size="sm"
                    className={`text-xs justify-start ${selectedTrigger?.id === event.id ? "bg-amber-600" : "border-zinc-700"}`}
                    onClick={() => setSelectedTrigger(event)}
                  >
                    {event.name}
                  </Button>
                ))}
              </div>

              {selectedTrigger?.type === "시공사부도" && (
                <div className="space-y-2">
                  <Label className="text-xs">대상 시공사</Label>
                  <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="시공사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACTORS.map(contractor => (
                        <SelectItem key={contractor} value={contractor}>{contractor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">심각도</Label>
                  <Badge className={`text-xs ${severity === "severe" ? "bg-red-500/20 text-red-400" : severity === "moderate" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-600"}`}>
                    {severity === "severe" ? "심각" : severity === "moderate" ? "보통" : "경미"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {(["mild", "moderate", "severe"] as const).map(s => (
                    <Button
                      key={s}
                      variant={severity === s ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 text-xs ${severity === s ? (s === "severe" ? "bg-red-600" : s === "moderate" ? "bg-amber-600" : "bg-zinc-600") : "border-zinc-700"}`}
                      onClick={() => setSeverity(s)}
                    >
                      {s === "severe" ? "심각" : s === "moderate" ? "보통" : "경미"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={runAnalysis}
              disabled={isAnalyzing || !selectedClient || !selectedTrigger}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  임팩트 분석 실행
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Panel - Results */}
        <div className="col-span-8">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-zinc-800 px-4">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="analysis" className="data-[state=active]:bg-zinc-800">
                    EG 담당 분석
                  </TabsTrigger>
                  <TabsTrigger value="propagation" className="data-[state=active]:bg-zinc-800">
                    전파 경로
                  </TabsTrigger>
                  <TabsTrigger value="total" className="data-[state=active]:bg-zinc-800">
                    전체 포트폴리오
                  </TabsTrigger>
                  <TabsTrigger value="report" className="data-[state=active]:bg-zinc-800">
                    서술형 리포트
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* EG Analysis Tab */}
              <TabsContent value="analysis" className="p-4">
                {analysisResult ? (
                  <div className="space-y-6">
                    {/* Impact Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      <Card className="p-4 bg-zinc-800/30 border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-1">총 노출액</div>
                        <div className="text-2xl font-bold">{analysisResult.egExposure}억</div>
                      </Card>
                      <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
                        <div className="text-xs text-emerald-400 mb-1">Best Case</div>
                        <div className="text-2xl font-bold text-emerald-400">-{analysisResult.bestCase.loss}억</div>
                        <div className="text-xs text-zinc-500">-{analysisResult.bestCase.pct.toFixed(1)}%</div>
                      </Card>
                      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                        <div className="text-xs text-amber-400 mb-1">Expected</div>
                        <div className="text-2xl font-bold text-amber-400">-{analysisResult.expected.loss}억</div>
                        <div className="text-xs text-zinc-500">-{analysisResult.expected.pct.toFixed(1)}%</div>
                      </Card>
                      <Card className="p-4 bg-red-500/10 border-red-500/30">
                        <div className="text-xs text-red-400 mb-1">Worst Case</div>
                        <div className="text-2xl font-bold text-red-400">-{analysisResult.worstCase.loss}억</div>
                        <div className="text-xs text-zinc-500">-{analysisResult.worstCase.pct.toFixed(1)}%</div>
                      </Card>
                    </div>

                    {/* K-ICS Impact */}
                    <Card className="p-4 bg-zinc-800/30 border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">K-ICS 자본적정성 영향</div>
                          <div className="text-xs text-zinc-500 mt-1">Expected 시나리오 기준</div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-amber-400">{analysisResult.kicsImpact.toFixed(1)}%p</div>
                        </div>
                      </div>
                      <Progress value={Math.abs(analysisResult.kicsImpact) * 10} className="mt-4 h-2" />
                    </Card>

                    {/* Scenario Comparison Chart */}
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Best Case", value: -analysisResult.bestCase.loss, fill: "#10b981" },
                            { name: "Expected", value: -analysisResult.expected.loss, fill: "#f59e0b" },
                            { name: "Worst Case", value: -analysisResult.worstCase.loss, fill: "#ef4444" }
                          ]}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} width={80} />
                          <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {[
                              { name: "Best Case", fill: "#10b981" },
                              { name: "Expected", fill: "#f59e0b" },
                              { name: "Worst Case", fill: "#ef4444" }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                    <Network className="w-12 h-12 mb-4 text-zinc-700" />
                    <p className="text-sm">임팩트 분석을 실행해주세요</p>
                    <p className="text-xs mt-1">고객사와 트리거 이벤트를 선택 후 분석 버튼 클릭</p>
                  </div>
                )}
              </TabsContent>

              {/* Propagation Path Tab */}
              <TabsContent value="propagation" className="p-4">
                {analysisResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">전파 경로 시각화 (Graph 기반)</h4>
                      <Badge variant="outline" className="text-xs">
                        Neo4j 쿼리 결과
                      </Badge>
                    </div>
                    <ScrollArea className="h-[400px]">
                      {analysisResult.propagationPath.map(node => renderPropagationNode(node))}
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                    <Network className="w-12 h-12 mb-4 text-zinc-700" />
                    <p className="text-sm">분석 결과가 없습니다</p>
                  </div>
                )}
              </TabsContent>

              {/* Total Portfolio Tab */}
              <TabsContent value="total" className="p-4">
                <div className="space-y-6">
                  {/* Portfolio Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-emerald-400">EG자산평가 담당</div>
                          <div className="text-2xl font-bold mt-1">{selectedClient?.egAum.toLocaleString()}억</div>
                          <div className="text-xs text-zinc-500 mt-1">{((selectedClient?.egAum || 0) / (selectedClient?.totalAum || 1) * 100).toFixed(1)}%</div>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400">정밀 분석</Badge>
                      </div>
                    </Card>
                    <Card className="p-4 bg-zinc-800/30 border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-zinc-500">타 평가사 담당</div>
                          <div className="text-2xl font-bold mt-1">{externalPortfolios.reduce((sum, p) => sum + p.aum, 0).toLocaleString()}억</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {((externalPortfolios.reduce((sum, p) => sum + p.aum, 0)) / (selectedClient?.totalAum || 1) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <Badge className="bg-zinc-700">유사도 추정</Badge>
                      </div>
                    </Card>
                  </div>

                  {/* External Portfolios Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">평가사별 담당 현황</h4>
                      <Button size="sm" variant="outline" className="text-xs border-zinc-700" onClick={() => setAddExternalDialogOpen(true)}>
                        <Plus className="w-3 h-3 mr-1" />
                        타사 펀드 추가
                      </Button>
                    </div>
                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-800/50">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-400">평가사</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-zinc-400">AUM</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-zinc-400">비중</th>
                            <th className="text-center py-2 px-3 text-xs font-medium text-zinc-400">펀드 수</th>
                            <th className="text-center py-2 px-3 text-xs font-medium text-zinc-400">데이터</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-zinc-800 bg-emerald-500/5">
                            <td className="py-2 px-3 font-medium text-emerald-400">EG자산평가</td>
                            <td className="py-2 px-3 text-right">{selectedClient?.egAum.toLocaleString()}억</td>
                            <td className="py-2 px-3 text-right">{((selectedClient?.egAum || 0) / (selectedClient?.totalAum || 1) * 100).toFixed(1)}%</td>
                            <td className="py-2 px-3 text-center">{selectedClient?.egFunds.length || 0}</td>
                            <td className="py-2 px-3 text-center"><Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">상세</Badge></td>
                          </tr>
                          {externalPortfolios.map(portfolio => (
                            <tr key={portfolio.id} className="border-t border-zinc-800">
                              <td className="py-2 px-3">{portfolio.evaluator}</td>
                              <td className="py-2 px-3 text-right">{portfolio.aum.toLocaleString()}억</td>
                              <td className="py-2 px-3 text-right">{(portfolio.aum / (selectedClient?.totalAum || 1) * 100).toFixed(1)}%</td>
                              <td className="py-2 px-3 text-center">{portfolio.fundCount}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={`text-[10px] ${portfolio.dataLevel === "HIGH" ? "bg-emerald-500/20 text-emerald-400" : portfolio.dataLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-400"}`}>
                                  {portfolio.dataLevel === "HIGH" ? "상세" : portfolio.dataLevel === "MEDIUM" ? "기본" : "요약"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total Impact Summary */}
                  {totalImpact && analysisResult && (
                    <Card className="p-4 bg-zinc-800/30 border-zinc-700">
                      <h4 className="font-medium text-sm mb-4">전사 포트폴리오 임팩트 추정</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-emerald-400">EG 담당분 손실</div>
                          <div className="text-xl font-bold">-{totalImpact.egLoss}억</div>
                          <div className="text-xs text-zinc-500">정밀 분석</div>
                        </div>
                        <div>
                          <div className="text-xs text-amber-400">타사 담당분 손실 (추정)</div>
                          <div className="text-xl font-bold">-{totalImpact.externalLoss}억</div>
                          <div className="text-xs text-zinc-500">유사도 기반</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-3 -m-1">
                          <div className="text-xs text-red-400">전체 손실 합계</div>
                          <div className="text-2xl font-bold text-red-400">-{totalImpact.totalLoss}억</div>
                          <div className="text-xs text-zinc-500">-{totalImpact.totalPct}%</div>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-4">
                        * 타사 담당분은 입력된 기본 정보(자산유형, 지역, 시공사)와 EG 분석 데이터의 유사도를 기반으로 추정한 값이며, 실제와 차이가 있을 수 있습니다.
                      </p>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Narrative Report Tab */}
              <TabsContent value="report" className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">서술형 임팩트 리포트</h4>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700" 
                      onClick={generateReport}
                      disabled={!analysisResult || isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI 리포트 생성
                        </>
                      )}
                    </Button>
                  </div>

                  {generatedReport ? (
                    <div className="space-y-4">
                      <Card className="p-6 bg-zinc-800/30 border-zinc-700">
                        <ScrollArea className="h-[350px]">
                          <div className="prose prose-invert prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                              {generatedReport}
                            </pre>
                          </div>
                        </ScrollArea>
                      </Card>
                      <div className="flex justify-between">
                        <div className="flex gap-2">
                          <Button variant="outline" className="border-zinc-700">
                            <Download className="w-4 h-4 mr-2" />
                            PDF 다운로드
                          </Button>
                          <Button variant="outline" className="border-zinc-700">
                            <FileText className="w-4 h-4 mr-2" />
                            Word 다운로드
                          </Button>
                        </div>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => setSendReportDialogOpen(true)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          고객에게 전송
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                      <FileText className="w-12 h-12 mb-4 text-zinc-700" />
                      <p className="text-sm">서술형 리포트를 생성해주세요</p>
                      <p className="text-xs mt-1">임팩트 분석 실행 후 AI 리포트 생성 버튼 클릭</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Add External Portfolio Dialog */}
      <Dialog open={addExternalDialogOpen} onOpenChange={setAddExternalDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              타사 펀드 정보 추가
            </DialogTitle>
            <DialogDescription>
              타 평가사 담당 펀드의 기본 정보를 입력하여 전사 임팩트 추정에 활용합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">평가사</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="평가사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fn">FN자산평가</SelectItem>
                    <SelectItem value="korea">한국자산평가</SelectItem>
                    <SelectItem value="kis">KIS자산평가</SelectItem>
                    <SelectItem value="nice">나이스P&I</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">AUM (억원)</Label>
                <Input type="number" placeholder="500" className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">펀드명</Label>
              <Input placeholder="펀드명 입력" className="bg-zinc-800 border-zinc-700" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">자산 유형</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="자산 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realestate-pf">부동산 PF</SelectItem>
                    <SelectItem value="realestate-income">수익형 부동산</SelectItem>
                    <SelectItem value="infra">인프라</SelectItem>
                    <SelectItem value="special">특수자산</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">지역</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="지역" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seoul">서울</SelectItem>
                    <SelectItem value="metropolitan">수도권</SelectItem>
                    <SelectItem value="local">지방 광역시</SelectItem>
                    <SelectItem value="overseas">해외</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">주요 시공사</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="시공사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTORS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">평균 LTV (%)</Label>
                <Input type="number" placeholder="60" className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setAddExternalDialogOpen(false)}>
              취소
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analysis Workflow Dialog */}
      <Dialog open={analysisWorkflowDialogOpen} onOpenChange={setAnalysisWorkflowDialogOpen}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Network className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle>임팩트 분석 워크플로우</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Graph DB 기반 연쇄 영향 분석 진행 중
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            {/* Workflow Steps */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { step: 0, title: "Graph DB 연결", desc: "Neo4j 데이터베이스 연결", icon: Database },
                { step: 1, title: "관계 조회", desc: "GUARANTEES, OWNS, INVESTS_IN 관계 탐색", icon: Link2 },
                { step: 2, title: "영향계수 로드", desc: "propagationWeight, LTV, DSCR 로드", icon: BarChart3 },
                { step: 3, title: "전파경로 매핑", desc: "시공사 → 프로젝트 → 펀드 → 투자자", icon: Network },
                { step: 4, title: "임팩트 계산", desc: "시나리오별 손실액 산출", icon: Target },
                { step: 5, title: "결과 생성", desc: "분석 결과 및 리포트 준비", icon: CheckCircle2 },
              ].map(({ step, title, desc, icon: Icon }) => {
                const isActive = workflowStep === step
                const isComplete = workflowStep > step
                const isPending = workflowStep < step
                
                return (
                  <div key={step} className={`p-4 rounded-lg border transition-all ${
                    isComplete ? "bg-emerald-500/10 border-emerald-500/30" :
                    isActive ? "bg-blue-500/10 border-blue-500/30" :
                    "bg-zinc-800/30 border-zinc-700"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isComplete ? "bg-emerald-500/20" :
                        isActive ? "bg-blue-500/20" :
                        "bg-zinc-700"
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                          <Icon className={`w-4 h-4 ${isPending ? "text-zinc-500" : "text-blue-400"}`} />
                        )}
                      </div>
                      <div className={`font-medium text-sm ${isPending ? "text-zinc-500" : ""}`}>{title}</div>
                    </div>
                    <div className="text-xs text-zinc-500 ml-11">{desc}</div>
                  </div>
                )
              })}
            </div>

            {/* Progress */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">분석 진행률</span>
                <span className="text-emerald-400">{Math.round((workflowStep / 6) * 100)}%</span>
              </div>
              <Progress value={(workflowStep / 6) * 100} className="h-2" />
            </div>

            {/* Live Query Display */}
            {workflowStep >= 1 && workflowStep < 6 && (
              <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                  <Database className="w-3 h-3" />
                  실행 중인 Cypher 쿼리
                </div>
                <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">
{workflowStep === 1 ? `MATCH (c:Company {name: '${selectedContractor || "한양건설"}'})-[g:GUARANTEES]->(a:Asset)
MATCH (a)<-[o:OWNS]-(f:Fund)<-[i:INVESTS_IN]-(inv:Investor)
WHERE inv.name = '${selectedClient?.name}'
RETURN c, g, a, o, f, i, inv` :
workflowStep === 2 ? `MATCH (c:Company)-[g:GUARANTEES]->(a:Asset)
WHERE c.name = '${selectedContractor || "한양건설"}'
RETURN g.propagationWeight as weight, 
       a.ltv_current as ltv, 
       a.dscr_current as dscr,
       a.value as assetValue` :
workflowStep === 3 ? `// 전파경로 매핑 결과
시공사(${selectedContractor || "한양건설"}) --[GUARANTEES, w=0.85]--> 강남 오피스 PF
강남 오피스 PF --[OWNS, pct=60%]--> EG 대체투자 1호
EG 대체투자 1호 --[INVESTS_IN, pct=25%]--> ${selectedClient?.name}` :
workflowStep === 4 ? `// 시나리오별 손실 계산
Base Exposure: ${selectedClient?.egAum ? selectedClient.egAum * 0.25 : 0}억원
Severity: ${severity === "severe" ? "심각" : severity === "moderate" ? "보통" : "경미"}
Best Case: -${Math.round((selectedClient?.egAum || 0) * 0.25 * 0.05 * (severity === "severe" ? 1.5 : severity === "moderate" ? 1.0 : 0.6))}억원
Expected: -${Math.round((selectedClient?.egAum || 0) * 0.25 * 0.12 * (severity === "severe" ? 1.5 : severity === "moderate" ? 1.0 : 0.6))}억원
Worst Case: -${Math.round((selectedClient?.egAum || 0) * 0.25 * 0.22 * (severity === "severe" ? 1.5 : severity === "moderate" ? 1.0 : 0.6))}억원` :
`// 분석 완료 - 결과 생성 중...`}
                </pre>
              </div>
            )}

            {/* Graph Visualization Preview */}
            {workflowStep >= 3 && (
              <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-3">전파경로 시각화</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="px-3 py-2 rounded bg-red-500/20 border border-red-500/30 text-xs">
                    {selectedContractor || "한양건설"}
                    <div className="text-[10px] text-red-400">시공사</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                  <div className="px-3 py-2 rounded bg-amber-500/20 border border-amber-500/30 text-xs">
                    강남 오피스 PF
                    <div className="text-[10px] text-amber-400">프로젝트</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                  <div className="px-3 py-2 rounded bg-blue-500/20 border border-blue-500/30 text-xs">
                    EG 대체투자 1호
                    <div className="text-[10px] text-blue-400">펀드</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                  <div className="px-3 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-xs">
                    {selectedClient?.name}
                    <div className="text-[10px] text-emerald-400">투자자</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-8 mt-2 text-[10px] text-zinc-500">
                  <span>GUARANTEES (w=0.85)</span>
                  <span>OWNS (60%)</span>
                  <span>INVESTS_IN (25%)</span>
                </div>
              </div>
            )}

            {/* Completion */}
            {workflowStep === 6 && (
              <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="font-medium">분석 완료</div>
                <div className="text-xs text-zinc-400 mt-1">결과가 화면에 표시됩니다</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Report to Customer Dialog */}
      <Dialog open={sendReportDialogOpen} onOpenChange={setSendReportDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle>고객 리포트 전송</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  임팩트 분석 리포트를 고객에게 전송합니다
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <div className="text-xs text-zinc-500 mb-2">수신자</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium">{selectedClient?.name}</div>
                  <div className="text-xs text-zinc-500">analyst@{selectedClient?.name.toLowerCase().replace(/\s/g, "")}.com</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <div className="text-xs text-zinc-500 mb-2">전송 내용</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>포트폴리오 임팩트 분석 리포트 (PDF)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>전파경로 시각화 자료</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>시나리오별 손실 분석 데이터</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="text-xs text-amber-200">
                  본 리포트에는 민감한 투자 정보가 포함되어 있습니다. 
                  전송 전 내용을 다시 한번 확인해주세요.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setSendReportDialogOpen(false)}>
              취소
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleSendReport}
              disabled={isSendingReport}
            >
              {isSendingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  리포트 전송
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
