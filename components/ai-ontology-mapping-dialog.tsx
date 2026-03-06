"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Database,
  Network,
  CheckCircle2,
  Zap,
  Scale,
  Shield,
  TrendingUp,
  Loader2,
  Building2,
  Landmark,
  FileText,
  AlertTriangle,
  DollarSign,
} from "lucide-react"
import { OntologyService } from "@/lib/ontology-service"

interface AIOntologyMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

type Stage = "analyzing" | "constraints" | "mapping" | "validation" | "completed"

export function AIOntologyMappingDialog({ open, onOpenChange, onComplete }: AIOntologyMappingDialogProps) {
  const [stage, setStage] = useState<Stage>("analyzing")
  const [progress, setProgress] = useState(0)
  const [currentLog, setCurrentLog] = useState("")
  const [isFinishing, setIsFinishing] = useState(false)

  useEffect(() => {
    if (!open) return

    setStage("analyzing")
    setProgress(0)
    setCurrentLog("")
    setIsFinishing(false)

    // Stage 1: 데이터 분석 (대체투자 자산 데이터 스캔)
    const timer1 = setTimeout(() => {
      setStage("analyzing")
      setProgress(15)
      setCurrentLog("이지자산평가 대체투자 포트폴리오 데이터 스캔 중...")
    }, 500)

    const timer2 = setTimeout(() => {
      setProgress(25)
      setCurrentLog("PF/부동산/인프라/항공기/신재생에너지 자산 분류 분석 중...")
    }, 1500)

    // Stage 2: 제약조건 및 규제 (투자 규제 및 약정)
    const timer3 = setTimeout(() => {
      setStage("constraints")
      setProgress(35)
      setCurrentLog("금융감독원 대체투자 규제 가이드라인 검토 중...")
    }, 2800)

    const timer4 = setTimeout(() => {
      setProgress(45)
      setCurrentLog("펀드별 투자한도 및 약정(Covenant) 조건 매핑 중...")
    }, 3800)

    const timer5 = setTimeout(() => {
      setProgress(55)
      setCurrentLog("LTV/DSCR/ICR 리스크 지표 제약조건 반영 중...")
    }, 4800)

    // Stage 3: 온톨로지 매핑 (대체투자 객체 모델링)
    const timer6 = setTimeout(() => {
      setStage("mapping")
      setProgress(60)
      setCurrentLog("대체투자 비즈니스 객체(Company, Project, Tranche) 추출 중...")
    }, 5800)

    const timer7 = setTimeout(() => {
      setProgress(70)
      setCurrentLog("가치평가, 리스크, 수익률 속성(Property) 정의 중...")
    }, 6800)

    const timer8 = setTimeout(() => {
      setProgress(80)
      setCurrentLog("시공사-프로젝트-트랜치-펀드 관계(Link) 매핑 중...")
    }, 7800)

    // Stage 4: 검증
    const timer9 = setTimeout(() => {
      setStage("validation")
      setProgress(90)
      setCurrentLog("온톨로지 데이터 무결성 검증 중...")
    }, 8800)

    const timer10 = setTimeout(() => {
      setProgress(95)
      setCurrentLog("포트폴리오 내 자산 간 연쇄부도 경로 정합성 확인 중...")
    }, 9500)

    // Stage 5: 완료
    const timer11 = setTimeout(() => {
      setStage("completed")
      setProgress(100)
      setCurrentLog("이지자산평가 대체투자 온톨로지 매핑 완료!")
    }, 10500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearTimeout(timer5)
      clearTimeout(timer6)
      clearTimeout(timer7)
      clearTimeout(timer8)
      clearTimeout(timer9)
      clearTimeout(timer10)
      clearTimeout(timer11)
    }
  }, [open])

  const handleComplete = async () => {
    setIsFinishing(true)
    try {
      await OntologyService.seedInitialData()

      onComplete?.()

      setTimeout(() => {
        onOpenChange(false)
        setIsFinishing(false)
      }, 800)
    } catch (error) {
      console.error("Critical error during seeding:", error)
      alert("데이터 생성 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")
      setIsFinishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-6 h-6 text-purple-400" />
            AI 온톨로지 자동 매핑 (이지자산평가 대체투자)
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            이지자산평가의 대체투자 자산(PF, 부동산, 인프라, 항공기, 신재생에너지)을 객체, 속성, 관계 기반으로 자동 모델링합니다
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-zinc-800/50 border-zinc-700 p-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{currentLog}</span>
              <span className="text-purple-400 font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>

        {/* 1단계: 데이터 분석 */}
        {(stage === "analyzing" || progress > 25) && (
          <Card className="bg-zinc-800/50 border-zinc-700 p-4">
            <div className="flex items-start gap-3 mb-3">
              <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-400 mb-2">1단계: 대체투자 데이터 소스 스캔</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">투자정보시스템 (펀드/프로젝트 마스터 데이터)</span>
                    {progress >= 15 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">자산유형별 포트폴리오 (PF/부동산/인프라/항공기/신재생)</span>
                    {progress >= 25 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 2단계: 제약조건 평가 */}
        {(stage === "constraints" || progress > 55) && (
          <Card className="bg-zinc-800/50 border-zinc-700 p-4">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-400 mb-2">2단계: 투자 규제 및 약정 제약조건</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-zinc-300">금융감독원 대체투자 규제</span>
                      {progress >= 35 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">투자한도</Badge>
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">적격투자자</Badge>
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">공시의무</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-zinc-300">약정(Covenant) 조건</span>
                      {progress >= 45 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">LTV ≤ 70%</Badge>
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">DSCR ≥ 1.2x</Badge>
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">ICR ≥ 2.0x</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-zinc-300">리스크 지표 제약조건</span>
                      {progress >= 55 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-300">신용등급</Badge>
                      <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-300">PD/LGD</Badge>
                      <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-300">연쇄부도</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 3단계: 온톨로지 매핑 */}
        {(stage === "mapping" || progress > 80) && (
          <Card className="bg-zinc-800/50 border-zinc-700 p-4">
            <div className="flex items-start gap-3 mb-3">
              <Network className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-400 mb-2">3단계: 대체투자 온톨로지 매핑</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-zinc-300">비즈니스 객체 (Objects)</span>
                      {progress >= 60 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 flex flex-wrap gap-2 mt-1">
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">Company</Badge>
                      <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">Project</Badge>
                      <Badge className="bg-orange-600/20 text-orange-300 border-orange-500/30">Tranche</Badge>
                      <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30">Fund</Badge>
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">Covenant</Badge>
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">Collateral</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-zinc-300">속성 (Properties)</span>
                      {progress >= 70 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 space-y-1 text-xs text-zinc-400">
                      <p>* 가치평가: fairValue, npv, irr, capRate, dcfValue</p>
                      <p>* 리스크: ltv, dscr, icr, pd, lgd, creditRating</p>
                      <p>* 수익률: couponRate, expectedReturn, actualReturn</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-zinc-300">관계 (Links)</span>
                      {progress >= 80 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="ml-6 space-y-1 text-xs text-zinc-400">
                      <p>* Company -[DEVELOPS]- Project</p>
                      <p>* Project -[HAS_TRANCHE]- Tranche</p>
                      <p>* Fund -[INVESTS_IN]- Tranche</p>
                      <p>* Project -[SECURED_BY]- Collateral</p>
                      <p>* Tranche -[BOUND_BY]- Covenant</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 4단계: 검증 */}
        {(stage === "validation" || progress >= 90) && stage !== "completed" && (
          <Card className="bg-zinc-800/50 border-zinc-700 p-4">
            <div className="flex items-start gap-3">
              <Landmark className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-cyan-400 mb-2">4단계: 데이터 무결성 검증</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">온톨로지 스키마 정합성 검증</span>
                    {progress >= 90 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">연쇄부도 전파 경로 그래프 검증</span>
                    {progress >= 95 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {stage === "completed" && (
          <Card className="bg-green-500/10 border-green-500/30 p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-400 mb-2">매핑 완료! (이지자산평가 대체투자)</h3>
                <p className="text-sm text-zinc-300 mb-3">
                  대체투자 자산 가치평가 비즈니스 로직이 성공적으로 온톨로지로 변환되었습니다.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">12</div>
                    <div className="text-xs text-zinc-500">Objects</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">48</div>
                    <div className="text-xs text-zinc-500">Properties</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">15</div>
                    <div className="text-xs text-zinc-500">Links</div>
                  </div>
                </div>
                <Button
                  onClick={handleComplete}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isFinishing}
                >
                  {isFinishing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 온톨로지 데이터 구축 중...</>
                  ) : (
                    "온톨로지 데이터 적용 및 대시보드 확인"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
