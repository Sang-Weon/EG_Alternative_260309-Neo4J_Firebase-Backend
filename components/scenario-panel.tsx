"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { SimulationEngineDialog } from "@/components/simulation-engine-dialog"

interface ScenarioPanelProps {
  onExecute: (option: string) => void
}

export function ScenarioPanel({ onExecute }: ScenarioPanelProps) {
  const [selectedOption, setSelectedOption] = useState("option1")
  const [showSimulation, setShowSimulation] = useState(false)

  const chartData = [
    {
      name: "현재",
      손실: 120,
      회수예상: 850,
    },
    {
      name: "옵션1",
      손실: 45,
      회수예상: 920,
    },
    {
      name: "옵션2",
      손실: 80,
      회수예상: 880,
    },
  ]

  const handleExecuteClick = () => {
    setShowSimulation(true)
  }

  const getOptionLabel = () => {
    return selectedOption === "option1" ? "옵션 1: 구조조정 & 추가 담보" : "옵션 2: 분할 매각"
  }

  return (
    <>
      <div className="w-full lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col max-h-screen overflow-auto">
        {/* 헤더 */}
        <div className="p-4 border-b border-zinc-800">
          <Badge variant="destructive" className="mb-2">
            <AlertTriangle className="w-3 h-3 mr-1" />
            긴급 알림
          </Badge>
          <h2 className="font-semibold text-base lg:text-lg mb-1">약정 위반 경고</h2>
          <p className="text-xs lg:text-sm text-zinc-400">송도 PF 프로젝트 LTV 80% 초과</p>
        </div>

        {/* 시나리오 옵션 */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          <div>
            <h3 className="text-sm font-semibold mb-3">대응 시나리오 선택</h3>
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              <Card
                className={`p-4 mb-3 cursor-pointer transition-colors ${
                  selectedOption === "option1" ? "bg-blue-500/20 border-blue-500" : "bg-zinc-800/50 border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="option1" id="option1" className="mt-1" />
                  <Label htmlFor="option1" className="cursor-pointer flex-1">
                    <div className="font-semibold text-sm mb-1">옵션 1: 구조조정 & 추가 담보</div>
                    <p className="text-xs text-zinc-400 mb-2">시공사 신용보강 + 담보 추가 설정</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/50">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        회수율 +8%
                      </Badge>
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/50">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        비용 45억
                      </Badge>
                    </div>
                  </Label>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-colors ${
                  selectedOption === "option2" ? "bg-blue-500/20 border-blue-500" : "bg-zinc-800/50 border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="option2" id="option2" className="mt-1" />
                  <Label htmlFor="option2" className="cursor-pointer flex-1">
                    <div className="font-semibold text-sm mb-1">옵션 2: 분할 매각</div>
                    <p className="text-xs text-zinc-400 mb-2">선순위 매각 + 후순위 손실 인식</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/50">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        회수율 -2%
                      </Badge>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/50">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        즉시 유동화
                      </Badge>
                    </div>
                  </Label>
                </div>
              </Card>
            </RadioGroup>
          </div>

          {/* 재무 영향 차트 */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              손익 영향 분석 (억원)
            </h3>
            <Card className="bg-zinc-800/50 border-zinc-700 p-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" stroke="#a1a1aa" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#a1a1aa" style={{ fontSize: "10px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => `${value}억원`}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="손실" fill="#ef4444" name="예상 손실" />
                  <Bar dataKey="회수예상" fill="#22c55e" name="회수 예상액" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* 실행 버튼 */}
          <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExecuteClick}>
            선택한 시나리오 실행
          </Button>
        </div>
      </div>

      {/* Simulation Engine Dialog */}
      <SimulationEngineDialog
        open={showSimulation}
        onOpenChange={setShowSimulation}
        selectedOption={getOptionLabel()}
      />
    </>
  )
}
