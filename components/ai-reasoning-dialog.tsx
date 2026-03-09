"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Network, CheckCircle2, AlertTriangle, Zap } from "lucide-react"

interface AIReasoningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIReasoningDialog({ open, onOpenChange }: AIReasoningDialogProps) {
  const reasoningSteps = [
    {
      step: 1,
      title: "온톨로지 객체 분석",
      objects: ["송도 복합개발 PF", "선순위 트랜치 A", "한국건설 (시공사)"],
      description: "3개 핵심 객체의 관계와 속성을 분석했습니다.",
      confidence: 95,
      ontologyContext: "프로젝트-트랜치-회사 간 의존 관계를 온톨로지 그래프에서 추출",
    },
    {
      step: 2,
      title: "가치평가 로직 실행",
      rules: [
        "공정률 80% 이상 프로젝트는 DCF 모델 적용",
        "LTV 70% 초과 시 리스크 경고",
        "DSCR 1.2 미만 시 약정 위반 경고",
      ],
      description: "온톨로지에 정의된 3개의 평가 로직이 자동으로 적용되었습니다.",
      confidence: 88,
      kineticNote: "객체에 결합된 함수가 자동 실행되어 실시간 가치평가 수행",
    },
    {
      step: 3,
      title: "리스크 제약 확인",
      constraints: [
        "선순위 트랜치 LTV 68.5% (임계치 70% 근접)",
        "시공사 신용등급 A- (안정적)",
        "분양률 45% (목표 대비 -15%p)",
      ],
      description: "온톨로지 관계를 통해 리스크 요인을 탐색하고 대안을 식별했습니다.",
      confidence: 92,
      safetyNote: "온톨로지 가드레일로 환각 없이 실제 투자 데이터 기반 추론",
    },
    {
      step: 4,
      title: "실행 가능 액션 생성",
      actions: ["담보 추가 확보 요청", "분양가 조정 검토", "시공사 지급보증 한도 증액"],
      description: "온톨로지에 정의된 액션 타입을 기반으로 실행 가능한 조치를 생성했습니다.",
      confidence: 90,
      kineticNote: "각 액션은 투자 심의 시스템에 Write-back 가능한 트랜잭션으로 변환됨",
    },
    {
      step: 5,
      title: "최종 권장사항",
      recommendation: "옵션 B: 담보 추가 확보 + 분양 마케팅 강화",
      impact: "LTV -5.2%p / 분양률 +12%p 예상 / 리스크 등급 BBB+ → A-",
      confidence: 90,
      feedbackNote: "실행 결과는 온톨로지에 기록되어 향후 모델 학습에 활용됨",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-6 h-6 text-purple-400" />
            AI 가치평가 추론 과정
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            온톨로지 기반으로 AI가 어떻게 대체투자 자산을 분석하고 의사결정을 내렸는지 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-blue-500/10 border-blue-500/30 p-4 mt-4">
          <div className="flex items-start gap-3">
            <Network className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-1">온톨로지 기반 AI 가치평가 원리</h3>
              <p className="text-xs text-zinc-300">
                AI는 온톨로지를 통해 대체투자 자산의 구조, 관계, 허용된 평가 범위를 이해합니다. 이는 AI가
                환각(Hallucination) 없이 실제 투자 데이터에 기반하여 추론하고 제안할 수 있게 하는 가드레일 역할을 합니다.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 mt-4">
          {reasoningSteps.map((step, index) => (
            <Card key={index} className="bg-zinc-800/50 border-zinc-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm">
                    {step.step}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500">
                  신뢰도 {step.confidence}%
                </Badge>
              </div>

              <p className="text-sm text-zinc-400 mb-3">{step.description}</p>

              {step.objects && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Network className="w-3 h-3" />
                    참조된 온톨로지 객체:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.objects.map((obj, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                        {obj}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {step.rules && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    적용된 평가 규칙:
                  </div>
                  <ul className="space-y-1 text-xs">
                    {step.rules.map((rule, i) => (
                      <li key={i} className="text-zinc-300 flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.constraints && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    확인된 리스크 요인:
                  </div>
                  <ul className="space-y-1 text-xs">
                    {step.constraints.map((constraint, i) => (
                      <li key={i} className="text-zinc-300 flex items-start gap-2">
                        <span className="text-yellow-400">⚠</span>
                        {constraint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.actions && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    생성된 액션:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.actions.map((action, i) => (
                      <Badge key={i} variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {step.recommendation && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded mb-3">
                  <div className="text-xs text-green-400 font-semibold mb-1">추천 솔루션</div>
                  <div className="text-sm text-white mb-2">{step.recommendation}</div>
                  <div className="text-xs text-zinc-400">{step.impact}</div>
                </div>
              )}

              {step.ontologyContext && (
                <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-300">
                  <strong>의미론적 계층:</strong> {step.ontologyContext}
                </div>
              )}
              {step.kineticNote && (
                <div className="mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded text-xs text-green-300">
                  <strong>키네틱 계층:</strong> {step.kineticNote}
                </div>
              )}
              {step.safetyNote && (
                <div className="mt-2 p-2 bg-purple-500/5 border border-purple-500/20 rounded text-xs text-purple-300">
                  <strong>AI 안전성:</strong> {step.safetyNote}
                </div>
              )}
              {step.feedbackNote && (
                <div className="mt-2 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded text-xs text-cyan-300">
                  <strong>피드백 루프:</strong> {step.feedbackNote}
                </div>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
