"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Lightbulb, TrendingDown, CheckCircle2, Clock, Users, BarChart3, Sparkles } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { SolutionDetailDialog } from "./solution-detail-dialog"
import { useState } from "react"

interface IssueDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  issue: {
    id: string
    title: string
    severity: string
    date: string
  }
}

export function IssueDetailDialog({ isOpen, onClose, issue }: IssueDetailDialogProps) {
  const [selectedSolution, setSelectedSolution] = useState<any>(null)
  const [isSolutionDialogOpen, setIsSolutionDialogOpen] = useState(false)

  // 이슈 영향도 데이터
  const impactData = [
    { date: "1주전", LTV: 62, DSCR: 1.45 },
    { date: "6일전", LTV: 65, DSCR: 1.38 },
    { date: "5일전", LTV: 68, DSCR: 1.30 },
    { date: "4일전", LTV: 72, DSCR: 1.22 },
    { date: "3일전", LTV: 75, DSCR: 1.15 },
    { date: "2일전", LTV: 78, DSCR: 1.08 },
    { date: "어제", LTV: 80, DSCR: 1.02 },
  ]

  // 근본 원인 분석
  const rootCauses = [
    {
      category: "시공사 재무 악화",
      probability: 75,
      description: "주력 시공사의 신용등급 하락 및 유동성 위기",
      evidence: ["신용등급 A- → BBB+로 하락", "최근 3개월 영업현금흐름 적자 전환", "단기차입금 급증 (전년대비 45%)"],
    },
    {
      category: "분양률 하락",
      probability: 55,
      description: "주변 경쟁 단지 공급 증가로 인한 분양 지연",
      evidence: ["분양률 85% → 72%로 하락", "반경 2km 내 3개 경쟁 단지 분양 중", "계약 취소율 8% 발생"],
    },
    {
      category: "금리 인상",
      probability: 40,
      description: "기준금리 인상에 따른 이자 부담 증가",
      evidence: ["대출금리 연 4.5% → 6.2%로 상승", "DSCR 산정 시 이자비용 38% 증가", "재융자 조건 악화"],
    },
  ]

  // AI 추천 해결방안
  const solutions = [
    {
      priority: "긴급",
      title: "시공사 신용보강 및 책임준공 이행보증 강화",
      impact: "LTV 10%p 개선 예상",
      cost: "보증료 2억원",
      timeline: "2주",
      steps: [
        "시공사 재무상태 정밀 실사",
        "이행보증보험 증액 협의",
        "대주단 협의체 소집",
        "약정 조건 변경 협의",
      ],
      kpis: [
        { metric: "LTV", current: "80%", target: "70%", improvement: "10%p" },
        { metric: "신용위험", current: "높음", target: "중간", improvement: "1단계" },
      ],
    },
    {
      priority: "높음",
      title: "분양 촉진 마케팅 및 가격 조정 전략",
      impact: "분양률 15%p 개선 예상",
      cost: "마케팅비 5억원",
      timeline: "1개월",
      steps: [
        "시장 분석 및 경쟁력 평가",
        "분양가 조정 시뮬레이션",
        "마케팅 채널 다각화",
        "계약금 납부 조건 완화 검토",
      ],
      kpis: [
        { metric: "분양률", current: "72%", target: "87%", improvement: "15%p" },
        { metric: "DSCR", current: "1.02x", target: "1.25x", improvement: "0.23x" },
      ],
    },
    {
      priority: "중간",
      title: "대출 구조 재조정 및 금리 헷지",
      impact: "이자비용 연 8억원 절감",
      cost: "헷지비용 3억원",
      timeline: "3주",
      steps: [
        "금리 스왑 상품 검토",
        "대출 만기 구조 조정 협의",
        "추가 담보 제공 검토",
        "리파이낸싱 옵션 분석",
      ],
      kpis: [
        { metric: "이자비용", current: "연 32억", target: "연 24억", improvement: "25%" },
        { metric: "금리 변동성", current: "노출", target: "헷지", improvement: "리스크 차단" },
      ],
    },
  ]

  const handleViewSolutionDetail = (solution: any) => {
    setSelectedSolution(solution)
    setIsSolutionDialogOpen(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              리스크 이슈 상세 분석
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(85vh-100px)] pr-4">
            <div className="space-y-4">
              {/* 이슈 기본 정보 */}
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          issue.severity === "높음" ? "destructive" : issue.severity === "중간" ? "default" : "outline"
                        }
                      >
                        {issue.severity}
                      </Badge>
                      <span className="text-sm text-zinc-400">{issue.date}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{issue.title}</h3>
                  </div>
                  <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                    모니터링 중
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs text-zinc-400">가치 영향</p>
                      <p className="text-sm font-semibold">-18% 하락 위험</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <div>
                      <p className="text-xs text-zinc-400">발생 기간</p>
                      <p className="text-sm font-semibold">7일</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs text-zinc-400">담당팀</p>
                      <p className="text-sm font-semibold">리스크관리팀</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 영향도 트렌드 */}
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  LTV / DSCR 추이
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={impactData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" stroke="#a1a1aa" style={{ fontSize: "11px" }} />
                    <YAxis yAxisId="left" stroke="#ef4444" style={{ fontSize: "11px" }} domain={[50, 90]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" style={{ fontSize: "11px" }} domain={[0.8, 1.6]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46", borderRadius: "6px" }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="LTV" stroke="#ef4444" strokeWidth={2} name="LTV (%)" />
                    <Line yAxisId="right" type="monotone" dataKey="DSCR" stroke="#22c55e" strokeWidth={2} name="DSCR (배)" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Tabs defaultValue="diagnosis" className="w-full">
                <TabsList className="bg-zinc-800">
                  <TabsTrigger value="diagnosis">근본 원인 진단</TabsTrigger>
                  <TabsTrigger value="solutions">해결 방안</TabsTrigger>
                </TabsList>

                {/* 근본 원인 진단 */}
                <TabsContent value="diagnosis" className="space-y-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-sm text-zinc-400">AI 기반 다차원 원인 분석 결과</p>
                  </div>

                  {rootCauses.map((cause, index) => (
                    <Card key={index} className="bg-zinc-800/50 border-zinc-700 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{cause.category}</h4>
                            <Badge variant={cause.probability > 60 ? "destructive" : "outline"}>
                              확률 {cause.probability}%
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-300 mb-3">{cause.description}</p>
                        </div>
                      </div>
                      <div className="bg-zinc-900 rounded p-3">
                        <p className="text-xs font-semibold text-zinc-400 mb-2">근거 데이터:</p>
                        <ul className="space-y-1">
                          {cause.evidence.map((item, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                {/* 해결 방안 */}
                <TabsContent value="solutions" className="space-y-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm text-zinc-400">우선순위별 대응 방안</p>
                  </div>

                  {solutions.map((solution, index) => (
                    <Card key={index} className="bg-zinc-800/50 border-zinc-700 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                solution.priority === "긴급"
                                  ? "destructive"
                                  : solution.priority === "높음"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {solution.priority}
                            </Badge>
                            <h4 className="font-semibold">{solution.title}</h4>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <span className="text-zinc-400">예상 효과:</span>
                              <span className="ml-1 text-green-400">{solution.impact}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">비용:</span>
                              <span className="ml-1 font-mono">{solution.cost}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">소요 시간:</span>
                              <span className="ml-1">{solution.timeline}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 실행 단계 */}
                      <div className="bg-zinc-900 rounded p-3 mb-3">
                        <p className="text-xs font-semibold text-zinc-400 mb-2">실행 단계:</p>
                        <ol className="space-y-2">
                          {solution.steps.map((step, idx) => (
                            <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-semibold">
                                {idx + 1}
                              </span>
                              <span className="mt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* KPI 개선 예측 */}
                      <div className="bg-zinc-900 rounded p-3">
                        <p className="text-xs font-semibold text-zinc-400 mb-2">예상 지표 개선:</p>
                        <div className="space-y-2">
                          {solution.kpis.map((kpi, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">{kpi.metric}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-red-400">{kpi.current}</span>
                                <span className="text-zinc-600">→</span>
                                <span className="font-mono text-green-400">{kpi.target}</span>
                                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                                  +{kpi.improvement}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" />이 방안 실행
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleViewSolutionDetail(solution)}
                        >
                          상세 계획 보기
                        </Button>
                      </div>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 상세 계획 보기 다이얼로그 */}
      {selectedSolution && (
        <SolutionDetailDialog
          isOpen={isSolutionDialogOpen}
          onClose={() => setIsSolutionDialogOpen(false)}
          solution={selectedSolution}
        />
      )}
    </>
  )
}
