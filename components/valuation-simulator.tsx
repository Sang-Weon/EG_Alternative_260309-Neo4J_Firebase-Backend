"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Play, 
  Calculator, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Settings2,
  Database,
  Link2,
  Plus,
  Sparkles,
  ChevronRight,
  Info,
  Layers
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

// ────────────────────────────────────────────────────────────────────────────
// 대체투자 가치평가 모델 정의
// ────────────────────────────────────────────────────────────────────────────
interface ValuationModel {
  id: string
  name: string
  description: string
  applicableAssets: string[]
  requiredParams: string[]
  optionalParams: string[]
  formula: string
}

const VALUATION_MODELS: ValuationModel[] = [
  {
    id: "dcf",
    name: "DCF (할인현금흐름)",
    description: "미래 현금흐름을 할인율로 현재가치화하여 자산가치 산정",
    applicableAssets: ["PF_DEVELOPMENT", "REAL_ESTATE", "INFRASTRUCTURE", "RENEWABLE_ENERGY"],
    requiredParams: ["cashFlows", "discountRate", "terminalValue"],
    optionalParams: ["growthRate", "capRate"],
    formula: "PV = Σ(CFt / (1+r)^t) + TV/(1+r)^n"
  },
  {
    id: "npv",
    name: "NPV (순현재가치)",
    description: "투자비용 대비 순수익의 현재가치 산정",
    applicableAssets: ["PF_DEVELOPMENT", "INFRASTRUCTURE", "RENEWABLE_ENERGY"],
    requiredParams: ["initialInvestment", "cashFlows", "discountRate"],
    optionalParams: ["reinvestmentRate"],
    formula: "NPV = -I₀ + Σ(CFt / (1+r)^t)"
  },
  {
    id: "irr",
    name: "IRR (내부수익률)",
    description: "NPV를 0으로 만드는 할인율 산출",
    applicableAssets: ["PF_DEVELOPMENT", "REAL_ESTATE", "INFRASTRUCTURE", "AIRCRAFT", "SHIP", "RENEWABLE_ENERGY"],
    requiredParams: ["initialInvestment", "cashFlows"],
    optionalParams: ["exitValue"],
    formula: "0 = -I₀ + Σ(CFt / (1+IRR)^t)"
  },
  {
    id: "cap_rate",
    name: "Cap Rate (자본환원율)",
    description: "순영업이익 대비 자산가치 비율로 평가",
    applicableAssets: ["REAL_ESTATE"],
    requiredParams: ["noi", "capRate"],
    optionalParams: ["vacancyRate", "opexRatio"],
    formula: "Value = NOI / Cap Rate"
  },
  {
    id: "replacement_cost",
    name: "대체원가법",
    description: "동일 자산을 새로 취득하는 데 필요한 비용 기준",
    applicableAssets: ["INFRASTRUCTURE", "AIRCRAFT", "SHIP"],
    requiredParams: ["replacementCost", "depreciation", "age"],
    optionalParams: ["obsolescence"],
    formula: "Value = RC × (1 - D)^age"
  },
  {
    id: "residual",
    name: "잔여법 (개발형)",
    description: "완공 후 예상가치에서 사업비를 차감하여 토지가치 산정",
    applicableAssets: ["PF_DEVELOPMENT"],
    requiredParams: ["gdv", "constructionCost", "developerProfit", "financeCost"],
    optionalParams: ["contingency", "marketingCost"],
    formula: "Land Value = GDV - CC - DP - FC"
  }
]

// ────────────────────────────────────────────────────────────────────────────
// 온톨로지 기반 파라미터 정의
// ────────────────────────────────────────────────────────────────────────────
interface OntologyParameter {
  id: string
  name: string
  nameKr: string
  type: "number" | "percentage" | "currency" | "rating" | "date"
  category: "project" | "company" | "tranche" | "market" | "risk"
  source: "ontology" | "manual" | "calculated"
  linkedObject?: string
  linkedProperty?: string
  defaultValue?: number
  unit?: string
  description: string
}

const ONTOLOGY_PARAMETERS: OntologyParameter[] = [
  // 프로젝트 관련
  { id: "totalAmount", name: "Total Investment", nameKr: "총 사업비", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "totalAmount", unit: "억원", description: "프로젝트 총 투자 금액" },
  { id: "currentValue", name: "Current Value", nameKr: "현재 가치", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "currentValue", unit: "억원", description: "현재 평가 가치" },
  { id: "completionRate", name: "Completion Rate", nameKr: "공정률", type: "percentage", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "completionRate", description: "공사 진행률" },
  { id: "presaleRate", name: "Presale Rate", nameKr: "분양률", type: "percentage", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "presaleRate", description: "분양 진행률" },
  { id: "occupancyRate", name: "Occupancy Rate", nameKr: "임대율", type: "percentage", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "occupancyRate", description: "임대 가동률" },
  
  // 회사 관련
  { id: "companyRating", name: "Credit Rating", nameKr: "신용등급", type: "rating", category: "company", source: "ontology", linkedObject: "Company", linkedProperty: "creditRating", description: "시공사/시행사 신용등급" },
  { id: "companyPD", name: "Default Probability", nameKr: "부도확률", type: "percentage", category: "company", source: "ontology", linkedObject: "Company", linkedProperty: "defaultProbability", description: "회사 부도 확률" },
  
  // 트랜치 관련
  { id: "seniorRatio", name: "Senior Ratio", nameKr: "선순위 비율", type: "percentage", category: "tranche", source: "ontology", linkedObject: "Tranche", linkedProperty: "ratio", description: "선순위 트랜치 비율" },
  { id: "interestRate", name: "Interest Rate", nameKr: "대출금리", type: "percentage", category: "tranche", source: "ontology", linkedObject: "Tranche", linkedProperty: "interestRate", description: "적용 금리" },
  
  // 시장/거시 관련
  { id: "riskFreeRate", name: "Risk-Free Rate", nameKr: "무위험이자율", type: "percentage", category: "market", source: "manual", defaultValue: 3.5, description: "국고채 금리 기준" },
  { id: "marketPremium", name: "Market Premium", nameKr: "시장 프리미엄", type: "percentage", category: "market", source: "manual", defaultValue: 5.0, description: "시장 위험 프리미엄" },
  { id: "inflationRate", name: "Inflation Rate", nameKr: "물가상승률", type: "percentage", category: "market", source: "manual", defaultValue: 2.5, description: "연간 물가상승률" },
  
  // 리스크 관련
  { id: "ltv", name: "LTV", nameKr: "담보인정비율", type: "percentage", category: "risk", source: "calculated", description: "Loan-to-Value Ratio" },
  { id: "dscr", name: "DSCR", nameKr: "원리금상환비율", type: "number", category: "risk", source: "calculated", description: "Debt Service Coverage Ratio" },
  { id: "constructionRisk", name: "Construction Risk", nameKr: "공사 리스크", type: "percentage", category: "risk", source: "manual", defaultValue: 15, description: "공사 지연/비용 초과 위험" },
  { id: "marketRisk", name: "Market Risk", nameKr: "시장 리스크", type: "percentage", category: "risk", source: "manual", defaultValue: 10, description: "분양/임대 시장 위험" },
]

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
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
  [key: string]: any
}

export function ValuationSimulator() {
  const { toast } = useToast()
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState<string>("dcf")
  const [showParamWizard, setShowParamWizard] = useState(false)
  const [activeParams, setActiveParams] = useState<string[]>([
    "totalAmount", "currentValue", "completionRate", "presaleRate", 
    "riskFreeRate", "discountPremium", "companyRating"
  ])
  const [customParams, setCustomParams] = useState<OntologyParameter[]>([])
  
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

  // 자산유형 변경 시 적합한 모델 자동 선택
  useEffect(() => {
    const applicableModels = VALUATION_MODELS.filter(m => 
      m.applicableAssets.includes(config.assetType)
    )
    if (applicableModels.length > 0 && !applicableModels.find(m => m.id === selectedModel)) {
      setSelectedModel(applicableModels[0].id)
    }
  }, [config.assetType])

  const currentModel = VALUATION_MODELS.find(m => m.id === selectedModel)
  const applicableModels = VALUATION_MODELS.filter(m => m.applicableAssets.includes(config.assetType))

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
          companyRating: config.companyRating,
          valuationModel: selectedModel
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
        description: error instanceof Error ? error.message : "가치평가 시뮬레이션 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleAddParameter = (paramId: string) => {
    if (!activeParams.includes(paramId)) {
      setActiveParams([...activeParams, paramId])
      const param = ONTOLOGY_PARAMETERS.find(p => p.id === paramId)
      if (param?.defaultValue !== undefined) {
        setConfig(prev => ({ ...prev, [paramId]: param.defaultValue }))
      }
    }
  }

  const handleRemoveParameter = (paramId: string) => {
    setActiveParams(activeParams.filter(p => p !== paramId))
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
          <p className="text-sm text-zinc-400 mt-1">온톨로지 기반 대체투자 자산 가치 산정</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowParamWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            파라미터 추가
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700" 
            onClick={handleRunSimulation}
            disabled={isSimulating}
          >
            <Play className="w-4 h-4 mr-2" />
            {isSimulating ? "분석 중..." : "가치평가 실행"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 모델 및 파라미터 설정 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 평가 모델 선택 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                평가 모델 선택
              </h3>
              <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                {applicableModels.length}개 모델 적용 가능
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {applicableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? "bg-purple-500/20 border-purple-500/50"
                      : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{model.description}</div>
                </button>
              ))}
            </div>

            {currentModel && (
              <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">수식</span>
                </div>
                <code className="text-sm text-zinc-300 font-mono">{currentModel.formula}</code>
              </div>
            )}
          </Card>

          {/* 자산 기본 정보 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                자산 기본 정보
              </h3>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">
                <Link2 className="w-3 h-3 mr-1" />
                온톨로지 연결됨
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  프로젝트명
                  <Badge variant="outline" className="text-xs">Project.name</Badge>
                </Label>
                <Input
                  value={config.projectName}
                  onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  자산 유형
                  <Badge variant="outline" className="text-xs">Project.assetType</Badge>
                </Label>
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
                <Label className="flex items-center gap-2">
                  총 사업비 (억원)
                  <Badge variant="outline" className="text-xs">Project.totalAmount</Badge>
                </Label>
                <Input
                  type="number"
                  value={config.totalAmount}
                  onChange={(e) => setConfig({ ...config, totalAmount: Number(e.target.value) })}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  현재 가치 (억원)
                  <Badge variant="outline" className="text-xs">Project.currentValue</Badge>
                </Label>
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
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              프로젝트 진행 현황
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    공정률 (%)
                    <Badge variant="outline" className="text-xs">Project.completionRate</Badge>
                  </Label>
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
                  <Label className="flex items-center gap-2">
                    분양률 (%)
                    <Badge variant="outline" className="text-xs">Project.presaleRate</Badge>
                  </Label>
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
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-rose-400" />
              할인율 파라미터
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    무위험 이자율 (%)
                    <Badge variant="outline" className="text-xs">Market</Badge>
                  </Label>
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
                  <Label className="flex items-center gap-2">
                    리스크 프리미엄 (%)
                    <Badge variant="outline" className="text-xs">Risk</Badge>
                  </Label>
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
                <Label className="flex items-center gap-2">
                  시공사/시행사 신용등급
                  <Badge variant="outline" className="text-xs">Company.creditRating</Badge>
                </Label>
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
                      {result?.result?.summary?.fairValue?.toFixed(0) || "-"}억
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                      <div className="text-xs text-zinc-400 mb-1">IRR</div>
                      <div className="text-xl font-bold text-blue-400">
                        {result?.result?.summary?.irr ? (result.result.summary.irr * 100).toFixed(1) : "-"}%
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                      <div className="text-xs text-zinc-400 mb-1">NPV</div>
                      <div className="text-xl font-bold text-purple-400">
                        {result?.result?.summary?.npv?.toFixed(0) || "-"}억
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 ${
                (result?.result?.summary?.irr ?? 0) >= 0.10 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <div className="flex items-start gap-3">
                  {(result?.result?.summary?.irr ?? 0) >= 0.10 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <div className={`font-semibold mb-1 ${
                      (result?.result?.summary?.irr ?? 0) >= 0.10 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      AI 투자 의견
                    </div>
                    <p className="text-zinc-300">{result?.recommendation || "분석 결과를 확인해주세요."}</p>
                  </div>
                </div>
              </Card>

              {/* 적용된 파라미터 요약 */}
              <Card className="bg-zinc-900/50 border-zinc-800 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  적용된 파라미터
                </h4>
                <div className="space-y-2">
                  {activeParams.slice(0, 5).map(paramId => {
                    const param = ONTOLOGY_PARAMETERS.find(p => p.id === paramId)
                    if (!param) return null
                    return (
                      <div key={paramId} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{param.nameKr}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs py-0">
                            {param.source === "ontology" ? "Graph" : "Manual"}
                          </Badge>
                          <span className="font-mono text-zinc-300">
                            {config[paramId]}{param.type === "percentage" ? "%" : param.unit || ""}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {activeParams.length > 5 && (
                    <div className="text-xs text-zinc-500 text-center pt-1">
                      +{activeParams.length - 5}개 더 보기
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400 mb-2">가치평가 대기 중</h3>
                <p className="text-sm text-zinc-500">
                  모델을 선택하고 파라미터를 입력한 후<br />가치평가를 실행하세요.
                </p>
              </div>
            </Card>
          )}

          <Card className="bg-purple-500/10 border-purple-500/30 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-purple-400 mb-1">적용 모델</div>
                <p className="text-zinc-300">
                  {currentModel?.name} - {currentModel?.description}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 파라미터 추가 위자드 다이얼로그 */}
      <ParameterWizardDialog
        open={showParamWizard}
        onOpenChange={setShowParamWizard}
        activeParams={activeParams}
        onAddParameter={handleAddParameter}
        assetType={config.assetType}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 파라미터 추가 위자드 다이얼로그
// ────────────────────────────────────────────────────────────────────────────
interface ParameterWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeParams: string[]
  onAddParameter: (paramId: string) => void
  assetType: string
}

function ParameterWizardDialog({ open, onOpenChange, activeParams, onAddParameter, assetType }: ParameterWizardDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  const categories = [
    { id: "all", name: "전체", icon: Database },
    { id: "project", name: "프로젝트", icon: Layers },
    { id: "company", name: "회사", icon: Database },
    { id: "tranche", name: "트랜치", icon: Layers },
    { id: "market", name: "시장", icon: TrendingUp },
    { id: "risk", name: "리스크", icon: AlertCircle },
  ]

  const filteredParams = ONTOLOGY_PARAMETERS.filter(p => {
    if (activeParams.includes(p.id)) return false
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            온톨로지 파라미터 추가
          </DialogTitle>
          <DialogDescription>
            그래프 DB에서 매핑된 객체/속성을 선택하여 가치평가에 반영합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? "bg-emerald-600" : ""}
              >
                <Icon className="w-4 h-4 mr-1" />
                {cat.name}
              </Button>
            )
          })}
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredParams.map((param) => (
              <div
                key={param.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{param.nameKr}</span>
                    <Badge variant="outline" className="text-xs">
                      {param.linkedObject ? `${param.linkedObject}.${param.linkedProperty}` : param.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{param.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onAddParameter(param.id)
                    onOpenChange(false)
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {filteredParams.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                추가 가능한 파라미터가 없습니다.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
