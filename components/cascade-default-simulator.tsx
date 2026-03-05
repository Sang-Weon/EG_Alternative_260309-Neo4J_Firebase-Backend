"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Play, 
  AlertTriangle, 
  Building2, 
  ArrowRight,
  ArrowDown,
  TrendingDown,
  Landmark,
  Users,
  Network,
  GitBranch,
  Layers,
  Shield,
  FileText,
  ChevronRight,
  Zap,
  Target,
  Link2
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

// ────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────────────────────
interface CascadeNode {
  id: string
  name: string
  type: "company" | "project" | "tranche" | "fund"
  level: number // 전파 단계 (0=트리거, 1=1차 영향, 2=2차 영향...)
  impact: number // 영향도 (0-100)
  lossAmount: number // 손실 금액 (억원)
  probability: number // 전파 확률
}

interface CascadeLink {
  from: string
  to: string
  type: string
  description: string
  transmissionRate: number // 전파율
}

interface CascadePath {
  nodes: string[]
  description: string
  totalLoss: number
  probability: number
}

interface CauseAnalysis {
  category: string
  factor: string
  description: string
  contribution: number // 기여도 (%)
}

// ────────────────────────────────────────────────────────────────────────────
// 샘플 데이터
// ────────────────────────────────────────────────────────────────────────────
const sampleCompanies = [
  { id: "taeyoung", name: "태영건설", rating: "BB-", pd: 3.5, relatedProjects: 5, exposure: 1200 },
  { id: "lotte", name: "롯데건설", rating: "BBB", pd: 0.3, relatedProjects: 8, exposure: 2500 },
  { id: "gs", name: "GS건설", rating: "A-", pd: 0.1, relatedProjects: 12, exposure: 4200 },
  { id: "hyundai", name: "현대건설", rating: "A", pd: 0.08, relatedProjects: 15, exposure: 5800 },
]

// 시뮬레이션 결과 생성 함수
function generateCascadeResult(companyId: string) {
  const company = sampleCompanies.find(c => c.id === companyId)
  if (!company) return null

  // 연쇄 전파 노드
  const nodes: CascadeNode[] = [
    // Level 0: 트리거 (부도 발생 회사)
    { id: company.id, name: company.name, type: "company", level: 0, impact: 100, lossAmount: 0, probability: 1.0 },
    
    // Level 1: 직접 영향 (책임준공 프로젝트)
    { id: "proj-1", name: "강남 오피스 PF", type: "project", level: 1, impact: 85, lossAmount: 180, probability: 0.95 },
    { id: "proj-2", name: "인천 주상복합", type: "project", level: 1, impact: 72, lossAmount: 120, probability: 0.88 },
    { id: "proj-3", name: "판교 데이터센터", type: "project", level: 1, impact: 65, lossAmount: 95, probability: 0.75 },
    
    // Level 2: 트랜치 영향
    { id: "tr-1", name: "강남 오피스 Senior", type: "tranche", level: 2, impact: 45, lossAmount: 85, probability: 0.65 },
    { id: "tr-2", name: "강남 오피스 Mezzanine", type: "tranche", level: 2, impact: 78, lossAmount: 156, probability: 0.85 },
    { id: "tr-3", name: "인천 주상복합 Junior", type: "tranche", level: 2, impact: 92, lossAmount: 138, probability: 0.92 },
    
    // Level 3: 펀드 영향
    { id: "fund-1", name: "이지대체투자1호", type: "fund", level: 3, impact: 35, lossAmount: 245, probability: 0.55 },
    { id: "fund-2", name: "ABC인프라펀드", type: "fund", level: 3, impact: 28, lossAmount: 180, probability: 0.48 },
  ]

  // 연쇄 전파 링크 (관계)
  const links: CascadeLink[] = [
    // 회사 → 프로젝트 (책임준공)
    { from: company.id, to: "proj-1", type: "RESPONSIBLE_FOR", description: "책임준공 담당", transmissionRate: 0.95 },
    { from: company.id, to: "proj-2", type: "RESPONSIBLE_FOR", description: "책임준공 담당", transmissionRate: 0.88 },
    { from: company.id, to: "proj-3", type: "CONSTRUCTS", description: "시공 담당 (비책임준공)", transmissionRate: 0.75 },
    
    // 프로젝트 → 트랜치
    { from: "proj-1", to: "tr-1", type: "HAS_TRANCHE", description: "선순위 트랜치", transmissionRate: 0.65 },
    { from: "proj-1", to: "tr-2", type: "HAS_TRANCHE", description: "중순위 트랜치", transmissionRate: 0.85 },
    { from: "proj-2", to: "tr-3", type: "HAS_TRANCHE", description: "후순위 트랜치", transmissionRate: 0.92 },
    
    // 트랜치 → 펀드
    { from: "tr-1", to: "fund-1", type: "HELD_BY", description: "펀드 보유", transmissionRate: 0.55 },
    { from: "tr-2", to: "fund-1", type: "HELD_BY", description: "펀드 보유", transmissionRate: 0.55 },
    { from: "tr-3", to: "fund-2", type: "HELD_BY", description: "펀드 보유", transmissionRate: 0.48 },
  ]

  // 주요 전파 경로
  const paths: CascadePath[] = [
    {
      nodes: [company.name, "강남 오피스 PF", "Mezzanine 트랜치", "이지대체투자1호"],
      description: "책임준공 실패 → 프로젝트 지연 → Mezzanine 손실 → 펀드 NAV 하락",
      totalLoss: 156,
      probability: 0.85 * 0.85 * 0.55
    },
    {
      nodes: [company.name, "인천 주상복합", "Junior 트랜치", "ABC인프라펀드"],
      description: "시공사 부도 → 분양 신뢰 하락 → Junior 전액 손실 → 펀드 손실",
      totalLoss: 138,
      probability: 0.88 * 0.92 * 0.48
    },
    {
      nodes: [company.name, "판교 데이터센터", "공사 지연"],
      description: "시공 중단 → 대체 시공사 선정 필요 → 추가 비용 발생",
      totalLoss: 95,
      probability: 0.75
    }
  ]

  // 원인 분석
  const causes: CauseAnalysis[] = [
    { category: "재무 요인", factor: "유동성 위기", description: "단기 차입금 만기 도래 및 차환 실패", contribution: 35 },
    { category: "재무 요인", factor: "수익성 악화", description: "원자재 가격 상승 및 마진 축소", contribution: 20 },
    { category: "시장 요인", factor: "부동산 경기 침체", description: "분양률 하락 및 PF 자금 회수 지연", contribution: 25 },
    { category: "사업 요인", factor: "대형 프로젝트 부실", description: "특정 프로젝트 손실 확대", contribution: 15 },
    { category: "외부 요인", factor: "금리 인상", description: "이자비용 증가 및 차환 금리 상승", contribution: 5 },
  ]

  // 요약 통계
  const summary = {
    totalExposure: nodes.filter(n => n.type !== "company").reduce((sum, n) => sum + n.lossAmount, 0),
    directImpact: nodes.filter(n => n.level === 1).reduce((sum, n) => sum + n.lossAmount, 0),
    indirectImpact: nodes.filter(n => n.level >= 2).reduce((sum, n) => sum + n.lossAmount, 0),
    affectedProjects: nodes.filter(n => n.type === "project").length,
    affectedTranches: nodes.filter(n => n.type === "tranche").length,
    affectedFunds: nodes.filter(n => n.type === "fund").length,
    maxPropagationLevel: Math.max(...nodes.map(n => n.level)),
    avgTransmissionRate: links.reduce((sum, l) => sum + l.transmissionRate, 0) / links.length,
  }

  return { nodes, links, paths, causes, summary, company }
}

// ────────────────────────────────────────────────────────────────────────────
// 전파 경로 시각화 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
function PropagationPathView({ nodes, links }: { nodes: CascadeNode[], links: CascadeLink[] }) {
  const levels = [0, 1, 2, 3]
  
  const nodesByLevel = levels.map(level => nodes.filter(n => n.level === level))
  
  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0: return "트리거"
      case 1: return "1차 영향 (직접)"
      case 2: return "2차 영향 (트랜치)"
      case 3: return "3차 영향 (펀드)"
      default: return `${level}차 영향`
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "company": return Building2
      case "project": return Landmark
      case "tranche": return Layers
      case "fund": return Users
      default: return Target
    }
  }

  return (
    <div className="space-y-6">
      {levels.map((level) => {
        const levelNodes = nodesByLevel[level]
        if (levelNodes.length === 0) return null
        
        return (
          <div key={level}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`${
                level === 0 ? "text-red-400 border-red-400/50" :
                level === 1 ? "text-amber-400 border-amber-400/50" :
                level === 2 ? "text-blue-400 border-blue-400/50" :
                "text-purple-400 border-purple-400/50"
              }`}>
                Level {level}
              </Badge>
              <span className="text-sm text-zinc-400">{getLevelLabel(level)}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelNodes.map((node) => {
                const Icon = getNodeIcon(node.type)
                const incomingLinks = links.filter(l => l.to === node.id)
                
                return (
                  <Card 
                    key={node.id} 
                    className={`p-4 ${
                      level === 0 ? "bg-red-500/10 border-red-500/30" :
                      node.impact >= 70 ? "bg-amber-500/10 border-amber-500/30" :
                      "bg-zinc-800/50 border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        level === 0 ? "bg-red-500/20" :
                        level === 1 ? "bg-amber-500/20" :
                        level === 2 ? "bg-blue-500/20" :
                        "bg-purple-500/20"
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          level === 0 ? "text-red-400" :
                          level === 1 ? "text-amber-400" :
                          level === 2 ? "text-blue-400" :
                          "text-purple-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{node.name}</div>
                        <div className="text-xs text-zinc-400 capitalize">{node.type}</div>
                        
                        {level > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-500">영향도</span>
                              <span className={`font-medium ${
                                node.impact >= 70 ? "text-red-400" :
                                node.impact >= 40 ? "text-amber-400" :
                                "text-emerald-400"
                              }`}>{node.impact}%</span>
                            </div>
                            <Progress value={node.impact} className={`h-1.5 ${
                              node.impact >= 70 ? "[&>div]:bg-red-500" :
                              node.impact >= 40 ? "[&>div]:bg-amber-500" :
                              "[&>div]:bg-emerald-500"
                            }`} />
                            {node.lossAmount > 0 && (
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-zinc-500">예상 손실</span>
                                <span className="text-red-400 font-mono">{node.lossAmount}억</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {incomingLinks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-700/50">
                            {incomingLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs text-zinc-500">
                                <Link2 className="w-3 h-3" />
                                <span className="text-blue-400">{link.type}</span>
                                <span>({(link.transmissionRate * 100).toFixed(0)}%)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
            
            {level < 3 && nodesByLevel[level + 1]?.length > 0 && (
              <div className="flex justify-center my-4">
                <ArrowDown className="w-6 h-6 text-zinc-600" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
export function CascadeDefaultSimulator() {
  const { toast } = useToast()
  const [selectedCompany, setSelectedCompany] = useState<string>("taeyoung")
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof generateCascadeResult>>(null)

  const company = sampleCompanies.find(c => c.id === selectedCompany)

  const handleSimulation = async () => {
    if (!company) return
    
    setIsSimulating(true)
    try {
      // AIP Logic 호출
      await AIPLogic.simulateScenario(
        `${company.name} 연쇄부도 시뮬레이션`,
        {
          triggerCompanyName: company.name,
          triggerCompanyRating: company.rating
        }
      )
      
      // 상세 결과 생성
      const cascadeResult = generateCascadeResult(selectedCompany)
      setResult(cascadeResult)
      
      toast({
        title: "시뮬레이션 완료",
        description: `${cascadeResult?.summary.affectedProjects}개 프로젝트, ${cascadeResult?.summary.affectedFunds}개 펀드 영향 분석 완료`,
      })
    } catch (error) {
      toast({
        title: "시뮬레이션 오류",
        description: "연쇄부도 시뮬레이션 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-400" />
            연쇄부도 시뮬레이션
          </h2>
          <p className="text-sm text-zinc-400 mt-1">시공사/시행사 부도 시 포트폴리오 영향 및 전파 경로 분석</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700" 
          onClick={handleSimulation}
          disabled={isSimulating}
        >
          <Play className="w-4 h-4 mr-2" />
          {isSimulating ? "시뮬레이션 중..." : "시뮬레이션 실행"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 좌측: 시나리오 설정 */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            부도 트리거 선택
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label>시공사/시행사</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {sampleCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        <Badge variant="outline" className={`text-xs ${
                          c.rating.startsWith("A") ? "text-emerald-400" :
                          c.rating.startsWith("BBB") ? "text-blue-400" :
                          "text-amber-400"
                        }`}>
                          {c.rating}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {company && (
              <div className="space-y-3">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-2">선택된 회사</div>
                  <div className="text-xl font-bold">{company.name}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-center p-2 bg-zinc-900/50 rounded">
                      <div className="text-xs text-zinc-500">신용등급</div>
                      <div className={`font-bold ${
                        company.rating.startsWith("A") ? "text-emerald-400" :
                        company.rating.startsWith("BBB") ? "text-blue-400" :
                        "text-amber-400"
                      }`}>{company.rating}</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50 rounded">
                      <div className="text-xs text-zinc-500">부도확률</div>
                      <div className="font-bold text-red-400">{company.pd}%</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50 rounded">
                      <div className="text-xs text-zinc-500">관련 프로젝트</div>
                      <div className="font-bold">{company.relatedProjects}건</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50 rounded">
                      <div className="text-xs text-zinc-500">총 익스포저</div>
                      <div className="font-bold text-blue-400">{company.exposure}억</div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-red-400 mb-1">시나리오 설명</div>
                      <p className="text-zinc-300">
                        {company.name} 부도 발생 시 책임준공 프로젝트, 관련 트랜치, 보유 펀드까지의 연쇄 영향을 분석합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 우측: 결과 */}
        <div className="lg:col-span-3 space-y-6">
          {result ? (
            <Tabs defaultValue="propagation" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-900">
                <TabsTrigger value="propagation">전파 경로</TabsTrigger>
                <TabsTrigger value="causes">원인 분석</TabsTrigger>
                <TabsTrigger value="impact">임팩트 상세</TabsTrigger>
                <TabsTrigger value="summary">종합 요약</TabsTrigger>
              </TabsList>

              {/* 전파 경로 탭 */}
              <TabsContent value="propagation" className="mt-6">
                <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-400" />
                    연쇄 전파 경로 시각화
                  </h3>
                  <PropagationPathView nodes={result.nodes} links={result.links} />
                </Card>
              </TabsContent>

              {/* 원인 분석 탭 */}
              <TabsContent value="causes" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      부도 원인 분석
                    </h3>
                    <div className="space-y-4">
                      {result.causes.map((cause, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/50">
                                {cause.category}
                              </Badge>
                              <span className="font-medium text-sm">{cause.factor}</span>
                            </div>
                            <span className="text-sm font-mono text-amber-400">{cause.contribution}%</span>
                          </div>
                          <p className="text-xs text-zinc-400 pl-2">{cause.description}</p>
                          <Progress value={cause.contribution} className="h-1.5 [&>div]:bg-amber-500" />
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-blue-400" />
                      주요 전파 경로
                    </h3>
                    <div className="space-y-4">
                      {result.paths.map((path, idx) => (
                        <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {path.nodes.map((node, nodeIdx) => (
                              <div key={nodeIdx} className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {node}
                                </Badge>
                                {nodeIdx < path.nodes.length - 1 && (
                                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">{path.description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-red-400">손실: {path.totalLoss}억</span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-amber-400">발생확률: {(path.probability * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* 임팩트 상세 탭 */}
              <TabsContent value="impact" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 프로젝트별 영향 */}
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-amber-400" />
                      프로젝트별 영향
                    </h3>
                    <div className="space-y-3">
                      {result.nodes.filter(n => n.type === "project").map((project) => (
                        <div key={project.id} className="p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{project.name}</span>
                            <Badge variant="outline" className={`${
                              project.impact >= 70 ? "text-red-400 border-red-400/50" :
                              project.impact >= 40 ? "text-amber-400 border-amber-400/50" :
                              "text-emerald-400 border-emerald-400/50"
                            }`}>
                              {project.impact}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>예상 손실: <span className="text-red-400">{project.lossAmount}억</span></span>
                            <span>전파확률: {(project.probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* 트랜치별 영향 */}
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" />
                      트랜치별 영향
                    </h3>
                    <div className="space-y-3">
                      {result.nodes.filter(n => n.type === "tranche").map((tranche) => (
                        <div key={tranche.id} className="p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{tranche.name}</span>
                            <Badge variant="outline" className={`${
                              tranche.impact >= 70 ? "text-red-400 border-red-400/50" :
                              tranche.impact >= 40 ? "text-amber-400 border-amber-400/50" :
                              "text-emerald-400 border-emerald-400/50"
                            }`}>
                              {tranche.impact}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>예상 손실: <span className="text-red-400">{tranche.lossAmount}억</span></span>
                            <span>전파확률: {(tranche.probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* 펀드별 영향 */}
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      펀드별 영향
                    </h3>
                    <div className="space-y-3">
                      {result.nodes.filter(n => n.type === "fund").map((fund) => (
                        <div key={fund.id} className="p-3 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{fund.name}</span>
                            <Badge variant="outline" className={`${
                              fund.impact >= 70 ? "text-red-400 border-red-400/50" :
                              fund.impact >= 40 ? "text-amber-400 border-amber-400/50" :
                              "text-emerald-400 border-emerald-400/50"
                            }`}>
                              {fund.impact}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>예상 손실: <span className="text-red-400">{fund.lossAmount}억</span></span>
                            <span>전파확률: {(fund.probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* 종합 요약 탭 */}
              <TabsContent value="summary" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      영향 범위 요약
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                        <div className="text-3xl font-bold text-red-400">{result.summary.totalExposure}억</div>
                        <div className="text-xs text-zinc-400 mt-1">총 예상 손실</div>
                      </div>
                      <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                        <div className="text-3xl font-bold text-amber-400">{result.summary.directImpact}억</div>
                        <div className="text-xs text-zinc-400 mt-1">직접 손실</div>
                      </div>
                      <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-400">{result.summary.indirectImpact}억</div>
                        <div className="text-xs text-zinc-400 mt-1">간접 손실</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-amber-400">{result.summary.affectedProjects}</div>
                        <div className="text-xs text-zinc-400">프로젝트</div>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{result.summary.affectedTranches}</div>
                        <div className="text-xs text-zinc-400">트랜치</div>
                      </div>
                      <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">{result.summary.affectedFunds}</div>
                        <div className="text-xs text-zinc-400">펀드</div>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <div className="text-2xl font-bold">{result.summary.maxPropagationLevel}</div>
                        <div className="text-xs text-zinc-400">전파 단계</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-red-500/10 border-red-500/30 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-400" />
                      AI 종합 분석
                    </h3>
                    <div className="space-y-4 text-sm text-zinc-300">
                      <p>
                        <strong className="text-red-400">{result.company?.name}</strong> 부도 시, 
                        총 <strong className="text-red-400">{result.summary.totalExposure}억원</strong>의 
                        손실이 예상됩니다.
                      </p>
                      <p>
                        책임준공 관계를 통해 <strong>{result.summary.affectedProjects}개 프로젝트</strong>에 
                        직접 영향을 미치며, 평균 전파율 <strong>{(result.summary.avgTransmissionRate * 100).toFixed(0)}%</strong>로 
                        <strong className="text-purple-400"> {result.summary.affectedFunds}개 펀드</strong>까지 영향이 확산됩니다.
                      </p>
                      <p>
                        특히 <strong className="text-amber-400">중순위/후순위 트랜치</strong>의 손실 비중이 높아
                        해당 트랜치 보유 펀드에 대한 선제적 리스크 관리가 필요합니다.
                      </p>
                      <div className="pt-4 border-t border-red-500/30">
                        <div className="font-semibold text-red-400 mb-2">권고 조치</div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400">
                          <li>관련 프로젝트 책임준공 보증 점검</li>
                          <li>대체 시공사 선정 방안 사전 검토</li>
                          <li>트랜치별 손실 시나리오 업데이트</li>
                          <li>투자자(LP) 사전 커뮤니케이션 준비</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 p-12">
              <div className="text-center">
                <TrendingDown className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">시뮬레이션 대기 중</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  부도 시나리오를 선택하고 시뮬레이션을 실행하면<br />
                  연쇄 전파 경로, 원인 분석, 임팩트 상세를 확인할 수 있습니다.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
