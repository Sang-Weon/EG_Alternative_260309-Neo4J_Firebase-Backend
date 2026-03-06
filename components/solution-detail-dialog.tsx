"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Users, TrendingUp, CheckCircle2, Clock, DollarSign, AlertCircle, Target } from "lucide-react"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"

interface SolutionDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  solution: {
    priority: string
    title: string
    impact: string
    cost: string
    timeline: string
  }
}

export function SolutionDetailDialog({ isOpen, onClose, solution }: SolutionDetailDialogProps) {
  // 실행 일정 타임라인
  const timeline = [
    {
      phase: "분석",
      department: "가치평가팀",
      duration: "1일",
      tasks: ["리스크 지표 재점검", "시장 데이터 수집", "시나리오 분석 준비"],
      status: "완료",
    },
    {
      phase: "협의",
      department: "투자심사팀",
      duration: "1일",
      tasks: ["약정 조건 재검토", "채권자 협의 안건 준비", "내부 승인 절차"],
      status: "진행중",
    },
    {
      phase: "실행",
      department: "펀드운용팀 + 법무팀",
      duration: "2일",
      tasks: ["계약 수정안 작성", "이해관계자 합의", "서류 체결"],
      status: "대기",
    },
    {
      phase: "모니터링",
      department: "리스크관리팀",
      duration: "지속",
      tasks: ["지표 모니터링 강화", "조기경보 임계치 조정", "정기 보고 체계 구축"],
      status: "대기",
    },
  ]

  // 담당 부서별 역할
  const departments = [
    {
      name: "가치평가팀",
      role: "분석 주체",
      leader: "김철수 심사역",
      members: 3,
      responsibilities: ["DCF/NPV 재산정", "시나리오 분석", "공정가치 평가"],
    },
    {
      name: "리스크관리팀",
      role: "모니터링",
      leader: "이영희 팀장",
      members: 4,
      responsibilities: ["LTV/DSCR 모니터링", "조기경보 관리", "약정 위반 추적"],
    },
    {
      name: "투자심사팀",
      role: "의사결정",
      leader: "박민수 본부장",
      members: 5,
      responsibilities: ["투자 의사결정", "구조조정 승인", "Exit 전략 수립"],
    },
    {
      name: "법무팀",
      role: "지원",
      leader: "최지현 변호사",
      members: 2,
      responsibilities: ["계약서 검토", "법적 리스크 검토", "협상 지원"],
    },
  ]

  // KPI 연관성 분석 (방사형 차트)
  const kpiRadarData = [
    { kpi: "수익률", 현재: 72, 목표: 90, 개선후: 85 },
    { kpi: "리스크", 현재: 45, 목표: 80, 개선후: 75 },
    { kpi: "유동성", 현재: 68, 목표: 85, 개선후: 82 },
    { kpi: "담보가치", 현재: 78, 목표: 90, 개선후: 88 },
    { kpi: "신용등급", 현재: 65, 목표: 85, 개선후: 80 },
  ]

  // 효과 분석 데이터
  const effectAnalysis = [
    {
      category: "직접 효과",
      items: [
        { metric: "LTV 개선", value: "78% → 65%", impact: "담보 여유율 확보" },
        { metric: "DSCR 개선", value: "1.05x → 1.35x", impact: "원리금 상환 안정성 확보" },
        { metric: "예상손실 감소", value: "12억 → 5억", impact: "충당금 7억원 환입 가능" },
      ],
    },
    {
      category: "간접 효과",
      items: [
        { metric: "포트폴리오 안정성", value: "+15%", impact: "연쇄부도 리스크 차단" },
        { metric: "투자자 신뢰도", value: "+12%", impact: "LP 추가 출자 가능성" },
        { metric: "시장 평판", value: "개선", impact: "향후 딜 소싱 유리" },
      ],
    },
  ]

  // 리스크 및 제약사항
  const risks = [
    { level: "높음", description: "시공사 추가 지원 불가 시 프로젝트 지연 가능성", mitigation: "대체 시공사 후보 사전 확보" },
    { level: "중간", description: "금리 인상 시 재융자 조건 악화 가능성", mitigation: "금리 헷지 상품 검토" },
    { level: "낮음", description: "담보 재평가 시 가치 하락 가능성", mitigation: "보수적 시나리오 반영" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-400" />
            상세 실행 계획
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)] pr-4">
          <div className="space-y-4">
            {/* 계획 개요 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={solution.priority === "긴급" ? "destructive" : "default"}>
                      {solution.priority}
                    </Badge>
                    <h3 className="text-lg font-semibold">{solution.title}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <div>
                        <p className="text-xs text-zinc-400">예상 효과</p>
                        <p className="text-sm font-semibold text-green-400">{solution.impact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-400" />
                      <div>
                        <p className="text-xs text-zinc-400">소요 비용</p>
                        <p className="text-sm font-semibold">{solution.cost}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs text-zinc-400">소요 기간</p>
                        <p className="text-sm font-semibold">{solution.timeline}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 실행 일정 타임라인 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                단계별 실행 일정
              </h3>
              <div className="space-y-3">
                {timeline.map((phase, index) => (
                  <div key={index} className="relative">
                    {index !== timeline.length - 1 && (
                      <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-zinc-700" />
                    )}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            phase.status === "완료"
                              ? "bg-green-500/20 text-green-400"
                              : phase.status === "진행중"
                                ? "bg-blue-500/20 text-blue-400 animate-pulse"
                                : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          {phase.status === "완료" ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-semibold">{index + 1}</span>
                          )}
                        </div>
                      </div>
                      <Card className="flex-1 bg-zinc-900 border-zinc-700 p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{phase.phase}</h4>
                              <Badge variant="outline" className="text-xs">
                                {phase.duration}
                              </Badge>
                              <Badge
                                variant={
                                  phase.status === "완료"
                                    ? "default"
                                    : phase.status === "진행중"
                                      ? "default"
                                      : "outline"
                                }
                                className={
                                  phase.status === "완료"
                                    ? "bg-green-500/20 border-green-500/30 text-green-400"
                                    : phase.status === "진행중"
                                      ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                                      : ""
                                }
                              >
                                {phase.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              담당: {phase.department}
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-1 mt-2">
                          {phase.tasks.map((task, idx) => (
                            <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 담당 부서 및 역할 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                담당 부서 및 책임
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {departments.map((dept, index) => (
                  <Card key={index} className="bg-zinc-900 border-zinc-700 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{dept.name}</h4>
                        <p className="text-xs text-zinc-400">{dept.role}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {dept.members}명
                      </Badge>
                    </div>
                    <div className="bg-zinc-800 rounded p-2 mb-2">
                      <p className="text-xs text-zinc-400">책임자</p>
                      <p className="text-sm font-semibold">{dept.leader}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">주요 책임:</p>
                      <ul className="space-y-0.5">
                        {dept.responsibilities.map((resp, idx) => (
                          <li key={idx} className="text-xs text-zinc-300 flex items-start gap-1">
                            <span className="text-purple-400">→</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* KPI 연관성 분석 */}
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  투자 지표 영향 분석
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={kpiRadarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="kpi" stroke="#a1a1aa" style={{ fontSize: "11px" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#52525b" style={{ fontSize: "10px" }} />
                    <Radar name="현재" dataKey="현재" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    <Radar name="개선 후" dataKey="개선후" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    <Radar
                      name="목표"
                      dataKey="목표"
                      stroke="#3b82f6"
                      fill="none"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      iconType="circle"
                      formatter={(value) => <span style={{ color: "#a1a1aa" }}>{value}</span>}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* 효과 분석 */}
              <Card className="bg-zinc-800/50 border-zinc-700 p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  기대 효과 분석
                </h3>
                <div className="space-y-3">
                  {effectAnalysis.map((category, index) => (
                    <div key={index}>
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2">{category.category}</h4>
                      <div className="space-y-2">
                        {category.items.map((item, idx) => (
                          <Card key={idx} className="bg-zinc-900 border-zinc-700 p-2">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold">{item.metric}</span>
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400"
                              >
                                {item.value}
                              </Badge>
                            </div>
                            <p className="text-xs text-green-400">{item.impact}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 리스크 및 대응 방안 */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                리스크 및 대응 방안
              </h3>
              <div className="space-y-2">
                {risks.map((risk, index) => (
                  <Card key={index} className="bg-zinc-900 border-zinc-700 p-3">
                    <div className="flex items-start gap-3">
                      <Badge
                        variant={risk.level === "높음" ? "destructive" : risk.level === "중간" ? "default" : "outline"}
                        className="mt-0.5"
                      >
                        {risk.level}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-300 mb-2">{risk.description}</p>
                        <div className="bg-zinc-800 rounded p-2">
                          <p className="text-xs text-zinc-400 mb-1">대응 방안:</p>
                          <p className="text-xs text-blue-400">{risk.mitigation}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* 액션 버튼 */}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                실행 계획 승인
              </Button>
              <Button variant="outline" className="bg-transparent">
                PDF로 내보내기
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
