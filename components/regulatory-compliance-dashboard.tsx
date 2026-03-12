"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Shield, FileCheck, AlertTriangle, CheckCircle2, Clock, 
  Download, Send, Search, Filter, Calendar, Building2, 
  FileText, BarChart3, Eye, RefreshCw, Bell, Landmark,
  Scale, ClipboardList, TrendingUp, Users, FileWarning,
  ChevronRight, ExternalLink, Loader2
} from "lucide-react"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface RegulatoryRequirement {
  id: string
  name: string
  regulator: string
  category: string
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  dueDate: string
  status: "compliant" | "pending" | "warning" | "overdue"
  completionRate: number
  lastSubmission?: string
  nextDue: string
  description: string
}

interface RegulatoryReport {
  id: string
  name: string
  regulator: string
  reportType: string
  period: string
  status: "draft" | "review" | "submitted" | "approved" | "rejected"
  createdAt: string
  submittedAt?: string
  deadline: string
  reviewer?: string
}

interface ComplianceAlert {
  id: string
  type: "deadline" | "violation" | "update" | "reminder"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  createdAt: string
  isRead: boolean
  requirementId?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────────────────────
const MOCK_REQUIREMENTS: RegulatoryRequirement[] = [
  {
    id: "req-001",
    name: "대체투자 자산 현황 보고",
    regulator: "금융감독원",
    category: "정기보고",
    frequency: "quarterly",
    dueDate: "2024-03-31",
    status: "compliant",
    completionRate: 100,
    lastSubmission: "2024-01-15",
    nextDue: "2024-04-15",
    description: "분기별 대체투자 자산 현황 및 가치변동 보고"
  },
  {
    id: "req-002",
    name: "리스크 지표 모니터링 보고",
    regulator: "금융감독원",
    category: "리스크관리",
    frequency: "monthly",
    dueDate: "2024-02-28",
    status: "pending",
    completionRate: 75,
    lastSubmission: "2024-01-31",
    nextDue: "2024-02-28",
    description: "LTV, DSCR 등 주요 리스크 지표 월간 모니터링"
  },
  {
    id: "req-003",
    name: "부동산 PF 익스포저 보고",
    regulator: "한국은행",
    category: "정기보고",
    frequency: "quarterly",
    dueDate: "2024-03-31",
    status: "warning",
    completionRate: 45,
    nextDue: "2024-03-31",
    description: "부동산 프로젝트파이낸싱 관련 익스포저 현황"
  },
  {
    id: "req-004",
    name: "약정 준수 현황 보고",
    regulator: "금융감독원",
    category: "약정관리",
    frequency: "monthly",
    dueDate: "2024-02-15",
    status: "overdue",
    completionRate: 30,
    lastSubmission: "2023-12-15",
    nextDue: "2024-02-15",
    description: "투자약정 조건 준수 여부 월간 보고"
  },
  {
    id: "req-005",
    name: "ESG 투자 현황 공시",
    regulator: "금융위원회",
    category: "ESG",
    frequency: "annual",
    dueDate: "2024-06-30",
    status: "compliant",
    completionRate: 100,
    lastSubmission: "2023-06-28",
    nextDue: "2024-06-30",
    description: "ESG 투자 원칙 및 이행 현황 연간 공시"
  },
  {
    id: "req-006",
    name: "자산운용 내역 보고",
    regulator: "금융감독원",
    category: "자산운용",
    frequency: "weekly",
    dueDate: "2024-02-23",
    status: "compliant",
    completionRate: 100,
    lastSubmission: "2024-02-16",
    nextDue: "2024-02-23",
    description: "주간 자산운용 및 매매 내역 보고"
  }
]

const MOCK_REPORTS: RegulatoryReport[] = [
  {
    id: "rpt-001",
    name: "2024년 1분기 대체투자 현황",
    regulator: "금융감독원",
    reportType: "정기보고",
    period: "2024 Q1",
    status: "submitted",
    createdAt: "2024-01-10",
    submittedAt: "2024-01-15",
    deadline: "2024-01-20",
    reviewer: "김심사관"
  },
  {
    id: "rpt-002",
    name: "2024년 1월 리스크 지표 보고서",
    regulator: "금융감독원",
    reportType: "리스크관리",
    period: "2024-01",
    status: "approved",
    createdAt: "2024-01-28",
    submittedAt: "2024-01-30",
    deadline: "2024-01-31",
    reviewer: "박심사관"
  },
  {
    id: "rpt-003",
    name: "2024년 2월 약정 준수 현황",
    regulator: "금융감독원",
    reportType: "약정관리",
    period: "2024-02",
    status: "draft",
    createdAt: "2024-02-10",
    deadline: "2024-02-15"
  },
  {
    id: "rpt-004",
    name: "부동산 PF 익스포저 분석",
    regulator: "한국은행",
    reportType: "정기보고",
    period: "2024 Q1",
    status: "review",
    createdAt: "2024-02-05",
    deadline: "2024-03-31",
    reviewer: "이심사관"
  },
  {
    id: "rpt-005",
    name: "ESG 투자 이행 보고서",
    regulator: "금융위원회",
    reportType: "ESG",
    period: "2023",
    status: "approved",
    createdAt: "2023-06-01",
    submittedAt: "2023-06-28",
    deadline: "2023-06-30"
  }
]

const MOCK_ALERTS: ComplianceAlert[] = [
  {
    id: "alert-001",
    type: "deadline",
    severity: "critical",
    title: "약정 준수 현황 보고 기한 임박",
    description: "2024-02-15 마감 보고서가 아직 제출되지 않았습니다.",
    createdAt: "2024-02-13",
    isRead: false,
    requirementId: "req-004"
  },
  {
    id: "alert-002",
    type: "violation",
    severity: "high",
    title: "LTV 비율 기준 초과 감지",
    description: "강남 오피스 프로젝트의 LTV가 규정 상한 70%를 초과했습니다.",
    createdAt: "2024-02-12",
    isRead: false
  },
  {
    id: "alert-003",
    type: "update",
    severity: "medium",
    title: "규제 가이드라인 업데이트",
    description: "금융감독원 대체투자 리스크 관리 가이드라인이 개정되었습니다.",
    createdAt: "2024-02-10",
    isRead: true
  },
  {
    id: "alert-004",
    type: "reminder",
    severity: "low",
    title: "분기 보고 준비 알림",
    description: "2024년 1분기 대체투자 현황 보고 준비를 시작하세요.",
    createdAt: "2024-02-08",
    isRead: true
  }
]

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export function RegulatoryComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [requirements] = useState<RegulatoryRequirement[]>(MOCK_REQUIREMENTS)
  const [reports] = useState<RegulatoryReport[]>(MOCK_REPORTS)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>(MOCK_ALERTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRegulator, setFilterRegulator] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<string>("")

  // Summary stats
  const stats = useMemo(() => {
    const total = requirements.length
    const compliant = requirements.filter(r => r.status === "compliant").length
    const pending = requirements.filter(r => r.status === "pending").length
    const warning = requirements.filter(r => r.status === "warning").length
    const overdue = requirements.filter(r => r.status === "overdue").length
    const unreadAlerts = alerts.filter(a => !a.isRead).length
    
    return { total, compliant, pending, warning, overdue, unreadAlerts, complianceRate: Math.round((compliant / total) * 100) }
  }, [requirements, alerts])

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesSearch = req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           req.regulator.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRegulator = filterRegulator === "all" || req.regulator === filterRegulator
      const matchesStatus = filterStatus === "all" || req.status === filterStatus
      return matchesSearch && matchesRegulator && matchesStatus
    })
  }, [requirements, searchQuery, filterRegulator, filterStatus])

  // Mark alert as read
  const markAlertAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a))
  }

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedReportType) return
    setIsGenerating(true)
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsGenerating(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant": case "approved": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "pending": case "review": return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "warning": case "draft": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "overdue": case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "submitted": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "compliant": return "준수"
      case "pending": return "진행중"
      case "warning": return "주의"
      case "overdue": return "지연"
      case "draft": return "작성중"
      case "review": return "검토중"
      case "submitted": return "제출완료"
      case "approved": return "승인"
      case "rejected": return "반려"
      default: return status
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            규제 준수 모니터링
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            규제사항 준수 여부 모니터링 및 규제기관 보고서 생성
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <FileCheck className="w-4 h-4 mr-2" />
            보고서 생성
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">전체 준수율</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.complianceRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <Progress value={stats.complianceRate} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">준수 완료</p>
                <p className="text-2xl font-bold">{stats.compliant}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">전체 {stats.total}건 중</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">진행 중</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">마감 예정</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">주의 필요</p>
                <p className="text-2xl font-bold text-orange-400">{stats.warning + stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">즉시 조치 필요</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">미확인 알림</p>
                <p className="text-2xl font-bold text-blue-400">{stats.unreadAlerts}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">새 알림</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            규제 항목
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            보고서 관리
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
            <Bell className="w-4 h-4" />
            알림
            {stats.unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                {stats.unreadAlerts}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  다가오는 마감일
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {requirements
                      .filter(r => r.status !== "compliant")
                      .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
                      .slice(0, 5)
                      .map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{req.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{req.regulator}</Badge>
                              <span className="text-xs text-zinc-500">{req.nextDue}</span>
                            </div>
                          </div>
                          <Badge className={`ml-2 ${getStatusColor(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Regulator Distribution */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-400" />
                  규제기관별 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["금융감독원", "한국은행", "금융위원회"].map(regulator => {
                    const reqs = requirements.filter(r => r.regulator === regulator)
                    const compliant = reqs.filter(r => r.status === "compliant").length
                    const rate = reqs.length > 0 ? Math.round((compliant / reqs.length) * 100) : 0
                    
                    return (
                      <div key={regulator} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{regulator}</span>
                          <span className="text-sm text-zinc-400">{compliant}/{reqs.length} 준수</span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-3">빠른 작업</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="border-zinc-700 text-xs">
                      <FileCheck className="w-3 h-3 mr-1" />
                      일괄 점검
                    </Button>
                    <Button variant="outline" size="sm" className="border-zinc-700 text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      현황 다운로드
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.slice(0, 4).map(report => (
                  <div key={report.id} className="flex items-center gap-4 p-3 bg-zinc-800/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      report.status === "approved" ? "bg-emerald-500/20" :
                      report.status === "submitted" ? "bg-blue-500/20" :
                      "bg-zinc-700/50"
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        report.status === "approved" ? "text-emerald-400" :
                        report.status === "submitted" ? "text-blue-400" :
                        "text-zinc-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.name}</p>
                      <p className="text-xs text-zinc-500">{report.createdAt} | {report.regulator}</p>
                    </div>
                    <Badge className={getStatusColor(report.status)}>
                      {getStatusLabel(report.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="규제 항목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700"
              />
            </div>
            <Select value={filterRegulator} onValueChange={setFilterRegulator}>
              <SelectTrigger className="w-full lg:w-40 bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="규제기관" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 기관</SelectItem>
                <SelectItem value="금융감독원">금융감독원</SelectItem>
                <SelectItem value="한국은행">한국은행</SelectItem>
                <SelectItem value="금융위원회">금융위원회</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-32 bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="compliant">준수</SelectItem>
                <SelectItem value="pending">진행중</SelectItem>
                <SelectItem value="warning">주의</SelectItem>
                <SelectItem value="overdue">지연</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requirements List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredRequirements.map(req => (
                <Card key={req.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{req.name}</h3>
                          <Badge className={getStatusColor(req.status)}>
                            {getStatusLabel(req.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mb-3">{req.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Landmark className="w-3 h-3" />
                            {req.regulator}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            다음 마감: {req.nextDue}
                          </span>
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {req.frequency === "daily" ? "일간" : 
                             req.frequency === "weekly" ? "주간" : 
                             req.frequency === "monthly" ? "월간" : 
                             req.frequency === "quarterly" ? "분기" : "연간"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{req.completionRate}%</div>
                        <Progress value={req.completionRate} className="w-24 h-1.5 mt-2" />
                        <Button variant="ghost" size="sm" className="mt-2 text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Report Generator */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-400" />
                규제기관 보고서 생성
              </CardTitle>
              <CardDescription>
                Neo4j 온톨로지 데이터를 기반으로 규제기관 제출용 보고서를 자동 생성합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">보고서 유형</Label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="보고서 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset-status">대체투자 자산 현황</SelectItem>
                      <SelectItem value="risk-indicator">리스크 지표 보고</SelectItem>
                      <SelectItem value="pf-exposure">부동산 PF 익스포저</SelectItem>
                      <SelectItem value="covenant">약정 준수 현황</SelectItem>
                      <SelectItem value="esg">ESG 투자 현황</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">보고 기간</Label>
                  <Select>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-02">2024년 2월</SelectItem>
                      <SelectItem value="2024-q1">2024년 1분기</SelectItem>
                      <SelectItem value="2023">2023년 연간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">&nbsp;</Label>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleGenerateReport}
                    disabled={isGenerating || !selectedReportType}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4 mr-2" />
                        보고서 생성
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">보고서 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        report.status === "approved" ? "bg-emerald-500/20" :
                        report.status === "submitted" ? "bg-blue-500/20" :
                        report.status === "review" ? "bg-amber-500/20" :
                        "bg-zinc-700/50"
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          report.status === "approved" ? "text-emerald-400" :
                          report.status === "submitted" ? "text-blue-400" :
                          report.status === "review" ? "text-amber-400" :
                          "text-zinc-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{report.name}</h4>
                          <Badge className={getStatusColor(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                          <span>{report.regulator}</span>
                          <span>{report.period}</span>
                          <span>마감: {report.deadline}</span>
                          {report.reviewer && <span>검토자: {report.reviewer}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="w-4 h-4" />
                        </Button>
                        {report.status === "draft" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Send className="w-3 h-3 mr-1" />
                            제출
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  규제 준수 알림
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))}>
                  모두 읽음 처리
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        alert.isRead 
                          ? "bg-zinc-800/30 border-zinc-800" 
                          : "bg-zinc-800/50 border-zinc-700"
                      }`}
                      onClick={() => markAlertAsRead(alert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          alert.type === "deadline" ? "bg-amber-500/20" :
                          alert.type === "violation" ? "bg-red-500/20" :
                          alert.type === "update" ? "bg-blue-500/20" :
                          "bg-zinc-700/50"
                        }`}>
                          {alert.type === "deadline" && <Clock className="w-5 h-5 text-amber-400" />}
                          {alert.type === "violation" && <AlertTriangle className="w-5 h-5 text-red-400" />}
                          {alert.type === "update" && <FileWarning className="w-5 h-5 text-blue-400" />}
                          {alert.type === "reminder" && <Bell className="w-5 h-5 text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${alert.isRead ? "text-zinc-400" : ""}`}>{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity === "critical" ? "긴급" : 
                               alert.severity === "high" ? "높음" : 
                               alert.severity === "medium" ? "중간" : "낮음"}
                            </Badge>
                            {!alert.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-zinc-400">{alert.description}</p>
                          <p className="text-xs text-zinc-500 mt-2">{alert.createdAt}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
