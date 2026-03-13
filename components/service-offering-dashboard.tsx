"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  FileText, TrendingUp, Calculator, CheckCircle2, 
  Loader2, Download, RefreshCw, Send, Calendar,
  Building2, Briefcase, BarChart3, PieChart, Target,
  Clock, FileBarChart, Users, Mail, Eye, Sparkles,
  ChevronRight, AlertTriangle, Shield, Network, X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, PieChart as RechartsPie, Pie, Cell
} from "recharts"

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════
interface ClientReport {
  id: string
  title: string
  type: "valuation" | "risk" | "portfolio" | "market" | "esg" | "custom"
  status: "draft" | "generating" | "review" | "approved" | "sent"
  client: {
    name: string
    type: "GP" | "LP" | "기관투자자" | "일반기업"
  }
  fund?: string
  period: {
    from: string
    to: string
  }
  createdAt: string
  updatedAt: string
  sections: ReportSection[]
  summary?: {
    totalAssets: number
    totalValue: number
    returnRate: number
    riskScore: number
  }
}

interface ReportSection {
  id: string
  title: string
  type: "summary" | "chart" | "table" | "analysis" | "recommendation"
  content: any
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: "valuation" | "risk" | "portfolio" | "market" | "esg" | "custom"
  sections: string[]
  icon: any
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════
const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "valuation",
    name: "자산운용보고서",
    description: "펀드 운용 현황 및 자산 가치평가 결과 보고서",
    type: "valuation",
    sections: ["요약", "자산현황", "가치평가", "성과분석", "리스크"],
    icon: Calculator
  },
  {
    id: "risk",
    name: "리스크 분석 보고서",
    description: "포트폴리오 리스크 분석 및 스트레스 테스트 결과",
    type: "risk",
    sections: ["요약", "리스크프로파일", "시나리오분석", "권고사항"],
    icon: Shield
  },
  {
    id: "portfolio",
    name: "포트폴리오 종합 보고서",
    description: "전체 포트폴리오 성과 및 자산배분 현황",
    type: "portfolio",
    sections: ["요약", "자산배분", "성과분석", "벤치마크비교"],
    icon: PieChart
  },
  {
    id: "market",
    name: "시장 인텔리전스 보고서",
    description: "대체투자 시장 동향 및 전망 분석",
    type: "market",
    sections: ["요약", "시장동향", "경쟁분석", "투자기회"],
    icon: TrendingUp
  },
  {
    id: "esg",
    name: "ESG 통합 평가 보고서",
    description: "ESG 성과 및 지속가능성 평가 보고서",
    type: "esg",
    sections: ["요약", "환경", "사회", "지배구조", "통합점수"],
    icon: Target
  }
]

const SAMPLE_REPORTS: ClientReport[] = [
  {
    id: "rpt-001",
    title: "2024년 4분기 자산운용보고서",
    type: "valuation",
    status: "approved",
    client: { name: "국민연금", type: "기관투자자" },
    fund: "EG 대체투자 1호",
    period: { from: "2024-10-01", to: "2024-12-31" },
    createdAt: "2025-01-15",
    updatedAt: "2025-01-20",
    sections: [],
    summary: { totalAssets: 12, totalValue: 8500, returnRate: 8.5, riskScore: 42 }
  },
  {
    id: "rpt-002",
    title: "강남 오피스 PF 가치평가 보고서",
    type: "valuation",
    status: "review",
    client: { name: "삼성생명", type: "기관투자자" },
    fund: "EG 부동산 펀드",
    period: { from: "2025-01-01", to: "2025-01-31" },
    createdAt: "2025-02-01",
    updatedAt: "2025-02-05",
    sections: [],
    summary: { totalAssets: 1, totalValue: 1200, returnRate: 9.2, riskScore: 35 }
  },
  {
    id: "rpt-003",
    title: "2024년 ESG 통합 평가 보고서",
    type: "esg",
    status: "sent",
    client: { name: "교직원공제회", type: "기관투자자" },
    fund: "EG 인프라 펀드",
    period: { from: "2024-01-01", to: "2024-12-31" },
    createdAt: "2025-01-25",
    updatedAt: "2025-01-28",
    sections: [],
    summary: { totalAssets: 8, totalValue: 4200, returnRate: 7.8, riskScore: 28 }
  }
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "초안", color: "text-zinc-400", bg: "bg-zinc-500/20" },
  generating: { label: "생성중", color: "text-blue-400", bg: "bg-blue-500/20" },
  review: { label: "검토중", color: "text-amber-400", bg: "bg-amber-500/20" },
  approved: { label: "승인됨", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  sent: { label: "발송됨", color: "text-purple-400", bg: "bg-purple-500/20" }
}

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  valuation: { label: "가치평가", color: "text-blue-400", icon: Calculator },
  risk: { label: "리스크", color: "text-red-400", icon: Shield },
  portfolio: { label: "포트폴리오", color: "text-purple-400", icon: PieChart },
  market: { label: "시장분석", color: "text-emerald-400", icon: TrendingUp },
  esg: { label: "ESG", color: "text-amber-400", icon: Target },
  custom: { label: "맞춤형", color: "text-cyan-400", icon: FileText }
}

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export function ServiceOfferingDashboard() {
  const [reports, setReports] = useState<ClientReport[]>(SAMPLE_REPORTS)
  const [selectedReport, setSelectedReport] = useState<ClientReport | null>(null)
  const [activeTab, setActiveTab] = useState("reports")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showNewReportForm, setShowNewReportForm] = useState(false)
  const [newReportConfig, setNewReportConfig] = useState({
    template: "",
    client: "",
    fund: "",
    periodFrom: "",
    periodTo: ""
  })
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewReportType, setPreviewReportType] = useState<string | null>(null)
  const { toast } = useToast()

  // Sample data for charts
  const portfolioData = [
    { name: "부동산 PF", value: 35, amount: 2975 },
    { name: "수익형부동산", value: 25, amount: 2125 },
    { name: "인프라", value: 20, amount: 1700 },
    { name: "항공기/선박", value: 12, amount: 1020 },
    { name: "신재생에너지", value: 8, amount: 680 }
  ]

  const performanceData = [
    { month: "1월", return: 7.2, benchmark: 6.5 },
    { month: "2월", return: 7.8, benchmark: 6.8 },
    { month: "3월", return: 8.1, benchmark: 7.0 },
    { month: "4월", return: 7.5, benchmark: 6.9 },
    { month: "5월", return: 8.5, benchmark: 7.2 },
    { month: "6월", return: 9.2, benchmark: 7.5 }
  ]

  const riskMetricsData = [
    { metric: "LTV", current: 65, threshold: 70, status: "normal" },
    { metric: "DSCR", current: 1.35, threshold: 1.2, status: "normal" },
    { metric: "ICR", current: 2.1, threshold: 1.5, status: "normal" },
    { metric: "공실률", current: 8, threshold: 15, status: "normal" },
    { metric: "연체율", current: 2.5, threshold: 5, status: "normal" }
  ]

  const handleGenerateReport = async () => {
    if (!newReportConfig.template || !newReportConfig.client) {
      toast({ title: "입력 오류", description: "템플릿과 고객을 선택해 주세요.", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const template = REPORT_TEMPLATES.find(t => t.id === newReportConfig.template)
      const newReport: ClientReport = {
        id: `rpt-${Date.now()}`,
        title: `${template?.name || "보고서"} - ${newReportConfig.client}`,
        type: template?.type || "custom",
        status: "draft",
        client: { name: newReportConfig.client, type: "기관투자자" },
        fund: newReportConfig.fund || undefined,
        period: { from: newReportConfig.periodFrom, to: newReportConfig.periodTo },
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
        sections: [],
        summary: { totalAssets: 5, totalValue: 3500, returnRate: 8.2, riskScore: 38 }
      }

      setReports(prev => [newReport, ...prev])
      setSelectedReport(newReport)
      setShowNewReportForm(false)
      setNewReportConfig({ template: "", client: "", fund: "", periodFrom: "", periodTo: "" })

      toast({ title: "보고서 생성 완료", description: `${newReport.title}이 생성되었습니다.` })
    } catch (error) {
      toast({ title: "생성 실패", description: "보고서 생성 중 오류가 발생했습니다.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendReport = (report: ClientReport) => {
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "sent" as const } : r))
    toast({ title: "보고서 발송됨", description: `${report.client.name}에게 보고서가 발송되었습니다.` })
  }

  const handlePreviewReport = (templateId: string) => {
    setPreviewReportType(templateId)
    setPreviewDialogOpen(true)
  }

  // Generate sample report content based on type
  const getSampleReportContent = (type: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === type)
    const baseData = {
      generatedAt: new Date().toLocaleDateString("ko-KR"),
      period: "2024년 4분기",
      client: "샘플 고객사",
      fund: "EG 대체투자 1호"
    }

    switch (type) {
      case "valuation":
        return {
          ...baseData,
          title: "자산운용보고서 (샘플)",
          summary: {
            totalAssets: 12,
            totalValue: "8,500억원",
            returnRate: "8.5%",
            riskScore: 42
          },
          sections: [
            { title: "요약", content: "본 보고서는 2024년 4분기 자산운용 현황을 분석한 결과입니다." },
            { title: "자산 현황", items: ["부동산 PF: 35%", "수익형 부동산: 25%", "인프라: 20%", "항공기/선박: 12%", "신재생에너지: 8%"] },
            { title: "가치평가 결과", items: ["평가액 증가: +320억원", "수익률: 8.5%", "벤치마크 대비: +1.5%p"] },
            { title: "리스크 현황", items: ["평균 LTV: 62%", "평균 DSCR: 1.45x", "공실률: 5.2%"] }
          ]
        }
      case "risk":
        return {
          ...baseData,
          title: "리스크 분석 보고서 (샘플)",
          summary: {
            riskLevel: "중간",
            watchItems: 3,
            criticalItems: 0,
            monitoringAssets: 8
          },
          sections: [
            { title: "요약", content: "포트폴리오 전반적인 리스크 수준은 안정적으로 관리되고 있습니다." },
            { title: "주요 리스크 지표", items: ["LTV 평균: 62% (한도: 70%)", "DSCR 평균: 1.45x (하한: 1.2x)", "ICR 평균: 2.1x (하한: 1.5x)"] },
            { title: "시나리오 분석", items: ["금리 +1%p: 가치 -2.3%", "공실률 +5%p: 수익률 -1.2%", "부도율 +2%p: 손실 -180억원"] },
            { title: "권고사항", items: ["A 프로젝트 LTV 모니터링 강화", "B 프로젝트 리파이낸싱 검토", "금리 헷지 비율 확대 고려"] }
          ]
        }
      case "portfolio":
        return {
          ...baseData,
          title: "포트폴리오 종합 보고서 (샘플)",
          summary: {
            totalAUM: "8,500억원",
            yieldReturn: "8.5%",
            sharpeRatio: 1.2,
            diversificationScore: 78
          },
          sections: [
            { title: "요약", content: "포트폴리오는 목표 수익률을 초과 달성하며 안정적으로 운용 중입니다." },
            { title: "자산 배분", items: ["부동산: 60%", "인프라: 20%", "특수자산: 12%", "현금성: 8%"] },
            { title: "성과 분석", items: ["절대수익률: 8.5%", "벤치마크 대비: +1.5%p", "샤프비율: 1.2"] },
            { title: "벤치마크 비교", items: ["vs 코스피: +5.2%p", "vs 국채3년: +5.8%p", "vs 대체투자지수: +0.8%p"] }
          ]
        }
      case "market":
        return {
          ...baseData,
          title: "시장 인텔리전스 보고서 (샘플)",
          summary: {
            marketOutlook: "긍정적",
            opportunities: 5,
            threats: 2,
            recommendations: 3
          },
          sections: [
            { title: "요약", content: "대체투자 시장은 금리 하락 기대감으로 회복세를 보이고 있습니다." },
            { title: "시장 동향", items: ["글로벌 대체투자 AUM: +8% YoY", "국내 부동산 거래량: 회복세", "인프라 투자 수요: 증가"] },
            { title: "경쟁 분석", items: ["A사: 물류센터 집중 투자", "B사: 데이터센터 확대", "C사: ESG 투자 강화"] },
            { title: "투자 기회", items: ["물류센터 개발", "친환경 에너지", "디지털 인프라"] }
          ]
        }
      case "esg":
        return {
          ...baseData,
          title: "ESG 통합 평가 보고서 (샘플)",
          summary: {
            esgScore: 72,
            environmentScore: 68,
            socialScore: 75,
            governanceScore: 73
          },
          sections: [
            { title: "요약", content: "ESG 통합 점수 72점으로 업계 평균 대비 우수한 수준입니다." },
            { title: "환경(E)", items: ["탄소배출량: -12% YoY", "친환경 인증: 5건", "재생에너지 비중: 35%"] },
            { title: "사회(S)", items: ["지역사회 기여: 우수", "안전사고: 0건", "협력사 관리: 양호"] },
            { title: "지배구조(G)", items: ["이사회 독립성: 80%", "리스크 관리 체계: 구축 완료", "윤리경영: 준수"] }
          ]
        }
      default:
        return {
          ...baseData,
          title: "보고서 (샘플)",
          summary: {},
          sections: [{ title: "샘플 내용", content: "보고서 미리보기입니다." }]
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" />
            서비스오퍼링 - 대고객 리포트 센터
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
              가치투자분석
            </Badge>
          </h2>
          <p className="text-sm text-zinc-400">
            고객사(GP/LP)에 제공할 가치평가, 리스크 분석, 포트폴리오 보고서를 생성하고 관리합니다
          </p>
        </div>
        <Button
          onClick={() => setShowNewReportForm(true)}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          새 보고서 생성
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "총 보고서", value: reports.length, icon: FileBarChart, color: "text-blue-400" },
          { label: "검토중", value: reports.filter(r => r.status === "review").length, icon: Eye, color: "text-amber-400" },
          { label: "승인됨", value: reports.filter(r => r.status === "approved").length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "발송됨", value: reports.filter(r => r.status === "sent").length, icon: Send, color: "text-purple-400" },
          { label: "고객사", value: new Set(reports.map(r => r.client.name)).size, icon: Users, color: "text-cyan-400" }
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-zinc-800`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-zinc-500">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="bg-zinc-900 border-zinc-800">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="p-4 border-b border-zinc-800">
            <TabsList className="grid w-full grid-cols-4 bg-zinc-800/50">
              <TabsTrigger value="reports">보고서 목록</TabsTrigger>
              <TabsTrigger value="templates">템플릿 관리</TabsTrigger>
              <TabsTrigger value="analytics">분석 대시보드</TabsTrigger>
              <TabsTrigger value="subscriptions">구독 관리</TabsTrigger>
            </TabsList>
          </div>

          {/* Reports Tab */}
          <TabsContent value="reports" className="p-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Report List */}
              <div className="col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">최근 보고서</h3>
                  <Badge variant="outline" className="text-zinc-400">{reports.length}건</Badge>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    {reports.map(report => {
                      const status = statusConfig[report.status]
                      const type = typeConfig[report.type]
                      const TypeIcon = type.icon
                      return (
                        <Card
                          key={report.id}
                          className={`p-4 cursor-pointer transition-all ${
                            selectedReport?.id === report.id
                              ? "border-cyan-500 bg-cyan-500/10"
                              : "border-zinc-800 hover:border-zinc-700"
                          }`}
                          onClick={() => setSelectedReport(report)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${type.color.replace("text", "bg")}/10`}>
                              <TypeIcon className={`w-4 h-4 ${type.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{report.title}</h4>
                              <p className="text-xs text-zinc-500 mt-1">{report.client.name}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={`${status.bg} ${status.color} text-[9px]`}>
                                  {status.label}
                                </Badge>
                                <span className="text-[10px] text-zinc-600">{report.updatedAt}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Report Detail / New Report Form */}
              <div className="col-span-2">
                {showNewReportForm ? (
                  <Card className="bg-zinc-800/30 border-zinc-700 p-6">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      새 보고서 생성
                    </h3>
                    <div className="space-y-6">
                      {/* Template Selection */}
                      <div className="space-y-3">
                        <Label>보고서 템플릿</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {REPORT_TEMPLATES.map(template => {
                            const Icon = template.icon
                            return (
                              <button
                                key={template.id}
                                onClick={() => setNewReportConfig(prev => ({ ...prev, template: template.id }))}
                                className={`p-4 rounded-lg border text-left transition-all ${
                                  newReportConfig.template === template.id
                                    ? "border-cyan-500 bg-cyan-500/10"
                                    : "border-zinc-700 hover:border-zinc-600"
                                }`}
                              >
                                <Icon className={`w-5 h-5 mb-2 ${newReportConfig.template === template.id ? "text-cyan-400" : "text-zinc-400"}`} />
                                <div className="font-medium text-sm">{template.name}</div>
                                <div className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{template.description}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Client & Fund */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>고객사</Label>
                          <Select
                            value={newReportConfig.client}
                            onValueChange={(v) => setNewReportConfig(prev => ({ ...prev, client: v }))}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue placeholder="고객사 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="국민연금">국민연금</SelectItem>
                              <SelectItem value="삼성생명">삼성생명</SelectItem>
                              <SelectItem value="교직원공제회">교직원공제회</SelectItem>
                              <SelectItem value="한화투자증권">한화투자증권</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>펀드</Label>
                          <Select
                            value={newReportConfig.fund}
                            onValueChange={(v) => setNewReportConfig(prev => ({ ...prev, fund: v }))}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue placeholder="펀드 선택 (선택)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EG 대체투자 1호">EG 대체투자 1호</SelectItem>
                              <SelectItem value="EG 부동산 펀드">EG 부동산 펀드</SelectItem>
                              <SelectItem value="EG 인프라 펀드">EG 인프라 펀드</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Period */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>기간 시작</Label>
                          <Input
                            type="date"
                            value={newReportConfig.periodFrom}
                            onChange={(e) => setNewReportConfig(prev => ({ ...prev, periodFrom: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>기간 종료</Label>
                          <Input
                            type="date"
                            value={newReportConfig.periodTo}
                            onChange={(e) => setNewReportConfig(prev => ({ ...prev, periodTo: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowNewReportForm(false)}
                          className="border-zinc-700"
                        >
                          취소
                        </Button>
                        {newReportConfig.template && (
                          <Button
                            variant="outline"
                            onClick={() => handlePreviewReport(newReportConfig.template)}
                            className="border-zinc-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            샘플 미리보기
                          </Button>
                        )}
                        <Button
                          onClick={handleGenerateReport}
                          disabled={isGenerating}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              보고서 생성 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              보고서 생성
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : selectedReport ? (
                  <Card className="bg-zinc-800/30 border-zinc-700 p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{selectedReport.title}</h3>
                          <Badge className={`${statusConfig[selectedReport.status].bg} ${statusConfig[selectedReport.status].color}`}>
                            {statusConfig[selectedReport.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {selectedReport.client.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {selectedReport.period.from} ~ {selectedReport.period.to}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-zinc-700">
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        {selectedReport.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleSendReport(selectedReport)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            발송
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Report Summary */}
                    {selectedReport.summary && (
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-zinc-900/50 rounded-lg p-4">
                          <div className="text-xs text-zinc-500 mb-1">보유 자산 수</div>
                          <div className="text-2xl font-bold text-blue-400">{selectedReport.summary.totalAssets}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-4">
                          <div className="text-xs text-zinc-500 mb-1">총 평가액</div>
                          <div className="text-2xl font-bold text-emerald-400">{selectedReport.summary.totalValue.toLocaleString()}억</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-4">
                          <div className="text-xs text-zinc-500 mb-1">기간 수익률</div>
                          <div className="text-2xl font-bold text-purple-400">{selectedReport.summary.returnRate}%</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-4">
                          <div className="text-xs text-zinc-500 mb-1">리스크 점수</div>
                          <div className="text-2xl font-bold text-amber-400">{selectedReport.summary.riskScore}</div>
                        </div>
                      </div>
                    )}

                    {/* Charts */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-zinc-900/30 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-4">자산 배분</h4>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie
                                data={portfolioData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, value }) => `${name} ${value}%`}
                              >
                                {portfolioData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-zinc-900/30 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-4">수익률 추이</h4>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }} />
                              <Line type="monotone" dataKey="return" stroke="#8b5cf6" strokeWidth={2} name="수익률" />
                              <Line type="monotone" dataKey="benchmark" stroke="#3f3f46" strokeWidth={1} strokeDasharray="3 3" name="벤치마크" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Risk Metrics */}
                    <div className="mt-6">
                      <h4 className="font-semibold text-sm mb-4">리스크 지표 현황</h4>
                      <div className="space-y-3">
                        {riskMetricsData.map(item => (
                          <div key={item.metric} className="flex items-center gap-4">
                            <span className="w-16 text-sm text-zinc-400">{item.metric}</span>
                            <div className="flex-1">
                              <Progress
                                value={(item.current / item.threshold) * 100}
                                className={`h-2 ${item.current < item.threshold ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"}`}
                              />
                            </div>
                            <span className={`text-sm font-mono ${item.current < item.threshold ? "text-emerald-400" : "text-red-400"}`}>
                              {item.current} / {item.threshold}
                            </span>
                            <Badge className={item.current < item.threshold ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                              {item.current < item.threshold ? "정상" : "주의"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="bg-zinc-800/30 border-zinc-700 p-8 flex flex-col items-center justify-center h-[500px]">
                    <FileText className="w-12 h-12 text-zinc-700 mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-400 mb-2">보고서를 선택하세요</h3>
                    <p className="text-sm text-zinc-500">좌측 목록에서 보고서를 선택하거나 새로 생성하세요</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {REPORT_TEMPLATES.map(template => {
                const Icon = template.icon
                return (
                  <Card key={template.id} className="bg-zinc-800/30 border-zinc-700 p-5 hover:border-cyan-500/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-cyan-500/10">
                        <Icon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold">{template.name}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => handlePreviewReport(template.id)}
                            title="샘플 보고서 미리보기"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.sections.map(section => (
                            <Badge key={section} className="bg-zinc-900 text-zinc-400 text-[9px]">
                              {section}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-zinc-700 text-xs"
                            onClick={() => handlePreviewReport(template.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            미리보기
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-xs"
                            onClick={() => {
                              setNewReportConfig(prev => ({ ...prev, template: template.id }))
                              setShowNewReportForm(true)
                              setActiveTab("reports")
                            }}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            생성
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-zinc-800/30 border-zinc-700 p-5">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  보고서 유형별 현황
                </h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(typeConfig).map(([key, val]) => ({
                      type: val.label,
                      count: reports.filter(r => r.type === key).length
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="type" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="bg-zinc-800/30 border-zinc-700 p-5">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  월별 보고서 생성 추이
                </h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { month: "1월", count: 8 },
                      { month: "2월", count: 12 },
                      { month: "3월", count: 10 },
                      { month: "4월", count: 15 },
                      { month: "5월", count: 18 },
                      { month: "6월", count: 14 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">보고서 구독 관리</h3>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                  <Mail className="w-4 h-4 mr-1" />
                  새 구독 추가
                </Button>
              </div>
              <Card className="bg-zinc-800/30 border-zinc-700">
                <div className="divide-y divide-zinc-800">
                  {[
                    { client: "국민연금", type: "자산운용보고서", frequency: "분기", nextDate: "2025-04-01" },
                    { client: "삼성생명", type: "리스크 분석 보고서", frequency: "월간", nextDate: "2025-03-01" },
                    { client: "교직원공제회", type: "ESG 통합 평가 보고서", frequency: "연간", nextDate: "2026-01-01" }
                  ].map((sub, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-zinc-900">
                          <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="font-medium">{sub.client}</div>
                          <div className="text-xs text-zinc-500">{sub.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-zinc-900 text-zinc-400">{sub.frequency}</Badge>
                        <span className="text-xs text-zinc-500">다음 발송: {sub.nextDate}</span>
                        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Sample Report Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewReportType && (() => {
                  const template = REPORT_TEMPLATES.find(t => t.id === previewReportType)
                  const Icon = template?.icon || FileText
                  return (
                    <>
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg">
                          {getSampleReportContent(previewReportType).title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 mt-1">
                          {template?.description}
                        </DialogDescription>
                      </div>
                    </>
                  )
                })()}
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                샘플 미리보기
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {previewReportType && (() => {
              const content = getSampleReportContent(previewReportType)
              return (
                <div className="space-y-6 py-4">
                  {/* Report Header */}
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">생성일</span>
                        <p className="font-medium mt-1">{content.generatedAt}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">기간</span>
                        <p className="font-medium mt-1">{content.period}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">고객사</span>
                        <p className="font-medium mt-1">{content.client}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">펀드</span>
                        <p className="font-medium mt-1">{content.fund}</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  {content.summary && Object.keys(content.summary).length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(content.summary).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          totalAssets: "보유 자산",
                          totalValue: "총 평가액",
                          returnRate: "수익률",
                          riskScore: "리스크 점수",
                          riskLevel: "리스크 수준",
                          watchItems: "주의 항목",
                          criticalItems: "위험 항목",
                          monitoringAssets: "모니터링 자산",
                          totalAUM: "운용자산",
                          yieldReturn: "수익률",
                          sharpeRatio: "샤프비율",
                          diversificationScore: "분산점수",
                          marketOutlook: "시장 전망",
                          opportunities: "투자 기회",
                          threats: "위협 요소",
                          recommendations: "권고 사항",
                          esgScore: "ESG 점수",
                          environmentScore: "환경(E)",
                          socialScore: "사회(S)",
                          governanceScore: "지배구조(G)"
                        }
                        return (
                          <div key={key} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                            <div className="text-[10px] text-zinc-500 uppercase">{labels[key] || key}</div>
                            <div className="text-xl font-bold text-cyan-400 mt-1">{String(value)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Sections */}
                  <div className="space-y-4">
                    {content.sections.map((section, idx) => (
                      <div key={idx} className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-cyan-400" />
                          {section.title}
                        </h4>
                        {section.content && (
                          <p className="text-sm text-zinc-400 leading-relaxed">{section.content}</p>
                        )}
                        {section.items && (
                          <ul className="space-y-2 mt-2">
                            {section.items.map((item: string, i: number) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sample Charts Placeholder */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
                      <h4 className="font-semibold text-sm mb-3">자산 배분 현황</h4>
                      <div className="h-[150px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={portfolioData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              dataKey="value"
                            >
                              {portfolioData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
                      <h4 className="font-semibold text-sm mb-3">수익률 추이</h4>
                      <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 10 }} />
                            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }} />
                            <Line type="monotone" dataKey="return" stroke="#06b6d4" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="text-center py-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-600">
                      이 보고서는 샘플 미리보기입니다. 실제 보고서는 실시간 데이터를 기반으로 생성됩니다.
                    </p>
                  </div>
                </div>
              )
            })()}
          </ScrollArea>

          {/* Dialog Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setPreviewDialogOpen(false)}>
              닫기
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="border-zinc-700">
                <Download className="w-4 h-4 mr-2" />
                PDF 다운로드
              </Button>
              <Button 
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => {
                  if (previewReportType) {
                    setNewReportConfig(prev => ({ ...prev, template: previewReportType }))
                    setPreviewDialogOpen(false)
                    setShowNewReportForm(true)
                    setActiveTab("reports")
                  }
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                이 템플릿으로 보고서 생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
