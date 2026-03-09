"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, Database, Brain, Zap } from "lucide-react"

export function FeedbackLoopViewer() {
  const loopStages = [
    {
      stage: "데이터 수집",
      icon: Database,
      color: "text-blue-400",
      description: "투자정보시스템, 시장데이터, 신용평가 등에서 실시간 데이터 수집",
      examples: ["투자 실적", "시장 가격", "신용등급 변동", "약정 모니터링"],
    },
    {
      stage: "온톨로지 매핑",
      icon: RefreshCw,
      color: "text-purple-400",
      description: "Raw 데이터를 대체투자 객체로 변환",
      examples: ["펀드-프로젝트 관계 연결", "트랜치 구조화", "담보-약정 매핑"],
    },
    {
      stage: "AI 분석 & 추론",
      icon: Brain,
      color: "text-yellow-400",
      description: "온톨로지 기반으로 AI가 가치평가 및 리스크 추론",
      examples: ["DCF/NPV 분석", "리스크 조기경보", "연쇄부도 시뮬레이션"],
    },
    {
      stage: "의사결정 & 액션",
      icon: Zap,
      color: "text-green-400",
      description: "투자위원회 승인 후 액션을 실제 시스템에 반영",
      examples: ["투자 승인/거절", "포트폴리오 재조정", "리스크 헷지"],
    },
    {
      stage: "결과 기록 & 학습",
      icon: TrendingUp,
      color: "text-cyan-400",
      description: "실행 결과를 데이터로 기록하여 AI 재학습",
      examples: ["투자 성과 측정", "모델 정확도 개선", "평가 규칙 업데이트"],
    },
  ]

  return (
    <Card className="bg-zinc-900 border-zinc-800 p-6">
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="w-6 h-6 text-cyan-400" />
        <h2 className="text-xl font-bold">가치평가 피드백 루프</h2>
        <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500 ml-2">
          지속적 학습 및 최적화
        </Badge>
      </div>

      <p className="text-sm text-zinc-400 mb-6">
        투자 의사결정 결과가 다시 데이터로 기록되어 AI 평가 모델을 지속적으로 개선하는 순환 구조입니다.
      </p>

      <div className="space-y-4">
        {loopStages.map((stage, index) => (
          <div key={index} className="relative">
            <Card className="bg-zinc-800/50 border-zinc-700 p-4 hover:bg-zinc-800 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                    <stage.icon className={`w-6 h-6 ${stage.color}`} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{stage.stage}</h3>
                    <Badge variant="outline" className="text-xs">
                      단계 {index + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">{stage.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {stage.examples.map((example, i) => (
                      <Badge key={i} variant="outline" className="bg-zinc-900/50 text-zinc-300 border-zinc-600 text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            {index < loopStages.length - 1 && (
              <div className="flex justify-center my-2">
                <div className="w-0.5 h-6 bg-gradient-to-b from-zinc-600 to-zinc-800" />
              </div>
            )}
          </div>
        ))}

        {/* 순환 표시 */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-2 text-sm text-cyan-400">
            <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />
            <span>지속적 순환 및 개선</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
