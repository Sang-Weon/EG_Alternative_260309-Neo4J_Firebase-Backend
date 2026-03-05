"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  AlertTriangle, 
  Building2, 
  ArrowRight,
  TrendingDown,
  Landmark,
  Users
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

const sampleCompanies = [
  { id: "taeyoung", name: "태영건설", rating: "BB-", pd: 3.5 },
  { id: "lotte", name: "롯데건설", rating: "BBB", pd: 0.3 },
  { id: "gs", name: "GS건설", rating: "A-", pd: 0.1 },
  { id: "hyundai", name: "현대건설", rating: "A", pd: 0.08 },
]

export function CascadeDefaultSimulator() {
  const { toast } = useToast()
  const [selectedCompany, setSelectedCompany] = useState<string>("taeyoung")
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const company = sampleCompanies.find(c => c.id === selectedCompany)

  const handleSimulation = async () => {
    if (!company) return
    
    setIsSimulating(true)
    try {
      const simResult = await AIPLogic.simulateScenario(
        `${company.name} 연쇄부도 시뮬레이션`,
        {
          triggerCompanyName: company.name,
          triggerCompanyRating: company.rating
        }
      )
      setResult(simResult)
      toast({
        title: "시뮬레이션 완료",
        description: simResult.recommendation,
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
          <p className="text-sm text-zinc-400 mt-1">시공사/시행사 부도 시 포트폴리오 영향 분석</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      {c.name} ({c.rating})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {company && (
              <div className="mt-6 space-y-3">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-2">선택된 회사</div>
                  <div className="text-xl font-bold">{company.name}</div>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline" className={`${
                      company.rating.startsWith("A") ? "text-emerald-400 border-emerald-400/50" :
                      company.rating.startsWith("BBB") ? "text-blue-400 border-blue-400/50" :
                      "text-amber-400 border-amber-400/50"
                    }`}>
                      {company.rating}
                    </Badge>
                    <span className="text-sm text-zinc-400">
                      PD: {company.pd}%
                    </span>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-red-400 mb-1">시나리오 경고</div>
                      <p className="text-zinc-300">
                        {company.name} 부도 발생 시 관련 프로젝트 및 트랜치에 대한 손실을 시뮬레이션합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 우측: 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* 시스템 리스크 요약 */}
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-lg font-semibold mb-4">시스템 리스크 요약</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <div className="text-xs text-zinc-400 mb-1">총 익스포저</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {result.result?.summary?.totalExposure?.toFixed(0) || "-"}억
                    </div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-4 text-center">
                    <div className="text-xs text-red-400 mb-1">예상 손실</div>
                    <div className="text-2xl font-bold text-red-400">
                      {result.result?.summary?.expectedLoss?.toFixed(0) || "-"}억
                    </div>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                    <div className="text-xs text-amber-400 mb-1">전염 계수</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {result.result?.summary?.contagionFactor 
                        ? (result.result.summary.contagionFactor * 100).toFixed(0) 
                        : "-"}%
                    </div>
                  </div>
                </div>
              </Card>

              {/* 영향받는 프로젝트 */}
              {result.result?.cascadeResult?.affectedProjects && (
                <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-purple-400" />
                    영향받는 프로젝트
                  </h3>
                  <div className="space-y-3">
                    {result.result.cascadeResult.affectedProjects.map((project: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${
                            project.impactType === "DIRECT" 
                              ? "text-red-400 border-red-400/50" 
                              : "text-amber-400 border-amber-400/50"
                          }`}>
                            {project.impactType === "DIRECT" ? "직접" : "간접"}
                          </Badge>
                          <span className="font-medium">{project.projectName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-red-400 font-mono">
                              -{project.estimatedLoss?.toFixed(0) || 0}억
                            </div>
                            <div className="text-xs text-zinc-500">
                              확률 {(project.probabilityOfImpact * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 펀드별 영향 */}
              {result.result?.cascadeResult?.fundImpacts && result.result.cascadeResult.fundImpacts.length > 0 && (
                <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    펀드별 영향
                  </h3>
                  <div className="space-y-3">
                    {result.result.cascadeResult.fundImpacts.map((fund: any, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{fund.fundName}</span>
                          <span className="text-sm text-red-400 font-mono">
                            -{fund.estimatedLoss?.toFixed(0) || 0}억
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>익스포저: {fund.totalExposure?.toFixed(0) || 0}억</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>포트폴리오 영향: {((fund.portfolioImpact || 0) * 100).toFixed(2)}%</span>
                        </div>
                        <Progress 
                          value={(fund.portfolioImpact || 0) * 100 * 10} 
                          className="h-1 mt-2 [&>div]:bg-red-500"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI 권고 */}
              <Card className="bg-red-500/10 border-red-500/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-red-400 mb-1">AI 리스크 분석</div>
                    <p className="text-zinc-300">{result.recommendation}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 p-12">
              <div className="text-center">
                <TrendingDown className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">시뮬레이션 대기 중</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  부도 시나리오를 선택하고 시뮬레이션을 실행하면 연쇄 영향을 분석합니다.
                  프로젝트별, 트랜치별, 펀드별 예상 손실을 확인할 수 있습니다.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
