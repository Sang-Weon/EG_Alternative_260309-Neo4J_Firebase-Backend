"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown,
  Shield,
  FileWarning,
  RefreshCw
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

interface CovenantItem {
  id: string
  projectName: string
  type: string
  threshold: number
  currentValue: number
  direction: "above" | "below"
  status: "정상" | "주의" | "위반"
  breachCount: number
}

const sampleCovenants: CovenantItem[] = [
  { id: "cov-1", projectName: "강남 오피스 PF", type: "LTV", threshold: 70, currentValue: 72, direction: "below", status: "위반", breachCount: 1 },
  { id: "cov-2", projectName: "강남 오피스 PF", type: "DSCR", threshold: 1.2, currentValue: 1.15, direction: "above", status: "주의", breachCount: 0 },
  { id: "cov-3", projectName: "판교 물류센터", type: "LTV", threshold: 70, currentValue: 58, direction: "below", status: "정상", breachCount: 0 },
  { id: "cov-4", projectName: "판교 물류센터", type: "DSCR", threshold: 1.2, currentValue: 1.52, direction: "above", status: "정상", breachCount: 0 },
  { id: "cov-5", projectName: "B737 리스", type: "DSCR", threshold: 1.1, currentValue: 1.05, direction: "above", status: "위반", breachCount: 2 },
  { id: "cov-6", projectName: "인천 주상복합", type: "분양률", threshold: 60, currentValue: 52, direction: "above", status: "위반", breachCount: 1 },
]

const riskScoreData = [
  { project: "강남 오피스 PF", score: 62, factors: ["LTV 초과", "DSCR 경고"] },
  { project: "B737 리스", score: 78, factors: ["DSCR 위반", "임차인 신용 하락"] },
  { project: "인천 주상복합", score: 55, factors: ["분양률 미달"] },
  { project: "판교 물류센터", score: 25, factors: [] },
  { project: "영암 태양광", score: 18, factors: [] },
]

export function RiskCovenantMonitor() {
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)

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
            </div>
            <div className="divide-y divide-zinc-800">
              {sampleCovenants.map((covenant) => {
                const progress = covenant.direction === "below" 
                  ? (covenant.currentValue / covenant.threshold) * 100
                  : (covenant.threshold / covenant.currentValue) * 100
                
                return (
                  <div key={covenant.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
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
                          <div className="text-xs text-zinc-400">{covenant.type} 약정</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm">
                            <span className={`font-mono font-bold ${
                              covenant.status === "정상" ? "text-emerald-400" :
                              covenant.status === "주의" ? "text-amber-400" : "text-red-400"
                            }`}>
                              {covenant.type === "LTV" || covenant.type === "분양률" 
                                ? `${covenant.currentValue}%` 
                                : `${covenant.currentValue}x`}
                            </span>
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
                      </div>
                    </div>
                    {covenant.breachCount > 0 && (
                      <div className="text-xs text-red-400 mt-1 ml-8">
                        누적 위반 {covenant.breachCount}회
                      </div>
                    )}
                  </div>
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
    </div>
  )
}
