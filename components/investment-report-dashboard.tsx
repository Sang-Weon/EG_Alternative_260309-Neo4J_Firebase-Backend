"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  FileText, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  ArrowRight, ChevronRight, Loader2, Download, RefreshCw,
  Target, Shield, Zap, BarChart3, Network, Clock, CircleDot
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ReportGenerator, InvestmentReport, ActionItem, DecisionPath } from "@/lib/report-generator"
import { SimulationWritebackService, WritebackSummary } from "@/lib/simulation-writeback-service"
import { AIPLogic } from "@/lib/aip-logic"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from "recharts"

// ═══════════════════════════════════════════════════════════════════════════
// 색상 정의
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = {
  primary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  muted: "#6b7280"
}

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  low: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" }
}

const recommendationConfig: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  invest: { icon: TrendingUp, color: "text-emerald-400", label: "투자 실행 권고", bg: "bg-emerald-500/10" },
  hold: { icon: Target, color: "text-blue-400", label: "현상 유지 권고", bg: "bg-blue-500/10" },
  divest: { icon: XCircle, color: "text-red-400", label: "매각/청산 권고", bg: "bg-red-500/10" },
  restructure: { icon: RefreshCw, color: "text-amber-400", label: "구조조정 권고", bg: "bg-amber-500/10" }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export function InvestmentReportDashboard() {
  const [reports, setReports] = useState<InvestmentReport[]>([])
  const [selectedReport, setSelectedReport] = useState<InvestmentReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [writebackSummary, setWritebackSummary] = useState<WritebackSummary | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()

  useEffect(() => {
    const unsub = ReportGenerator.subscribeToReports((data) => {
      setReports(data)
      if (!selectedReport && data.length > 0) {
        setSelectedReport(data[0])
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    loadWritebackSummary()
  }, [])

  const loadWritebackSummary = async () => {
    const summary = await SimulationWritebackService.getWritebackSummary()
    setWritebackSummary(summary)
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      // 샘플 데이터로 보고서 생성 (실제로는 시뮬레이션 결과를 사용)
      const sampleValuation = {
        fairValue: 850,
        npv: 120,
        irr: 0.092,
        discountRate: 0.085,
        riskPremium: 0.025,
        valuationMethod: "DCF",
        cashFlows: []
      }

      const sampleRisk = {
        ltv: 0.65,
        dscr: 1.35,
        icr: 2.1,
        pd: 0.03,
        lgd: 0.35,
        expectedLoss: 0.0105,
        riskScore: 45,
        riskGrade: "B+" as const
      }

      const report = await ReportGenerator.generateReport({
        projectId: `proj-${Date.now()}`,
        projectName: "센트럴파크 오피스 개발 PF",
        valuationResult: sampleValuation,
        riskMetrics: sampleRisk,
        scenarios: [
          { name: "Base Case", result: { summary: { irr: 0.092, npv: 120, fairValue: 850 } } },
          { name: "Upside", result: { summary: { irr: 0.125, npv: 180, fairValue: 950 } } },
          { name: "Downside", result: { summary: { irr: 0.065, npv: 60, fairValue: 720 } } }
        ]
      })

      setSelectedReport(report)
      toast({
        title: "보고서 생성 완료",
        description: `${report.title} 보고서가 생성되었습니다.`
      })
    } catch (error) {
      toast({
        title: "보고서 생성 실패",
        description: "오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetryWritebacks = async () => {
    const count = await SimulationWritebackService.retryPendingWritebacks()
    toast({
      title: "Writeback 재시도 완료",
      description: `${count}개 레코드 처리됨`
    })
    loadWritebackSummary()
  }

  if (!selectedReport) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 p-8">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="w-12 h-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">보고서가 없습니다</h3>
          <p className="text-sm text-zinc-500 mb-4">시뮬레이션을 실행하고 보고서를 생성하세요</p>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            샘플 보고서 생성
          </Button>
        </div>
      </Card>
    )
  }

  const recConfig = recommendationConfig[selectedReport.executiveSummary.overallRecommendation]
  const RecIcon = recConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            투자 분석 보고서
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
              Final Report
            </Badge>
          </h2>
          <p className="text-sm text-zinc-400">{selectedReport.title}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRetryWritebacks}
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            <Network className="w-4 h-4 mr-2" />
            Writeback 동기화
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            새 보고서 생성
          </Button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <Card className={`${recConfig.bg} border-zinc-800 p-6`}>
        <div className="flex items-start gap-6">
          <div className={`p-4 rounded-xl ${recConfig.bg} border ${recConfig.color.replace("text-", "border-")}/30`}>
            <RecIcon className={`w-8 h-8 ${recConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`text-2xl font-bold ${recConfig.color}`}>{recConfig.label}</h3>
              <Badge className="bg-zinc-900/50 text-zinc-300 border-zinc-700">
                신뢰도 {selectedReport.executiveSummary.confidenceLevel}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-zinc-500">예상 수익률 (IRR)</div>
                <div className="text-xl font-bold text-emerald-400">
                  {(selectedReport.executiveSummary.expectedReturn * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">리스크 조정 수익률</div>
                <div className="text-xl font-bold text-blue-400">
                  {(selectedReport.executiveSummary.riskAdjustedReturn * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">주요 리스크</div>
                <div className="text-xl font-bold text-amber-400">
                  {selectedReport.executiveSummary.criticalRisks.length}건
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Writeback Status */}
      {writebackSummary && (
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-400" />
              Kinetic Layer Writeback 현황
            </h4>
            <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">
              총 {writebackSummary.totalRecords}건
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{writebackSummary.pending}</div>
              <div className="text-[10px] text-zinc-500">대기중</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{writebackSummary.executing}</div>
              <div className="text-[10px] text-zinc-500">실행중</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{writebackSummary.success}</div>
              <div className="text-[10px] text-zinc-500">성공</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-400">{writebackSummary.failed}</div>
              <div className="text-[10px] text-zinc-500">실패</div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-zinc-800/50 p-1 mb-6">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="valuation">가치평가</TabsTrigger>
            <TabsTrigger value="risk">리스크</TabsTrigger>
            <TabsTrigger value="decision">의사결정 경로</TabsTrigger>
            <TabsTrigger value="actions">액션 아이템</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  주요 발견사항
                </h4>
                <div className="space-y-2">
                  {selectedReport.executiveSummary.keyFindings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg">
                      <CircleDot className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-zinc-300">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  주요 리스크
                </h4>
                <div className="space-y-2">
                  {selectedReport.executiveSummary.criticalRisks.length > 0 ? (
                    selectedReport.executiveSummary.criticalRisks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-zinc-300">{risk}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
                      Critical 리스크 없음
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Valuation Tab */}
          <TabsContent value="valuation">
            {selectedReport.sections.find(s => s.type === "valuation") ? (
              <ValuationSection section={selectedReport.sections.find(s => s.type === "valuation")!} />
            ) : (
              <div className="text-center text-zinc-500 py-8">가치평가 데이터 없음</div>
            )}
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk">
            {selectedReport.sections.find(s => s.type === "risk") ? (
              <RiskSection section={selectedReport.sections.find(s => s.type === "risk")!} />
            ) : (
              <div className="text-center text-zinc-500 py-8">리스크 데이터 없음</div>
            )}
          </TabsContent>

          {/* Decision Path Tab */}
          <TabsContent value="decision">
            <DecisionPathSection paths={selectedReport.decisionPaths} />
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <ActionItemsSection items={selectedReport.actionItems} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Report History */}
      {reports.length > 1 && (
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            보고서 이력
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {reports.slice(0, 5).map((report) => (
              <Button
                key={report.id}
                variant={report.id === selectedReport?.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedReport(report)}
                className={report.id === selectedReport?.id ? "bg-purple-600" : "border-zinc-700"}
              >
                {report.projectName || "보고서"}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub Components
// ═══════════════════════════════════════════════════════════════════════════

function ValuationSection({ section }: { section: any }) {
  const { content } = section
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-800/50 border-zinc-700 p-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">공정가치</div>
          <div className="text-2xl font-bold text-emerald-400">{content.fairValue?.toFixed(0) || "-"}억</div>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700 p-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">NPV</div>
          <div className="text-2xl font-bold text-blue-400">{content.npv?.toFixed(0) || "-"}억</div>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700 p-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">IRR</div>
          <div className="text-2xl font-bold text-purple-400">{((content.irr || 0) * 100).toFixed(1)}%</div>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700 p-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">할인율</div>
          <div className="text-2xl font-bold text-amber-400">{((content.discountRate || 0) * 100).toFixed(1)}%</div>
        </Card>
      </div>

      {section.tables?.[0] && (
        <Card className="bg-zinc-800/30 border-zinc-700 p-4">
          <h4 className="font-semibold mb-3">{section.tables[0].title}</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {section.tables[0].headers.map((h: string, i: number) => (
                  <th key={i} className="text-left py-2 text-zinc-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.tables[0].rows.map((row: any[], i: number) => (
                <tr key={i} className="border-b border-zinc-800">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 text-zinc-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function RiskSection({ section }: { section: any }) {
  const { content } = section
  
  const radarData = [
    { metric: "LTV", value: (content.ltv || 0) * 100, fullMark: 100 },
    { metric: "DSCR", value: Math.min((content.dscr || 0) * 50, 100), fullMark: 100 },
    { metric: "PD", value: (content.pd || 0) * 1000, fullMark: 100 },
    { metric: "LGD", value: (content.lgd || 0) * 100, fullMark: 100 },
    { metric: "Risk Score", value: content.riskScore || 0, fullMark: 100 }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-zinc-800/30 border-zinc-700 p-4">
          <h4 className="font-semibold mb-4">리스크 프로파일</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 10 }} />
                <Radar name="현재값" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className={`p-4 ${content.ltv > 0.7 ? "bg-red-500/10 border-red-500/30" : "bg-zinc-800/30 border-zinc-700"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-500">LTV (담보인정비율)</div>
                <div className="text-xl font-bold">{((content.ltv || 0) * 100).toFixed(1)}%</div>
              </div>
              <Badge className={content.ltv > 0.7 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                {content.ltv > 0.7 ? "위험" : "정상"}
              </Badge>
            </div>
            <Progress value={(content.ltv || 0) * 100} className="h-1.5 mt-2" />
          </Card>

          <Card className={`p-4 ${content.dscr < 1.2 ? "bg-red-500/10 border-red-500/30" : "bg-zinc-800/30 border-zinc-700"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-500">DSCR (원리금상환비율)</div>
                <div className="text-xl font-bold">{(content.dscr || 0).toFixed(2)}x</div>
              </div>
              <Badge className={content.dscr < 1.2 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                {content.dscr < 1.2 ? "위험" : "정상"}
              </Badge>
            </div>
          </Card>

          <Card className="bg-zinc-800/30 border-zinc-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-500">리스크 등급</div>
                <div className="text-xl font-bold">{content.riskGrade || "N/A"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">종합 점수</div>
                <div className="text-xl font-bold text-purple-400">{(content.riskScore || 0).toFixed(0)}점</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DecisionPathSection({ paths }: { paths: DecisionPath[] }) {
  const [expandedPath, setExpandedPath] = useState<string | null>(paths[0]?.id || null)

  return (
    <div className="space-y-4">
      {paths.map((path) => (
        <Card
          key={path.id}
          className={`border-zinc-700 transition-all ${expandedPath === path.id ? "bg-zinc-800/50" : "bg-zinc-800/30"}`}
        >
          <button
            onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div>
              <h4 className="font-semibold text-purple-300">{path.question}</h4>
              <p className="text-xs text-zinc-500 mt-1">현재 상태: {path.currentState}</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${expandedPath === path.id ? "rotate-90" : ""}`} />
          </button>

          {expandedPath === path.id && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {path.options.map((option, idx) => (
                  <Card
                    key={idx}
                    className={`p-4 border ${option.recommendation ? "bg-purple-500/10 border-purple-500/30" : "bg-zinc-900/50 border-zinc-700"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-sm">{option.label}</h5>
                      {option.recommendation && (
                        <Badge className="bg-purple-500/20 text-purple-300 text-[9px]">권고</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">{option.description}</p>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-[10px] text-emerald-400 mb-1">장점</div>
                        <ul className="text-[10px] text-zinc-400 space-y-0.5">
                          {option.pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[10px] text-red-400 mb-1">단점</div>
                        <ul className="text-[10px] text-zinc-400 space-y-0.5">
                          {option.cons.map((con, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-700">
                      <div className="text-[10px] text-zinc-500 mb-1">Next Steps</div>
                      <div className="flex flex-wrap gap-1">
                        {option.nextSteps.map((step, i) => (
                          <Badge key={i} className="bg-zinc-800 text-zinc-400 text-[9px]">{step}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 mb-1">분석 근거</div>
                <p className="text-xs text-zinc-300">{path.rationale}</p>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function ActionItemsSection({ items }: { items: ActionItem[] }) {
  const sortedItems = [...items].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {(["critical", "high", "medium", "low"] as const).map((priority) => {
          const count = items.filter(i => i.priority === priority).length
          const config = priorityColors[priority]
          return (
            <Card key={priority} className={`${config.bg} border ${config.border} p-3 text-center`}>
              <div className={`text-xl font-bold ${config.text}`}>{count}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{priority}</div>
            </Card>
          )
        })}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {sortedItems.map((item) => {
            const config = priorityColors[item.priority]
            return (
              <Card key={item.id} className={`${config.bg} border ${config.border} p-4`}>
                <div className="flex items-start gap-3">
                  <Badge className={`${config.bg} ${config.text} border ${config.border} text-[9px] uppercase`}>
                    {item.priority}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[9px]">{item.category}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
                    {item.deadline && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
                        <Clock className="w-3 h-3" />
                        기한: {item.deadline}
                      </div>
                    )}
                  </div>
                  <Badge className={`${item.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"} text-[9px]`}>
                    {item.status === "pending" ? "대기" : item.status === "in_progress" ? "진행중" : "완료"}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
