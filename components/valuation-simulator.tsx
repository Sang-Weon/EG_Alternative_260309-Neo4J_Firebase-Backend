"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Calculator, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

interface ValuationConfig {
  projectName: string
  assetType: string
  totalAmount: number
  currentValue: number
  completionRate: number
  presaleRate: number
  riskFreeRate: number
  discountPremium: number
  companyRating: string
}

export function ValuationSimulator() {
  const { toast } = useToast()
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const [config, setConfig] = useState<ValuationConfig>({
    projectName: "강남 오피스 PF",
    assetType: "PF_DEVELOPMENT",
    totalAmount: 2000,
    currentValue: 1800,
    completionRate: 45,
    presaleRate: 65,
    riskFreeRate: 3.5,
    discountPremium: 2.5,
    companyRating: "BBB"
  })

  const handleRunSimulation = async () => {
    setIsSimulating(true)
    try {
      const scenarioResult = await AIPLogic.simulateScenario(
        `${config.projectName} 가치평가`,
        {
          projectName: config.projectName,
          assetType: config.assetType,
          totalAmount: config.totalAmount,
          currentValue: config.currentValue,
          completionRate: config.completionRate / 100,
          presaleRate: config.presaleRate / 100,
          riskFreeRate: config.riskFreeRate / 100,
          marketPremium: config.discountPremium / 100,
          companyRating: config.companyRating
        }
      )
      setResult(scenarioResult)
      toast({
        title: "가치평가 완료",
        description: scenarioResult.recommendation,
      })
    } catch (error) {
      toast({
        title: "시뮬레이션 오류",
        description: "가치평가 시뮬레이션 중 오류가 발생했습니다.",
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
            <Calculator className="w-6 h-6 text-emerald-400" />
            자산 가치평가 시뮬레이터
          </h2>
          <p className="text-sm text-zinc-400 mt-1">DCF/NPV 기반 대체투자 자산 가치 산정</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700" 
          onClick={handleRunSimulation}
          disabled={isSimulating}
        >
          <Play className="w-4 h-4 mr-2" />
          {isSimulating ? "분석 중..." : "가치평가 실행"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 입력 파라미터 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 자산 기본 정보 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-4">자산 기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>프로젝트명</Label>
                <Input
                  value={config.projectName}
                  onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label>자산 유형</Label>
                <Select
                  value={config.assetType}
                  onValueChange={(value) => setConfig({ ...config, assetType: value })}
                >
                  <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="PF_DEVELOPMENT">PF 개발</SelectItem>
                    <SelectItem value="REAL_ESTATE">수익형 부동산</SelectItem>
                    <SelectItem value="INFRASTRUCTURE">인프라</SelectItem>
                    <SelectItem value="AIRCRAFT">항공기</SelectItem>
                    <SelectItem value="SHIP">선박</SelectItem>
                    <SelectItem value="RENEWABLE_ENERGY">신재생에너지</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>총 사업비 (억원)</Label>
                <Input
                  type="number"
                  value={config.totalAmount}
                  onChange={(e) => setConfig({ ...config, totalAmount: Number(e.target.value) })}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label>현재 가치 (억원)</Label>
                <Input
                  type="number"
                  value={config.currentValue}
                  onChange={(e) => setConfig({ ...config, currentValue: Number(e.target.value) })}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          </Card>

          {/* 프로젝트 진행 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-4">프로젝트 진행 현황</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>공정률 (%)</Label>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
                    {config.completionRate}%
                  </Badge>
                </div>
                <Slider
                  value={[config.completionRate]}
                  onValueChange={(value) => setConfig({ ...config, completionRate: value[0] })}
                  max={100}
                  step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>분양률 (%)</Label>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/50">
                    {config.presaleRate}%
                  </Badge>
                </div>
                <Slider
                  value={[config.presaleRate]}
                  onValueChange={(value) => setConfig({ ...config, presaleRate: value[0] })}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </Card>

          {/* 할인율 파라미터 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-4">할인율 파라미터</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>무위험 이자율 (%)</Label>
                  <Badge variant="outline">{config.riskFreeRate}%</Badge>
                </div>
                <Slider
                  value={[config.riskFreeRate]}
                  onValueChange={(value) => setConfig({ ...config, riskFreeRate: value[0] })}
                  min={1}
                  max={6}
                  step={0.25}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>리스크 프리미엄 (%)</Label>
                  <Badge variant="outline">{config.discountPremium}%</Badge>
                </div>
                <Slider
                  value={[config.discountPremium]}
                  onValueChange={(value) => setConfig({ ...config, discountPremium: value[0] })}
                  min={1}
                  max={8}
                  step={0.25}
                />
              </div>
              <div className="col-span-2">
                <Label>시공사/시행사 신용등급</Label>
                <Select
                  value={config.companyRating}
                  onValueChange={(value) => setConfig({ ...config, companyRating: value })}
                >
                  <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="AAA">AAA</SelectItem>
                    <SelectItem value="AA">AA</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="BBB">BBB</SelectItem>
                    <SelectItem value="BB">BB</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* 우측: 결과 패널 */}
        <div className="space-y-6">
          {result ? (
            <>
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-lg font-semibold mb-4">가치평가 결과</h3>
                <div className="space-y-4">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4">
                    <div className="text-xs text-zinc-400 mb-1">공정가치 (Fair Value)</div>
                    <div className="text-3xl font-bold text-emerald-400">
                      {result.result?.summary?.fairValue?.toFixed(0) || "-"}억
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                      <div className="text-xs text-zinc-400 mb-1">IRR</div>
                      <div className="text-xl font-bold text-blue-400">
                        {result.result?.summary?.irr ? (result.result.summary.irr * 100).toFixed(1) : "-"}%
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                      <div className="text-xs text-zinc-400 mb-1">NPV</div>
                      <div className="text-xl font-bold text-purple-400">
                        {result.result?.summary?.npv?.toFixed(0) || "-"}억
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 ${
                result.result?.summary?.irr >= 0.10 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <div className="flex items-start gap-3">
                  {result.result?.summary?.irr >= 0.10 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <div className={`font-semibold mb-1 ${
                      result.result?.summary?.irr >= 0.10 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      AI 투자 의견
                    </div>
                    <p className="text-zinc-300">{result.recommendation}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400 mb-2">가치평가 대기 중</h3>
                <p className="text-sm text-zinc-500">
                  파라미터를 입력하고 가치평가를 실행하세요.
                </p>
              </div>
            </Card>
          )}

          <Card className="bg-blue-500/10 border-blue-500/30 p-4">
            <div className="flex items-start gap-3">
              <Calculator className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-blue-400 mb-1">평가 방법론</div>
                <p className="text-zinc-300">
                  DCF(할인현금흐름) 모델 기반, 준공리스크 및 분양리스크 조정 반영
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
