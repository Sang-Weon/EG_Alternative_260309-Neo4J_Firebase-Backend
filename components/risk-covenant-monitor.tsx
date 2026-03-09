"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown,
  Shield,
  FileWarning,
  RefreshCw,
  ChevronRight,
  Clock,
  Target,
  Lightbulb,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  Landmark,
  X
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

// ────────────────────────────────────────────────────────────────────────────
// 약정 및 액션아이템 타입 정의
// ────────────────────────────────────────────────────────────────────────────
interface CovenantItem {
  id: string
  projectName: string
  projectId: string
  type: string
  typeKr: string
  threshold: number
  currentValue: number
  previousValue?: number
  direction: "above" | "below"
  status: "정상" | "주의" | "위반"
  breachCount: number
  lastUpdated: string
  trend: "up" | "down" | "stable"
  relatedCompanies: string[]
  relatedTranches: string[]
  history: { date: string; value: number; status: string }[]
}

interface ActionItem {
  id: string
  priority: "high" | "medium" | "low"
  category: string
  title: string
  description: string
  assignee?: string
  dueDate?: string
  status: "pending" | "in_progress" | "completed"
  relatedCovenant: string
}

// ────────────────────────────────────────────────────────────────────────────
// 샘플 데이터
// ────────────────────────────────────────────────────────────────────────────
const sampleCovenants: CovenantItem[] = [
  { 
    id: "cov-1", 
    projectName: "강남 오피스 PF", 
    projectId: "proj-1",
    type: "LTV", 
    typeKr: "담보인정비율",
    threshold: 70, 
    currentValue: 72, 
    previousValue: 68,
    direction: "below", 
    status: "위반", 
    breachCount: 1,
    lastUpdated: "2024-03-01",
    trend: "up",
    relatedCompanies: ["현대건설", "삼성물산"],
    relatedTranches: ["Senior (500억)", "Mezzanine (200억)"],
    history: [
      { date: "2024-01", value: 65, status: "정상" },
      { date: "2024-02", value: 68, status: "정상" },
      { date: "2024-03", value: 72, status: "위반" },
    ]
  },
  { 
    id: "cov-2", 
    projectName: "강남 오피스 PF", 
    projectId: "proj-1",
    type: "DSCR", 
    typeKr: "원리금상환비율",
    threshold: 1.2, 
    currentValue: 1.15, 
    previousValue: 1.25,
    direction: "above", 
    status: "주의", 
    breachCount: 0,
    lastUpdated: "2024-03-01",
    trend: "down",
    relatedCompanies: ["현대건설"],
    relatedTranches: ["Senior (500억)"],
    history: [
      { date: "2024-01", value: 1.35, status: "정상" },
      { date: "2024-02", value: 1.25, status: "정상" },
      { date: "2024-03", value: 1.15, status: "주의" },
    ]
  },
  { 
    id: "cov-3", 
    projectName: "판교 물류센터", 
    projectId: "proj-2",
    type: "LTV", 
    typeKr: "담보인정비율",
    threshold: 70, 
    currentValue: 58,
    previousValue: 60,
    direction: "below", 
    status: "정상", 
    breachCount: 0,
    lastUpdated: "2024-03-01",
    trend: "down",
    relatedCompanies: ["롯데건설"],
    relatedTranches: ["Senior (800억)"],
    history: [
      { date: "2024-01", value: 62, status: "정상" },
      { date: "2024-02", value: 60, status: "정상" },
      { date: "2024-03", value: 58, status: "정상" },
    ]
  },
  { 
    id: "cov-4", 
    projectName: "판교 물류센터",
    projectId: "proj-2",
    type: "DSCR", 
    typeKr: "원리금상환비율",
    threshold: 1.2, 
    currentValue: 1.52,
    previousValue: 1.48,
    direction: "above", 
    status: "정상", 
    breachCount: 0,
    lastUpdated: "2024-03-01",
    trend: "up",
    relatedCompanies: ["롯데건설"],
    relatedTranches: ["Senior (800억)"],
    history: [
      { date: "2024-01", value: 1.45, status: "정상" },
      { date: "2024-02", value: 1.48, status: "정상" },
      { date: "2024-03", value: 1.52, status: "정상" },
    ]
  },
  { 
    id: "cov-5", 
    projectName: "B737 리스", 
    projectId: "proj-3",
    type: "DSCR", 
    typeKr: "원리금상환비율",
    threshold: 1.1, 
    currentValue: 1.05,
    previousValue: 1.12,
    direction: "above", 
    status: "위반", 
    breachCount: 2,
    lastUpdated: "2024-03-01",
    trend: "down",
    relatedCompanies: ["대한항공", "아시아나"],
    relatedTranches: ["Senior (300억)", "Junior (100억)"],
    history: [
      { date: "2024-01", value: 1.18, status: "정상" },
      { date: "2024-02", value: 1.12, status: "정상" },
      { date: "2024-03", value: 1.05, status: "위반" },
    ]
  },
  { 
    id: "cov-6", 
    projectName: "인천 주상복합",
    projectId: "proj-4",
    type: "분양률", 
    typeKr: "분양률",
    threshold: 60, 
    currentValue: 52,
    previousValue: 48,
    direction: "above", 
    status: "위반", 
    breachCount: 1,
    lastUpdated: "2024-03-01",
    trend: "up",
    relatedCompanies: ["태영건설", "HDC현대산업개발"],
    relatedTranches: ["Mezzanine (400억)", "Junior (150억)"],
    history: [
      { date: "2024-01", value: 42, status: "위반" },
      { date: "2024-02", value: 48, status: "위반" },
      { date: "2024-03", value: 52, status: "위반" },
    ]
  },
]

const riskScoreData = [
  { project: "강남 오피스 PF", score: 62, factors: ["LTV 초과", "DSCR 경고"] },
  { project: "B737 리스", score: 78, factors: ["DSCR 위반", "임차인 신용 하락"] },
  { project: "인천 주상복합", score: 55, factors: ["분양률 미달"] },
  { project: "판교 물류센터", score: 25, factors: [] },
  { project: "영암 태양광", score: 18, factors: [] },
]

// 약정별 추천 액션아이템 생성
function generateActionItems(covenant: CovenantItem): ActionItem[] {
  const actions: ActionItem[] = []
  
  if (covenant.status === "위반") {
    // LTV 위반
    if (covenant.type === "LTV") {
      actions.push(
        { id: `${covenant.id}-1`, priority: "high", category: "담보관리", title: "추가 담보 확보 검토", description: "담보가치 하락으로 인한 LTV 초과. 추가 담보 제공 또는 담보 재감정 요청 필요", assignee: "리스크관리팀", dueDate: "2024-03-15", status: "pending", relatedCovenant: covenant.id },
        { id: `${covenant.id}-2`, priority: "high", category: "대출관리", title: "부분 상환 협의", description: `LTV ${covenant.currentValue}% → ${covenant.threshold}% 이하로 조정 필요. 약 ${Math.round((covenant.currentValue - covenant.threshold) * 10)}억원 상환 검토`, assignee: "자산운용팀", dueDate: "2024-03-20", status: "pending", relatedCovenant: covenant.id },
        { id: `${covenant.id}-3`, priority: "medium", category: "모니터링", title: "담보가치 재평가 요청", description: "최근 시장 상황 반영하여 담보 재감정 실시. 감정평가사 선정 및 일정 조율 필요", assignee: "실사팀", dueDate: "2024-03-25", status: "pending", relatedCovenant: covenant.id }
      )
    }
    
    // DSCR 위반
    if (covenant.type === "DSCR") {
      actions.push(
        { id: `${covenant.id}-1`, priority: "high", category: "현금흐름", title: "현금흐름 개선 방안 수립", description: `DSCR ${covenant.currentValue}x → ${covenant.threshold}x 이상 필요. 운영비용 절감 또는 수익 증대 방안 검토`, assignee: "자산운용팀", dueDate: "2024-03-15", status: "pending", relatedCovenant: covenant.id },
        { id: `${covenant.id}-2`, priority: "high", category: "차주관리", title: "차주 면담 및 현황 점검", description: "차주의 재무상태 및 사업계획 점검. 개선 계획서 징구 필요", assignee: "심사팀", dueDate: "2024-03-10", status: "in_progress", relatedCovenant: covenant.id },
        { id: `${covenant.id}-3`, priority: "medium", category: "구조조정", title: "대출조건 재협상 검토", description: "금리 조정, 만기 연장, 상환스케줄 조정 등 구조조정 옵션 검토", assignee: "구조화팀", dueDate: "2024-03-30", status: "pending", relatedCovenant: covenant.id }
      )
    }
    
    // 분양률 위반
    if (covenant.type === "분양률") {
      actions.push(
        { id: `${covenant.id}-1`, priority: "high", category: "마케팅", title: "분양 촉진 전략 수립", description: `분양률 ${covenant.currentValue}% → ${covenant.threshold}% 이상 달성 필요. 가격 조정, 프로모션 등 검토`, assignee: "시행사", dueDate: "2024-03-15", status: "pending", relatedCovenant: covenant.id },
        { id: `${covenant.id}-2`, priority: "high", category: "보증관리", title: "책임준공 보증 점검", description: "시공사 책임준공 약정 및 보증 이행 가능성 점검", assignee: "리스크관리팀", dueDate: "2024-03-10", status: "pending", relatedCovenant: covenant.id },
        { id: `${covenant.id}-3`, priority: "medium", category: "시장분석", title: "경쟁 단지 분석", description: "주변 경쟁 단지 분양 현황 및 가격 분석. 차별화 전략 수립", assignee: "리서치팀", dueDate: "2024-03-20", status: "pending", relatedCovenant: covenant.id }
      )
    }
  } else if (covenant.status === "주의") {
    actions.push(
      { id: `${covenant.id}-1`, priority: "medium", category: "모니터링", title: "긴밀 모니터링 실시", description: `${covenant.typeKr} 주의 구간 진입. 주간 단위 모니터링으로 전환`, assignee: "리스크관리팀", dueDate: "2024-03-08", status: "pending", relatedCovenant: covenant.id },
      { id: `${covenant.id}-2`, priority: "low", category: "사전대응", title: "사전 대응 시나리오 수립", description: "위반 시 대응 방안 사전 수립. 담보 추가, 상환 등 옵션 검토", assignee: "자산운용팀", dueDate: "2024-03-15", status: "pending", relatedCovenant: covenant.id }
    )
  }
  
  return actions
}

// ────────────────────────────────────────────────────────────────────────────
// 약정 상세 팝업 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
interface CovenantDetailDialogProps {
  covenant: CovenantItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CovenantDetailDialog({ covenant, open, onOpenChange }: CovenantDetailDialogProps) {
  if (!covenant) return null
  
  const actionItems = generateActionItems(covenant)
  const progress = covenant.direction === "below" 
    ? (covenant.currentValue / covenant.threshold) * 100
    : (covenant.threshold / covenant.currentValue) * 100
  
  const statusColor = covenant.status === "정상" ? "emerald" : covenant.status === "주의" ? "amber" : "red"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {covenant.status === "정상" ? (
                <CheckCircle2 className={`w-6 h-6 text-${statusColor}-400`} />
              ) : (
                <AlertTriangle className={`w-6 h-6 text-${statusColor}-400`} />
              )}
              <div>
                <span className="text-lg">{covenant.projectName}</span>
                <Badge 
                  className={`ml-3 bg-${statusColor}-500/20 text-${statusColor}-400 border-${statusColor}-500/30`}
                >
                  {covenant.status}
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            {covenant.typeKr} ({covenant.type}) 약정 상세 현황 및 추천 액션 아이템
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-6 pr-4">
            {/* 약정 현황 요약 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                약정 현황
              </h4>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xs text-zinc-400 mb-1">현재값</div>
                  <div className={`text-2xl font-bold text-${statusColor}-400`}>
                    {covenant.type === "LTV" || covenant.type === "분양률" 
                      ? `${covenant.currentValue}%` 
                      : `${covenant.currentValue}x`}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs mt-1">
                    {covenant.trend === "up" ? (
                      <ArrowUpRight className={`w-3 h-3 ${covenant.direction === "above" ? "text-emerald-400" : "text-red-400"}`} />
                    ) : covenant.trend === "down" ? (
                      <ArrowDownRight className={`w-3 h-3 ${covenant.direction === "below" ? "text-emerald-400" : "text-red-400"}`} />
                    ) : null}
                    <span className="text-zinc-400">
                      전월 대비 {covenant.previousValue 
                        ? `${(covenant.currentValue - covenant.previousValue).toFixed(covenant.type === "DSCR" ? 2 : 0)}${covenant.type === "DSCR" ? "x" : "%p"}`
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-400 mb-1">기준값</div>
                  <div className="text-2xl font-bold text-zinc-300">
                    {covenant.type === "LTV" || covenant.type === "분양률"
                      ? `${covenant.threshold}%`
                      : `${covenant.threshold}x`}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {covenant.direction === "above" ? "이상 유지" : "이하 유지"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-400 mb-1">위반 횟수</div>
                  <div className={`text-2xl font-bold ${covenant.breachCount > 0 ? "text-red-400" : "text-zinc-300"}`}>
                    {covenant.breachCount}회
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">누적 기준</div>
                </div>
              </div>

              <Progress 
                value={Math.min(progress, 100)} 
                className={`h-3 [&>div]:bg-${statusColor}-500`}
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>0{covenant.type === "DSCR" ? "x" : "%"}</span>
                <span className="text-zinc-300">기준: {covenant.threshold}{covenant.type === "DSCR" ? "x" : "%"}</span>
                <span>{covenant.type === "DSCR" ? "2.0x" : "100%"}</span>
              </div>
            </Card>

            {/* 이력 추이 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                최근 3개월 추이
              </h4>
              <div className="flex gap-2">
                {covenant.history.map((h, idx) => (
                  <div key={idx} className="flex-1 p-3 bg-zinc-900/50 rounded-lg text-center">
                    <div className="text-xs text-zinc-400 mb-1">{h.date}</div>
                    <div className={`text-lg font-bold ${
                      h.status === "정상" ? "text-emerald-400" : 
                      h.status === "주의" ? "text-amber-400" : "text-red-400"
                    }`}>
                      {covenant.type === "DSCR" ? `${h.value}x` : `${h.value}%`}
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      h.status === "정상" ? "text-emerald-400 border-emerald-400/50" : 
                      h.status === "주의" ? "text-amber-400 border-amber-400/50" : "text-red-400 border-red-400/50"
                    }`}>
                      {h.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* 연관 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  관련 회사
                </h4>
                <div className="space-y-2">
                  {covenant.relatedCompanies.map((company, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                      <span>{company}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-400" />
                  관련 트랜치
                </h4>
                <div className="space-y-2">
                  {covenant.relatedTranches.map((tranche, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                      <span>{tranche}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 추천 액션 아이템 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                추천 액션 아이템
                <Badge variant="outline" className="ml-2">{actionItems.length}건</Badge>
              </h4>
              
              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((action) => (
                    <div 
                      key={action.id} 
                      className={`p-4 rounded-lg border ${
                        action.priority === "high" 
                          ? "bg-red-500/10 border-red-500/30" 
                          : action.priority === "medium"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-zinc-900/50 border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              action.priority === "high" ? "text-red-400 border-red-400/50" :
                              action.priority === "medium" ? "text-amber-400 border-amber-400/50" :
                              "text-zinc-400"
                            }`}
                          >
                            {action.priority === "high" ? "긴급" : action.priority === "medium" ? "중요" : "일반"}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/50">
                            {action.category}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {action.status === "pending" ? "대기" : action.status === "in_progress" ? "진행중" : "완료"}
                        </Badge>
                      </div>
                      
                      <h5 className="font-medium text-sm mb-1">{action.title}</h5>
                      <p className="text-xs text-zinc-400 mb-3">{action.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {action.assignee && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {action.assignee}
                          </div>
                        )}
                        {action.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {action.dueDate}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p className="text-sm">약정 준수 상태입니다. 추가 조치가 필요하지 않습니다.</p>
                </div>
              )}
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
export function RiskCovenantMonitor() {
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [selectedCovenant, setSelectedCovenant] = useState<CovenantItem | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const handleCovenantCheck = async () => {
    setIsChecking(true)
    try {
      const result = await AIPLogic.simulateScenario("전체 약정 점검", {
        ltv: 0.72,
        dscr: 1.15,
        icr: 2.1
      })
      setCheckResult(result)
      toast({
        title: "약정 점검 완료",
        description: result.recommendation,
      })
    } catch (error) {
      toast({
        title: "점검 오류",
        description: "약정 점검 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsChecking(false)
    }
  }

  const handleCovenantClick = (covenant: CovenantItem) => {
    setSelectedCovenant(covenant)
    setShowDetail(true)
  }

  const covenantSummary = {
    total: sampleCovenants.length,
    compliant: sampleCovenants.filter(c => c.status === "정상").length,
    warning: sampleCovenants.filter(c => c.status === "주의").length,
    breach: sampleCovenants.filter(c => c.status === "위반").length
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            리스크 & 약정 모니터링
          </h2>
          <p className="text-sm text-zinc-400 mt-1">LTV/DSCR/ICR 약정 상태 및 리스크 점수 모니터링</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleCovenantCheck}
          disabled={isChecking}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "점검 중..." : "약정 일괄 점검"}
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">전체 약정</div>
          <div className="text-2xl font-bold">{covenantSummary.total}</div>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4">
          <div className="text-xs text-emerald-400 mb-1">정상</div>
          <div className="text-2xl font-bold text-emerald-400">{covenantSummary.compliant}</div>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30 p-4">
          <div className="text-xs text-amber-400 mb-1">주의</div>
          <div className="text-2xl font-bold text-amber-400">{covenantSummary.warning}</div>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <div className="text-xs text-red-400 mb-1">위반</div>
          <div className="text-2xl font-bold text-red-400">{covenantSummary.breach}</div>
        </Card>
      </div>

      <Tabs defaultValue="covenants" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
          <TabsTrigger value="covenants">약정 현황</TabsTrigger>
          <TabsTrigger value="risk-scores">리스크 점수</TabsTrigger>
        </TabsList>

        <TabsContent value="covenants" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-400" />
                약정 상세 현황
              </h3>
              <p className="text-xs text-zinc-400 mt-1">클릭하여 상세 현황 및 추천 액션 아이템 확인</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {sampleCovenants.map((covenant) => {
                const progress = covenant.direction === "below" 
                  ? (covenant.currentValue / covenant.threshold) * 100
                  : (covenant.threshold / covenant.currentValue) * 100
                
                return (
                  <button
                    key={covenant.id} 
                    onClick={() => handleCovenantClick(covenant)}
                    className="w-full p-4 hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {covenant.status === "정상" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : covenant.status === "주의" ? (
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{covenant.projectName}</div>
                          <div className="text-xs text-zinc-400">{covenant.typeKr} ({covenant.type}) 약정</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm flex items-center gap-1">
                            <span className={`font-mono font-bold ${
                              covenant.status === "정상" ? "text-emerald-400" :
                              covenant.status === "주의" ? "text-amber-400" : "text-red-400"
                            }`}>
                              {covenant.type === "LTV" || covenant.type === "분양률" 
                                ? `${covenant.currentValue}%` 
                                : `${covenant.currentValue}x`}
                            </span>
                            {covenant.trend === "up" ? (
                              <ArrowUpRight className={`w-3 h-3 ${covenant.direction === "above" ? "text-emerald-400" : "text-red-400"}`} />
                            ) : covenant.trend === "down" ? (
                              <ArrowDownRight className={`w-3 h-3 ${covenant.direction === "below" ? "text-emerald-400" : "text-red-400"}`} />
                            ) : null}
                            <span className="text-zinc-500 mx-1">/</span>
                            <span className="text-zinc-400">
                              {covenant.type === "LTV" || covenant.type === "분양률"
                                ? `${covenant.threshold}%`
                                : `${covenant.threshold}x`}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {covenant.direction === "above" ? "이상 유지" : "이하 유지"}
                          </div>
                        </div>
                        <Badge 
                          variant={covenant.status === "정상" ? "default" : covenant.status === "주의" ? "secondary" : "destructive"}
                          className={`w-14 justify-center ${
                            covenant.status === "정상" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            covenant.status === "주의" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {covenant.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                    {covenant.breachCount > 0 && (
                      <div className="text-xs text-red-400 mt-1 ml-8">
                        누적 위반 {covenant.breachCount}회
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="risk-scores" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                프로젝트별 리스크 점수
              </h3>
              <p className="text-xs text-zinc-400 mt-1">0-100점, 높을수록 위험</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {riskScoreData
                .sort((a, b) => b.score - a.score)
                .map((item) => (
                  <div key={item.project} className="p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{item.project}</div>
                      <div className={`text-lg font-bold font-mono ${
                        item.score >= 60 ? "text-red-400" :
                        item.score >= 40 ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {item.score}점
                      </div>
                    </div>
                    <Progress 
                      value={item.score} 
                      className={`h-2 ${
                        item.score >= 60 ? "[&>div]:bg-red-500" :
                        item.score >= 40 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                      }`}
                    />
                    {item.factors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.factors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-zinc-400">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 약정 상세 팝업 */}
      <CovenantDetailDialog
        covenant={selectedCovenant}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </div>
  )
}
