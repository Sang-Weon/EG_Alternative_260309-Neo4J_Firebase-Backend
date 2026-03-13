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
  FileText, Mail, Clock, CheckCircle2, AlertTriangle, 
  Send, Eye, Upload, RefreshCw, Plus, Search, Filter,
  Building2, Calendar, FileCheck, Loader2, Sparkles,
  ChevronRight, Download, Bot, FileWarning, Link2,
  ClipboardList, Database, Network
} from "lucide-react"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface CovenantRequest {
  id: string
  clientId: string
  clientName: string
  clientType: "보험사" | "증권사" | "연기금" | "기타"
  fundId: string
  fundName: string
  documentType: "투자확인서" | "투자계약서" | "IM" | "사이드레터" | "재무제표" | "감정평가서" | "기타"
  description: string
  dueDate: string
  daysUntilDue: number
  status: "PENDING" | "REQUESTED" | "REMINDED" | "RECEIVED" | "OVERDUE" | "PROCESSING" | "COMPLETED"
  emailCount: number
  assignee: string
  ocrStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  parsingStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  graphSyncStatus?: "PENDING" | "SYNCED" | "FAILED"
}

interface ParsedDataField {
  field: string
  value: string
  confidence: number
  category: "투자자" | "펀드" | "자산" | "약정" | "담보" | "특약"
}

// ────────────────────────────────────────────────────────────────────────────
// Sample Data
// ────────────────────────────────────────────────────────────────────────────

const SAMPLE_REQUESTS: CovenantRequest[] = [
  {
    id: "req-001",
    clientId: "client-001",
    clientName: "삼성생명",
    clientType: "보험사",
    fundId: "fund-001",
    fundName: "EG 대체투자 1호",
    documentType: "투자확인서",
    description: "2025년 4분기 기준 투자확인서",
    dueDate: "2025-03-18",
    daysUntilDue: 5,
    status: "REQUESTED",
    emailCount: 1,
    assignee: "박민수"
  },
  {
    id: "req-002",
    clientId: "client-002",
    clientName: "한화생명",
    clientType: "보험사",
    fundId: "fund-002",
    fundName: "EG 인프라 펀드",
    documentType: "IM",
    description: "IM 수정본 (2차 클로징)",
    dueDate: "2025-03-25",
    daysUntilDue: 12,
    status: "PENDING",
    emailCount: 0,
    assignee: "김지영"
  },
  {
    id: "req-003",
    clientId: "client-003",
    clientName: "DB손해보험",
    clientType: "보험사",
    fundId: "fund-003",
    fundName: "EG PE 펀드",
    documentType: "사이드레터",
    description: "특약 조건 변경 사이드레터",
    dueDate: "2025-03-16",
    daysUntilDue: 3,
    status: "REMINDED",
    emailCount: 2,
    assignee: "이승호"
  },
  {
    id: "req-004",
    clientId: "client-004",
    clientName: "미래에셋증권",
    clientType: "증권사",
    fundId: "fund-001",
    fundName: "EG 대체투자 1호",
    documentType: "투자계약서",
    description: "LP 약정서 원본",
    dueDate: "2025-03-10",
    daysUntilDue: -3,
    status: "RECEIVED",
    emailCount: 1,
    assignee: "박민수",
    ocrStatus: "COMPLETED",
    parsingStatus: "COMPLETED",
    graphSyncStatus: "SYNCED"
  },
  {
    id: "req-005",
    clientId: "client-005",
    clientName: "NH투자증권",
    clientType: "증권사",
    fundId: "fund-002",
    fundName: "EG 인프라 펀드",
    documentType: "재무제표",
    description: "2024년 연간 감사보고서",
    dueDate: "2025-03-12",
    daysUntilDue: -1,
    status: "OVERDUE",
    emailCount: 3,
    assignee: "김지영"
  },
  {
    id: "req-006",
    clientId: "client-001",
    clientName: "삼성생명",
    clientType: "보험사",
    fundId: "fund-004",
    fundName: "EG 부동산 2호",
    documentType: "감정평가서",
    description: "강남 오피스 감정평가서",
    dueDate: "2025-03-08",
    daysUntilDue: -5,
    status: "PROCESSING",
    emailCount: 1,
    assignee: "이승호",
    ocrStatus: "COMPLETED",
    parsingStatus: "PROCESSING"
  }
]

const SAMPLE_PARSED_DATA: ParsedDataField[] = [
  { field: "LP명", value: "삼성생명보험", confidence: 0.98, category: "투자자" },
  { field: "약정금액", value: "500억원", confidence: 0.95, category: "투자자" },
  { field: "지분율", value: "25%", confidence: 0.92, category: "투자자" },
  { field: "펀드명", value: "EG 대체투자 1호", confidence: 0.99, category: "펀드" },
  { field: "펀드규모", value: "2,000억원", confidence: 0.96, category: "펀드" },
  { field: "운용사(GP)", value: "EG자산운용", confidence: 0.99, category: "펀드" },
  { field: "자산명", value: "강남 오피스 PF", confidence: 0.94, category: "자산" },
  { field: "자산유형", value: "부동산 PF", confidence: 0.97, category: "자산" },
  { field: "현재가치", value: "1,200억원", confidence: 0.88, category: "자산" },
  { field: "LTV 한도", value: "65%", confidence: 0.91, category: "약정" },
  { field: "LTV 현재", value: "55%", confidence: 0.85, category: "약정" },
  { field: "DSCR 하한", value: "1.2x", confidence: 0.89, category: "약정" },
  { field: "DSCR 현재", value: "", confidence: 0.0, category: "약정" },
  { field: "보증인", value: "한양건설", confidence: 0.78, category: "담보" },
  { field: "보증유형", value: "책임준공", confidence: 0.82, category: "담보" },
  { field: "우선매수권", value: "있음", confidence: 0.90, category: "특약" },
]

// ────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────��──────────────────

export function CovenantWorkflowDashboard() {
  const [requests, setRequests] = useState<CovenantRequest[]>(SAMPLE_REQUESTS)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedRequest, setSelectedRequest] = useState<CovenantRequest | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [parsingDialogOpen, setParsingDialogOpen] = useState(false)
  const [newRequestDialogOpen, setNewRequestDialogOpen] = useState(false)
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [originalDocDialogOpen, setOriginalDocDialogOpen] = useState(false)
  const [graphSyncDialogOpen, setGraphSyncDialogOpen] = useState(false)
  const [graphSyncStep, setGraphSyncStep] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncCompleteDialogOpen, setSyncCompleteDialogOpen] = useState(false)
  const { toast } = useToast()

  // KPI 계산
  const kpis = {
    pending: requests.filter(r => r.status === "PENDING" || r.status === "REQUESTED").length,
    dueSoon: requests.filter(r => r.daysUntilDue > 0 && r.daysUntilDue <= 7 && r.status !== "RECEIVED" && r.status !== "COMPLETED").length,
    received: requests.filter(r => r.status === "RECEIVED" || r.status === "PROCESSING" || r.status === "COMPLETED").length,
    overdue: requests.filter(r => r.status === "OVERDUE").length,
  }

  // 필터링된 요청
  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.clientName.includes(searchTerm) || r.fundName.includes(searchTerm) || r.documentType.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 이메일 생성
  const handleGenerateEmail = async (request: CovenantRequest) => {
    setSelectedRequest(request)
    setEmailDialogOpen(true)
    setIsGeneratingEmail(true)
    
    // Simulate AI email generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const emailTemplate = `${request.clientName} 담당자님께,

안녕하세요. EG자산평가 ${request.assignee}입니다.

${request.fundName}의 2025년 1분기 기준 대체자산 공정가치 평가를 위해 아래 서류의 제출을 요청드립니다.

■ 요청 서류: ${request.documentType}
■ 대상 펀드: ${request.fundName}
■ 설명: ${request.description}
■ 제출 기한: ${request.dueDate}

첨부 양식에 맞추어 작성 후 회신 부탁드립니다.
문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.

EG자산평가 ${request.assignee} 드림`

    setGeneratedEmail(emailTemplate)
    setIsGeneratingEmail(false)
  }

  // 이메일 발송
  const handleSendEmail = () => {
    if (selectedRequest) {
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: r.emailCount === 0 ? "REQUESTED" : "REMINDED", emailCount: r.emailCount + 1 }
          : r
      ))
      toast({
        title: "이메일 발송 완료",
        description: `${selectedRequest.clientName}에게 약정서 요청 이메일이 발송되었습니다.`
      })
      setEmailDialogOpen(false)
    }
  }

  // 파싱 결과 보기
  const handleViewParsing = (request: CovenantRequest) => {
    setSelectedRequest(request)
    setParsingDialogOpen(true)
  }

  // 원본 문서 보기
  const handleViewOriginal = () => {
    setOriginalDocDialogOpen(true)
  }

  // Graph DB 반영 워크플로우 시작
  const handleStartGraphSync = async () => {
    setParsingDialogOpen(false)
    setGraphSyncDialogOpen(true)
    setGraphSyncStep(0)
    setIsSyncing(true)

    // Step 1: 데이터 검증
    await new Promise(resolve => setTimeout(resolve, 1200))
    setGraphSyncStep(1)

    // Step 2: 노드 생성/업데이트
    await new Promise(resolve => setTimeout(resolve, 1500))
    setGraphSyncStep(2)

    // Step 3: 관계 설정
    await new Promise(resolve => setTimeout(resolve, 1300))
    setGraphSyncStep(3)

    // Step 4: 속성 매핑
    await new Promise(resolve => setTimeout(resolve, 1000))
    setGraphSyncStep(4)

    // Step 5: 완료
    await new Promise(resolve => setTimeout(resolve, 800))
    setGraphSyncStep(5)
    setIsSyncing(false)

    // 상태 업데이트
    if (selectedRequest) {
      setRequests(prev => prev.map(r =>
        r.id === selectedRequest.id
          ? { ...r, graphSyncStatus: "SYNCED", status: "COMPLETED" }
          : r
      ))
    }

    // 완료 다이얼로그로 전환
    setTimeout(() => {
      setGraphSyncDialogOpen(false)
      setSyncCompleteDialogOpen(true)
    }, 1000)
  }

  // 상태에 따른 배지 색상
  const getStatusBadge = (status: CovenantRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-zinc-600 text-zinc-200">대기</Badge>
      case "REQUESTED":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">요청됨</Badge>
      case "REMINDED":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">리마인더</Badge>
      case "RECEIVED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">수신</Badge>
      case "OVERDUE":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">기한초과</Badge>
      case "PROCESSING":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">처리중</Badge>
      case "COMPLETED":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">완료</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // D-day 표시
  const getDdayDisplay = (days: number, status: string) => {
    if (status === "RECEIVED" || status === "PROCESSING" || status === "COMPLETED") {
      return <span className="text-emerald-400 text-sm font-medium">완료</span>
    }
    if (days < 0) {
      return <span className="text-red-400 text-sm font-bold">D+{Math.abs(days)}</span>
    }
    if (days <= 3) {
      return <span className="text-red-400 text-sm font-bold">D-{days}</span>
    }
    if (days <= 7) {
      return <span className="text-amber-400 text-sm font-medium">D-{days}</span>
    }
    return <span className="text-zinc-400 text-sm">D-{days}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">약정서 워크플로우</h2>
          <p className="text-sm text-zinc-400 mt-1">
            약정서 요청, 입수, OCR/파싱, Graph DB 반영 자동화
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setNewRequestDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            약정서 요청 등록
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ClipboardList className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{kpis.pending}</div>
              <div className="text-xs text-zinc-500">대기/요청 중</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{kpis.dueSoon}</div>
              <div className="text-xs text-zinc-500">기한 임박 (7일 내)</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{kpis.received}</div>
              <div className="text-xs text-zinc-500">수신 완료</div>
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{kpis.overdue}</div>
              <div className="text-xs text-zinc-500">기한 초과</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-zinc-800 px-4">
            <TabsList className="bg-transparent">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-zinc-800">
                요청 현황
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-zinc-800">
                처리 파이프라인
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-zinc-800">
                수신 문서
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="p-4">
            {/* Search & Filter */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="고객사, 펀드, 문서 유형 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="PENDING">대기</SelectItem>
                  <SelectItem value="REQUESTED">요청됨</SelectItem>
                  <SelectItem value="REMINDED">리마인더</SelectItem>
                  <SelectItem value="RECEIVED">수신</SelectItem>
                  <SelectItem value="OVERDUE">기한초과</SelectItem>
                  <SelectItem value="PROCESSING">처리중</SelectItem>
                  <SelectItem value="COMPLETED">완료</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-zinc-700">
                <Mail className="w-4 h-4 mr-2" />
                일괄 발송
              </Button>
            </div>

            {/* Request Table */}
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">고객사</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">펀드</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">문서 유형</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-400">기한</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-400">상태</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-400">처리현황</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-400">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, idx) => (
                    <tr key={request.id} className={`border-t border-zinc-800 ${idx % 2 === 0 ? "bg-zinc-900/30" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-zinc-500" />
                          <div>
                            <div className="font-medium text-sm">{request.clientName}</div>
                            <div className="text-xs text-zinc-500">{request.clientType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{request.fundName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {request.documentType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getDdayDisplay(request.daysUntilDue, request.status)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="py-3 px-4">
                        {(request.status === "RECEIVED" || request.status === "PROCESSING" || request.status === "COMPLETED") && (
                          <div className="flex items-center justify-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${request.ocrStatus === "COMPLETED" ? "bg-emerald-500" : request.ocrStatus === "PROCESSING" ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`} title="OCR" />
                            <div className={`w-2 h-2 rounded-full ${request.parsingStatus === "COMPLETED" ? "bg-emerald-500" : request.parsingStatus === "PROCESSING" ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`} title="파싱" />
                            <div className={`w-2 h-2 rounded-full ${request.graphSyncStatus === "SYNCED" ? "bg-emerald-500" : "bg-zinc-600"}`} title="Graph" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {(request.status === "PENDING" || request.status === "REQUESTED" || request.status === "REMINDED" || request.status === "OVERDUE") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
                              onClick={() => handleGenerateEmail(request)}
                              title="이메일 발송"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          {(request.status === "RECEIVED" || request.status === "PROCESSING" || request.status === "COMPLETED") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-400"
                              onClick={() => handleViewParsing(request)}
                              title="파싱 결과 보기"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="p-6">
            <div className="space-y-6">
              <h3 className="font-semibold">워크플로우 파이프라인</h3>
              
              {/* Pipeline Stages */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { stage: 1, title: "요청 등록", icon: ClipboardList, count: requests.filter(r => r.status === "PENDING").length, color: "zinc" },
                  { stage: 2, title: "이메일 발송", icon: Mail, count: requests.filter(r => r.status === "REQUESTED" || r.status === "REMINDED").length, color: "blue" },
                  { stage: 3, title: "수신 대기", icon: Clock, count: requests.filter(r => r.status === "REQUESTED" || r.status === "REMINDED").length, color: "amber" },
                  { stage: 4, title: "OCR/파싱", icon: Bot, count: requests.filter(r => r.status === "PROCESSING" || r.ocrStatus === "PROCESSING" || r.parsingStatus === "PROCESSING").length, color: "purple" },
                  { stage: 5, title: "데이터화", icon: Database, count: requests.filter(r => r.parsingStatus === "COMPLETED" && r.graphSyncStatus !== "SYNCED").length, color: "cyan" },
                  { stage: 6, title: "Graph 반영", icon: Network, count: requests.filter(r => r.graphSyncStatus === "SYNCED").length, color: "emerald" },
                ].map((stage, idx) => (
                  <div key={stage.stage} className="relative">
                    <Card className={`p-4 border-zinc-700 bg-${stage.color}-500/5 border-${stage.color}-500/20`}>
                      <div className="flex flex-col items-center text-center">
                        <div className={`p-2 rounded-lg bg-${stage.color}-500/10 mb-2`}>
                          <stage.icon className={`w-5 h-5 text-${stage.color}-400`} />
                        </div>
                        <div className="text-xs text-zinc-400 mb-1">Stage {stage.stage}</div>
                        <div className="font-medium text-sm">{stage.title}</div>
                        <div className={`text-2xl font-bold mt-2 text-${stage.color}-400`}>{stage.count}</div>
                      </div>
                    </Card>
                    {idx < 5 && (
                      <ChevronRight className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 z-10" />
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="mt-8">
                <h4 className="font-medium mb-4">최근 처리 내역</h4>
                <div className="space-y-3">
                  {[
                    { time: "10분 전", action: "Graph DB 반영 완료", target: "삼성생명 - 투자계약서", icon: Network, color: "emerald" },
                    { time: "25분 전", action: "AI 파싱 완료", target: "삼성생명 - 감정평가서", icon: Bot, color: "purple" },
                    { time: "1시간 전", action: "문서 수신", target: "미래에셋증권 - 투자계약서", icon: FileCheck, color: "blue" },
                    { time: "2시간 전", action: "리마인더 발송", target: "DB손해보험 - 사이드레터", icon: Mail, color: "amber" },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30">
                      <div className={`p-2 rounded-lg bg-${activity.color}-500/10`}>
                        <activity.icon className={`w-4 h-4 text-${activity.color}-400`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.action}</div>
                        <div className="text-xs text-zinc-500">{activity.target}</div>
                      </div>
                      <div className="text-xs text-zinc-500">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {requests.filter(r => r.status === "RECEIVED" || r.status === "PROCESSING" || r.status === "COMPLETED").map(doc => (
                <Card key={doc.id} className="bg-zinc-800/30 border-zinc-700 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.clientName} - {doc.documentType}</div>
                      <div className="text-xs text-zinc-500 mt-1">{doc.fundName}</div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className={`text-[10px] ${doc.ocrStatus === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          OCR {doc.ocrStatus === "COMPLETED" ? "완료" : "진행중"}
                        </Badge>
                        <Badge className={`text-[10px] ${doc.parsingStatus === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : doc.parsingStatus === "PROCESSING" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-600"}`}>
                          파싱 {doc.parsingStatus === "COMPLETED" ? "완료" : doc.parsingStatus === "PROCESSING" ? "진행중" : "대기"}
                        </Badge>
                        {doc.graphSyncStatus === "SYNCED" && (
                          <Badge className="text-[10px] bg-blue-500/20 text-blue-400">
                            Graph 반영
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs border-zinc-700 flex-1" onClick={() => handleViewParsing(doc)}>
                          <Eye className="w-3 h-3 mr-1" />
                          파싱 결과
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              약정서 요청 이메일
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.clientName} - {selectedRequest?.documentType}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-zinc-500">수신</Label>
                <Input value={`analyst@${selectedRequest?.clientName.toLowerCase().replace(/\s/g, "")}.com`} className="bg-zinc-800 border-zinc-700 mt-1" readOnly />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">CC</Label>
                <Input value="manager@egvaluation.com" className="bg-zinc-800 border-zinc-700 mt-1" readOnly />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-zinc-500">제목</Label>
              <Input 
                value={`[EG자산평가] ${selectedRequest?.fundName} 관련 ${selectedRequest?.documentType} 제출 요청`}
                className="bg-zinc-800 border-zinc-700 mt-1"
                readOnly
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-zinc-500">본문 (AI 자동 생성)</Label>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectedRequest && handleGenerateEmail(selectedRequest)}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 재생성
                </Button>
              </div>
              {isGeneratingEmail ? (
                <div className="flex items-center justify-center py-12 bg-zinc-800 rounded-lg border border-zinc-700">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400 mr-2" />
                  <span className="text-sm text-zinc-400">AI가 이메일을 작성 중...</span>
                </div>
              ) : (
                <Textarea 
                  value={generatedEmail}
                  onChange={(e) => setGeneratedEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 min-h-[200px] text-sm"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setEmailDialogOpen(false)}>
              취소
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendEmail} disabled={isGeneratingEmail}>
              <Send className="w-4 h-4 mr-2" />
              발송
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parsing Result Dialog */}
      <Dialog open={parsingDialogOpen} onOpenChange={setParsingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <DialogTitle>AI 파싱 결과</DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    {selectedRequest?.clientName} - {selectedRequest?.documentType}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  전체 신뢰도: 92%
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  확인 필요: 3개
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-4 py-4">
              {["투자자", "펀드", "자산", "약정", "담보", "특약"].map(category => {
                const fields = SAMPLE_PARSED_DATA.filter(f => f.category === category)
                if (fields.length === 0) return null
                
                const avgConfidence = Math.round(fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length * 100)
                const hasLowConfidence = fields.some(f => f.confidence < 0.85)
                
                return (
                  <Card key={category} className={`p-4 border-zinc-700 ${hasLowConfidence ? "border-amber-500/30" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {category} 정보
                        {hasLowConfidence && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      </h4>
                      <Badge className={`text-xs ${avgConfidence >= 90 ? "bg-emerald-500/20 text-emerald-400" : avgConfidence >= 80 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                        신뢰도 {avgConfidence}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fields.map((field, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${field.confidence < 0.85 ? "bg-amber-500/5 border border-amber-500/20" : "bg-zinc-800/50"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-500">{field.field}</span>
                            <span className={`text-[10px] ${field.confidence >= 0.9 ? "text-emerald-400" : field.confidence >= 0.8 ? "text-amber-400" : "text-red-400"}`}>
                              {Math.round(field.confidence * 100)}%
                            </span>
                          </div>
                          {field.value ? (
                            <div className="font-medium text-sm">{field.value}</div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input placeholder="직접 입력" className="h-7 text-xs bg-zinc-800 border-zinc-700" />
                              <FileWarning className="w-4 h-4 text-amber-400 shrink-0" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={handleViewOriginal}>
              <Eye className="w-4 h-4 mr-2" />
              원본 보기
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="border-zinc-700">
                <Sparkles className="w-4 h-4 mr-2" />
                AI 재파싱
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleStartGraphSync}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                확인 완료 - Graph DB 반영
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Original Document Preview Dialog */}
      <Dialog open={originalDocDialogOpen} onOpenChange={setOriginalDocDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle>원본 약정서</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {selectedRequest?.clientName} - {selectedRequest?.documentType}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            <div className="p-6 bg-white text-zinc-900 rounded-lg m-4">
              {/* Sample Document Content */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold mb-2">투자 계약서</h1>
                <p className="text-sm text-zinc-600">Investment Agreement</p>
              </div>
              
              <div className="space-y-6 text-sm leading-relaxed">
                <section>
                  <h2 className="font-bold text-base mb-3 border-b pb-2">제1조 (목적)</h2>
                  <p className="text-zinc-700">
                    본 계약서는 (주)EG자산운용(이하 "운용사")이 설정하는 "EG 대체투자 1호 사모투자신탁"(이하 "본 펀드")에 대한 
                    삼성생명보험(이하 "투자자")의 출자 및 운용에 관한 사항을 정함을 목적으로 한다.
                  </p>
                </section>

                <section>
                  <h2 className="font-bold text-base mb-3 border-b pb-2">제2조 (펀드 개요)</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-100 rounded">
                      <span className="text-zinc-500 text-xs">펀드명</span>
                      <p className="font-medium">EG 대체투자 1호</p>
                    </div>
                    <div className="p-3 bg-zinc-100 rounded">
                      <span className="text-zinc-500 text-xs">펀드 규모</span>
                      <p className="font-medium">2,000억원</p>
                    </div>
                    <div className="p-3 bg-zinc-100 rounded">
                      <span className="text-zinc-500 text-xs">투자자 약정금액</span>
                      <p className="font-medium">500억원</p>
                    </div>
                    <div className="p-3 bg-zinc-100 rounded">
                      <span className="text-zinc-500 text-xs">지분율</span>
                      <p className="font-medium">25%</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="font-bold text-base mb-3 border-b pb-2">제3조 (주요 투자 자산)</h2>
                  <p className="text-zinc-700 mb-3">
                    본 펀드는 다음의 대체투자 자산에 투자한다:
                  </p>
                  <div className="p-3 bg-zinc-100 rounded">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-zinc-500">자산명:</span> 강남 오피스 PF</div>
                      <div><span className="text-zinc-500">자산유형:</span> 부동산 PF</div>
                      <div><span className="text-zinc-500">현재가치:</span> 1,200억원</div>
                      <div><span className="text-zinc-500">시공사:</span> 한양건설</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="font-bold text-base mb-3 border-b pb-2">제4조 (재무 약정)</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-zinc-100 rounded">
                      <span className="text-zinc-600">LTV 한도</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-zinc-100 rounded">
                      <span className="text-zinc-600">DSCR 하한</span>
                      <span className="font-medium">1.2x</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="font-bold text-base mb-3 border-b pb-2">제5조 (담보 및 보증)</h2>
                  <p className="text-zinc-700">
                    시공사 한양건설은 본 프로젝트에 대해 책임준공 보증을 제공하며, 
                    투자자는 우선매수권을 보유한다.
                  </p>
                </section>

                <div className="mt-8 pt-6 border-t">
                  <p className="text-center text-zinc-500 text-xs">
                    2024년 12월 15일
                  </p>
                  <div className="grid grid-cols-2 gap-8 mt-4">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">운용사</p>
                      <p className="font-medium mt-1">(주)EG자산운용</p>
                      <p className="text-xs text-zinc-400 mt-4">대표이사 (인)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">투자자</p>
                      <p className="font-medium mt-1">삼성생명보험</p>
                      <p className="text-xs text-zinc-400 mt-4">투자담당임원 (인)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700">
              <Download className="w-4 h-4 mr-2" />
              PDF 다운로드
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOriginalDocDialogOpen(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Graph DB Sync Workflow Dialog */}
      <Dialog open={graphSyncDialogOpen} onOpenChange={setGraphSyncDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle>Neo4j Graph DB 반영 중</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  파싱된 데이터를 그래프 데이터베이스에 동기화합니다
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* Workflow Steps */}
            <div className="space-y-4">
              {[
                { step: 0, title: "데이터 검증", desc: "파싱 데이터 무결성 검증", icon: FileCheck },
                { step: 1, title: "노드 생성/업데이트", desc: "Investor, Fund, Asset 노드 처리", icon: Database },
                { step: 2, title: "관계 설정", desc: "INVESTS_IN, OWNS, GUARANTEES 관계 생성", icon: Link2 },
                { step: 3, title: "속성 매핑", desc: "LTV, DSCR, 금액 등 속성 업데이트", icon: ClipboardList },
                { step: 4, title: "완료", desc: "동기화 완료 및 검증", icon: CheckCircle2 },
              ].map(({ step, title, desc, icon: Icon }) => {
                const isActive = graphSyncStep === step
                const isComplete = graphSyncStep > step
                const isPending = graphSyncStep < step
                
                return (
                  <div key={step} className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    isComplete ? "bg-emerald-500/10 border-emerald-500/30" :
                    isActive ? "bg-blue-500/10 border-blue-500/30" :
                    "bg-zinc-800/30 border-zinc-700"
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isComplete ? "bg-emerald-500/20" :
                      isActive ? "bg-blue-500/20" :
                      "bg-zinc-700"
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isPending ? "text-zinc-500" : "text-blue-400"}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${isPending ? "text-zinc-500" : ""}`}>{title}</div>
                      <div className="text-xs text-zinc-500">{desc}</div>
                    </div>
                    {isActive && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
                        처리 중
                      </Badge>
                    )}
                    {isComplete && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        완료
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">진행률</span>
                <span className="text-emerald-400">{Math.round((graphSyncStep / 5) * 100)}%</span>
              </div>
              <Progress value={(graphSyncStep / 5) * 100} className="h-2" />
            </div>

            {/* Cypher Query Preview */}
            {graphSyncStep >= 2 && (
              <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                  <Database className="w-3 h-3" />
                  실행 중인 Cypher 쿼리
                </div>
                <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">
{`MERGE (i:Investor {name: '삼성생명보험'})
MERGE (f:Fund {name: 'EG 대체투자 1호'})
MERGE (a:Asset {name: '강남 오피스 PF'})
MERGE (c:Company {name: '한양건설'})
MERGE (i)-[:INVESTS_IN {amount: 500, pct: 25}]->(f)
MERGE (f)-[:OWNS {pct: 60}]->(a)
MERGE (c)-[:GUARANTEES {type: '책임준공'}]->(a)
SET a.ltv_limit = 65, a.dscr_min = 1.2`}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Complete Dialog */}
      <Dialog open={syncCompleteDialogOpen} onOpenChange={setSyncCompleteDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl mb-2">Graph DB 반영 완료</DialogTitle>
            <DialogDescription className="text-sm">
              약정서 데이터가 Neo4j에 성공적으로 반영되었습니다
            </DialogDescription>
          </div>

          <div className="space-y-4 pb-4">
            <Card className="p-4 bg-zinc-800/30 border-zinc-700">
              <h4 className="font-medium text-sm mb-3">반영된 데이터 요약</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-zinc-400">Investor 노드:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">Fund 노드:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-zinc-400">Asset 노드:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-zinc-400">Company 노드:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-zinc-400">관계 생성:</span>
                  <span className="font-medium">3개 (INVESTS_IN, OWNS, GUARANTEES)</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-start gap-3">
                <Network className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">온톨로지 뷰에서 확인</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    반영된 데이터는 "대체투자 온톨로지 뷰"에서 시각적으로 확인할 수 있습니다.
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setSyncCompleteDialogOpen(false)}>
              닫기
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              setSyncCompleteDialogOpen(false)
              toast({ title: "온톨로지 뷰로 이동", description: "사이드바에서 '대체투자 온톨로지 뷰'를 선택하세요." })
            }}>
              <Network className="w-4 h-4 mr-2" />
              온톨로지 뷰에서 확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={newRequestDialogOpen} onOpenChange={setNewRequestDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              약정서 요청 등록
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">고객사</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="고객사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="samsung">삼성생명</SelectItem>
                    <SelectItem value="hanwha">한화생명</SelectItem>
                    <SelectItem value="db">DB손해보험</SelectItem>
                    <SelectItem value="mirae">미래에셋증권</SelectItem>
                    <SelectItem value="nh">NH투자증권</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">고객 유형</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance">보험사</SelectItem>
                    <SelectItem value="securities">증권사</SelectItem>
                    <SelectItem value="pension">연기금</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">펀드</Label>
              <Select>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="펀드 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fund1">EG 대체투자 1호</SelectItem>
                  <SelectItem value="fund2">EG 인프라 펀드</SelectItem>
                  <SelectItem value="fund3">EG PE 펀드</SelectItem>
                  <SelectItem value="fund4">EG 부동산 2호</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">문서 유형</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="문서 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment-confirm">투자확인서</SelectItem>
                    <SelectItem value="investment-contract">투자계약서</SelectItem>
                    <SelectItem value="im">IM</SelectItem>
                    <SelectItem value="side-letter">사이드레터</SelectItem>
                    <SelectItem value="financial">재무제표</SelectItem>
                    <SelectItem value="appraisal">감정평가서</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">제출 기한</Label>
                <Input type="date" className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">설명</Label>
              <Input placeholder="예: 2025년 4분기 기준 투자확인서" className="bg-zinc-800 border-zinc-700" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">담당자</Label>
              <Select>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="park">박민수</SelectItem>
                  <SelectItem value="kim">김지영</SelectItem>
                  <SelectItem value="lee">이승호</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" className="border-zinc-700" onClick={() => setNewRequestDialogOpen(false)}>
              취소
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
