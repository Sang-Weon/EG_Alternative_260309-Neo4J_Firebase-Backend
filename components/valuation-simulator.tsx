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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { 
  Play, Calculator, TrendingUp, AlertCircle, CheckCircle2, Settings2, Database,
  Link2, Plus, Sparkles, ChevronRight, Info, Layers, ArrowRight, BookOpen,
  FileText, Workflow, Target, X, ExternalLink, Loader2, TrendingDown,
  Building2, AlertTriangle, Network, GitBranch, ArrowDown, Zap, Shield
} from "lucide-react"
import { AIPLogic } from "@/lib/aip-logic"
import { useToast } from "@/hooks/use-toast"

// ════════════════════════════════════════════════════════════════════════════════
// 국제 검증 가치평가 방법론 (IPEV Guidelines, IVS, IFRS 13 기반)
// ════════════════════════════════════════════════════════════════════════════════

interface ValuationMethodology {
  id: string
  name: string
  nameEn: string
  standard: string
  description: string
  applicableAssets: string[]
  requiredParams: MethodologyParam[]
  optionalParams: MethodologyParam[]
  formula: string
  formulaDescription: string
  constraints: string[]
  references: { name: string; url?: string }[]
  riskFactors: string[]
}

interface MethodologyParam {
  id: string
  name: string
  nameKr: string
  type: "number" | "percentage" | "currency" | "array" | "rating"
  unit?: string
  description: string
  ontologyMapping?: { object: string; property: string }
  defaultValue?: number
  min?: number
  max?: number
}

const VALIDATED_METHODOLOGIES: ValuationMethodology[] = [
  {
    id: "dcf_ipev",
    name: "DCF 할인현금흐름법",
    nameEn: "Discounted Cash Flow (DCF)",
    standard: "IPEV Guidelines 2025 / IVS 105",
    description: "미래 예상 현금흐름을 적정 할인율로 현재가치화하여 공정가치를 산정하는 소득접근법의 대표적 방법론입니다.",
    applicableAssets: ["PF_DEVELOPMENT", "REAL_ESTATE", "INFRASTRUCTURE", "RENEWABLE_ENERGY", "AIRCRAFT", "SHIP"],
    requiredParams: [
      { id: "projectedCashFlows", name: "Projected Cash Flows", nameKr: "예상 현금흐름", type: "array", description: "기간별 예상 현금 유입/유출", ontologyMapping: { object: "Project", property: "cashFlows" } },
      { id: "discountRate", name: "Discount Rate", nameKr: "할인율", type: "percentage", unit: "%", description: "WACC 또는 요구수익률 기반", min: 1, max: 30 },
      { id: "projectionPeriod", name: "Projection Period", nameKr: "현금흐름 예측기간", type: "number", unit: "년", description: "명시적 예측 기간", defaultValue: 5, min: 1, max: 20 }
    ],
    optionalParams: [
      { id: "terminalValue", name: "Terminal Value", nameKr: "잔존가치", type: "currency", unit: "억원", description: "예측기간 종료 후 가치" },
      { id: "terminalGrowthRate", name: "Terminal Growth Rate", nameKr: "영구성장률", type: "percentage", unit: "%", description: "Gordon Growth Model 적용 시", defaultValue: 2, min: 0, max: 5 }
    ],
    formula: "PV = Σ(CFₜ / (1+r)ᵗ) + TV/(1+r)ⁿ",
    formulaDescription: "PV: 현재가치, CFₜ: t기 현금흐름, r: 할인율, TV: 잔존가치, n: 예측기간",
    constraints: [
      "현금흐름 예측은 합리적이고 지지 가능한 가정에 근거해야 함 (IVS 105.40)",
      "할인율은 현금흐름의 리스크 프로파일을 반영해야 함 (IPEV 3.4)",
      "잔존가치는 전체 가치의 과도한 비중을 차지하지 않아야 함"
    ],
    references: [
      { name: "IPEV Valuation Guidelines 2025", url: "https://www.privateequityvaluation.com" },
      { name: "IVS 105 Valuation Approaches and Methods" },
      { name: "IFRS 13 Fair Value Measurement" }
    ],
    riskFactors: ["시장 금리 변동", "현금흐름 예측 불확실성", "할인율 산정 주관성"]
  },
  {
    id: "market_multiples",
    name: "시장배수법 (Market Multiples)",
    nameEn: "Comparable Company Analysis",
    standard: "IPEV Guidelines 2025 / IVS 105",
    description: "유사 기업/자산의 거래배수(EV/EBITDA, P/E 등)를 적용하여 상대적 가치를 산정하는 시장접근법입니다.",
    applicableAssets: ["PRIVATE_EQUITY", "REAL_ESTATE", "INFRASTRUCTURE"],
    requiredParams: [
      { id: "ebitda", name: "EBITDA", nameKr: "EBITDA", type: "currency", unit: "억원", description: "세전/이자/감가상각전 이익", ontologyMapping: { object: "Project", property: "ebitda" } },
      { id: "comparableMultiple", name: "Comparable Multiple", nameKr: "적용 배수", type: "number", description: "유사기업/거래 기준 배수", defaultValue: 8, min: 2, max: 20 }
    ],
    optionalParams: [
      { id: "controlPremium", name: "Control Premium", nameKr: "경영권 프리미엄", type: "percentage", unit: "%", description: "경영권 취득 시 할증", defaultValue: 20, min: 0, max: 50 },
      { id: "illiquidityDiscount", name: "Illiquidity Discount", nameKr: "비유동성 할인", type: "percentage", unit: "%", description: "비상장 유동성 할인", defaultValue: 15, min: 0, max: 40 }
    ],
    formula: "EV = EBITDA × Multiple × (1 + Control Premium) × (1 - Illiquidity Discount)",
    formulaDescription: "EV: 기업가치, EBITDA: 세전영업이익, Multiple: 시장 배수",
    constraints: [
      "유사기업 선정 시 사업모델, 규모, 성장성, 위험 프로파일 유사성 검토 필수 (IPEV 3.3)",
      "배수 적용 시 차이점에 대한 합리적 조정 필요",
      "단일 배수가 아닌 범위로 제시하여 불확실성 반영"
    ],
    references: [
      { name: "IPEV Valuation Guidelines 2025 Section 3.3" },
      { name: "Pratt's Stats Transaction Database" }
    ],
    riskFactors: ["유사기업 선정의 주관성", "시장 상황 변동", "조정 요소 산정 불확실성"]
  },
  {
    id: "income_capitalization",
    name: "직접환원법 (Direct Capitalization)",
    nameEn: "Income Capitalization Approach",
    standard: "IVS 105 / RICS Red Book",
    description: "안정화된 순영업이익(NOI)을 시장 자본환원율(Cap Rate)로 나누어 부동산 가치를 산정하는 소득접근법입니다.",
    applicableAssets: ["REAL_ESTATE", "INFRASTRUCTURE"],
    requiredParams: [
      { id: "noi", name: "Net Operating Income", nameKr: "순영업이익 (NOI)", type: "currency", unit: "억원", description: "임대수익 - 운영비용", ontologyMapping: { object: "Project", property: "noi" } },
      { id: "capRate", name: "Capitalization Rate", nameKr: "환원율 (Cap Rate)", type: "percentage", unit: "%", description: "시장 거래 기준 환원율", defaultValue: 5, min: 2, max: 15 }
    ],
    optionalParams: [
      { id: "vacancyRate", name: "Vacancy Rate", nameKr: "공실률", type: "percentage", unit: "%", description: "예상 공실 비율", defaultValue: 5, min: 0, max: 30 },
      { id: "opexRatio", name: "Operating Expense Ratio", nameKr: "운영비율", type: "percentage", unit: "%", description: "총수익 대비 운영비", defaultValue: 25, min: 10, max: 50 }
    ],
    formula: "Value = NOI / Cap Rate",
    formulaDescription: "Value: 부동산 가치, NOI: 순영업이익, Cap Rate: 자본환원율",
    constraints: [
      "NOI는 안정화된(stabilized) 수준이어야 함",
      "Cap Rate는 유사 물건의 최근 거래 기준 적용 (IVS 105.60)",
      "물건 특성(위치, 등급, 임차인 질) 반영한 조정 필요"
    ],
    references: [
      { name: "IVS 105 Valuation Approaches and Methods" },
      { name: "RICS Valuation Global Standards (Red Book)" }
    ],
    riskFactors: ["임대시장 변동", "공실률 예측 불확실성", "Cap Rate 선정 주관성"]
  },
  {
    id: "residual_method",
    name: "잔여법 (Residual Method)",
    nameEn: "Residual / Development Approach",
    standard: "IVS 410 / RICS Red Book",
    description: "개발 완료 후 예상 가치(GDV)에서 개발비용, 금융비용, 개발이익을 차감하여 현재 토지/사업 가치를 역산하는 방법입니다.",
    applicableAssets: ["PF_DEVELOPMENT"],
    requiredParams: [
      { id: "gdv", name: "Gross Development Value", nameKr: "총개발가치 (GDV)", type: "currency", unit: "억원", description: "완공 후 예상 매출/가치", ontologyMapping: { object: "Project", property: "gdv" } },
      { id: "constructionCost", name: "Construction Cost", nameKr: "공사비", type: "currency", unit: "억원", description: "직접 건설 비용", ontologyMapping: { object: "Project", property: "constructionCost" } },
      { id: "developerProfit", name: "Developer's Profit", nameKr: "개발이익", type: "percentage", unit: "%", description: "GDV 대비 요구 이익률", defaultValue: 15, min: 5, max: 30 }
    ],
    optionalParams: [
      { id: "contingency", name: "Contingency", nameKr: "예비비", type: "percentage", unit: "%", description: "공사비 대비 예비비", defaultValue: 5, min: 0, max: 15 },
      { id: "professionalFees", name: "Professional Fees", nameKr: "전문가비용", type: "percentage", unit: "%", description: "설계/감리/인허가 비용", defaultValue: 8, min: 3, max: 15 }
    ],
    formula: "Site Value = GDV - Construction - Finance - Fees - (GDV × Developer Profit)",
    formulaDescription: "Site Value: 토지/사업 잔여가치, GDV: 총개발가치",
    constraints: [
      "GDV는 시장 근거에 의해 지지 가능해야 함",
      "비용 항목은 현실적이고 검증 가능해야 함 (IVS 410.40)",
      "개발이익률은 시장 참여자 관점의 요구수익률 반영"
    ],
    references: [
      { name: "IVS 410 Development Property" },
      { name: "RICS Valuation of Development Property" }
    ],
    riskFactors: ["GDV 예측 불확실성", "공사비 변동", "개발기간 지연 리스크"]
  },
  {
    id: "replacement_cost",
    name: "감가상각 대체원가법",
    nameEn: "Depreciated Replacement Cost (DRC)",
    standard: "IVS 105 / IFRS 13",
    description: "동일 효용의 자산을 현재 시점에 취득하는 비용에서 물리적/기능적/경제적 감가를 차감하여 가치를 산정합니다.",
    applicableAssets: ["INFRASTRUCTURE", "AIRCRAFT", "SHIP"],
    requiredParams: [
      { id: "replacementCostNew", name: "Replacement Cost New", nameKr: "재조달원가", type: "currency", unit: "억원", description: "신규 취득 시 현재 비용", ontologyMapping: { object: "Project", property: "replacementCost" } },
      { id: "physicalDepreciation", name: "Physical Depreciation", nameKr: "물리적 감가", type: "percentage", unit: "%", description: "노후화에 따른 가치 감소", defaultValue: 20, min: 0, max: 80 },
      { id: "usefulLife", name: "Useful Life", nameKr: "내용연수", type: "number", unit: "년", description: "자산의 경제적 수명", defaultValue: 20 },
      { id: "remainingLife", name: "Remaining Life", nameKr: "잔존수명", type: "number", unit: "년", description: "잔여 사용가능 기간", defaultValue: 15 }
    ],
    optionalParams: [
      { id: "functionalObsolescence", name: "Functional Obsolescence", nameKr: "기능적 진부화", type: "percentage", unit: "%", description: "기술 진보에 따른 감가", defaultValue: 5, min: 0, max: 50 },
      { id: "economicObsolescence", name: "Economic Obsolescence", nameKr: "경제적 진부화", type: "percentage", unit: "%", description: "외부 요인에 의한 감가", defaultValue: 0, min: 0, max: 50 }
    ],
    formula: "DRC = RCN × (1 - Physical) × (1 - Functional) × (1 - Economic) × (Remaining/Useful)",
    formulaDescription: "DRC: 감가상각후 대체원가, RCN: 재조달원가",
    constraints: [
      "시장가치 도출이 어려운 특수목적 자산에 주로 적용 (IVS 105.90)",
      "각 감가상각 요소는 독립적으로 분석",
      "최고최선이용 검토 필수"
    ],
    references: [
      { name: "IVS 105 Valuation Approaches and Methods" },
      { name: "IFRS 13 Fair Value Hierarchy" }
    ],
    riskFactors: ["재조달원가 산정 어려움", "감가상각 추정 주관성", "경제적 진부화 예측"]
  },
  {
    id: "nav_adjusted",
    name: "조정순자산가치법 (Adjusted NAV)",
    nameEn: "Adjusted Net Asset Value",
    standard: "IPEV Guidelines 2025",
    description: "재무제표상 순자산을 공정가치로 조정하고, 경영권/비유동성 프리미엄/할인을 반영하여 지분가치를 산정합니다.",
    applicableAssets: ["PRIVATE_EQUITY", "INFRASTRUCTURE"],
    requiredParams: [
      { id: "bookNAV", name: "Book NAV", nameKr: "장부 순자산", type: "currency", unit: "억원", description: "재무제표상 순자산가치", ontologyMapping: { object: "Company", property: "bookValue" } },
      { id: "assetRevaluation", name: "Asset Revaluation", nameKr: "자산 재평가 조정", type: "currency", unit: "억원", description: "자산 공정가치 조정액", defaultValue: 0 }
    ],
    optionalParams: [
      { id: "intangibleAssets", name: "Unrecorded Intangibles", nameKr: "미인식 무형자산", type: "currency", unit: "억원", description: "장부 미반영 무형자산", defaultValue: 0 },
      { id: "contingentLiabilities", name: "Contingent Liabilities", nameKr: "우발부채", type: "currency", unit: "억원", description: "잠재적 부채 조정", defaultValue: 0 }
    ],
    formula: "Adjusted NAV = Book NAV + Asset Revaluation + Intangibles - Contingent Liabilities",
    formulaDescription: "Adjusted NAV: 조정순자산가치",
    constraints: [
      "자산별 적정 가치평가 방법 적용 필요 (IPEV 3.5)",
      "부채는 현재가치 또는 결제금액으로 조정",
      "순자산가치법 단독 적용 시 한계 인식 필요"
    ],
    references: [
      { name: "IPEV Valuation Guidelines 2025 Section 3.5" },
      { name: "IFRS 13 Fair Value Measurement" }
    ],
    riskFactors: ["자산별 평가 정확성", "무형자산 가치 추정", "부채 완전성"]
  }
]

// ════════════════════════════════════════════════════════════════════════════════
// 온톨로지 기반 파라미터
// ════════════════════════════════════════════════════════════════════════════════

interface OntologyParameter {
  id: string
  name: string
  nameKr: string
  type: "number" | "percentage" | "currency" | "rating" | "date" | "array"
  category: "project" | "company" | "tranche" | "market" | "risk" | "covenant" | "cascade"
  source: "ontology" | "manual" | "calculated"
  linkedObject?: string
  linkedProperty?: string
  defaultValue?: number
  unit?: string
  description: string
  impactDescription?: string
}

const ONTOLOGY_PARAMETERS: OntologyParameter[] = [
  // 프로젝트 관련
  { id: "totalAmount", name: "Total Investment", nameKr: "총 사업비", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "totalAmount", unit: "억원", description: "프로젝트 총 투자 금액", impactDescription: "전체 사업 규모로서 할인율 산정 시 규모 프리미엄에 영향" },
  { id: "currentValue", name: "Current Value", nameKr: "현재 가치", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "currentValue", unit: "억원", description: "현재 평가 가치", impactDescription: "LTV 계산 및 담보가치 산정의 기준" },
  { id: "completionRate", name: "Completion Rate", nameKr: "공정률", type: "percentage", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "completionRate", description: "공사 진행률", impactDescription: "준공 리스크 프리미엄 산정에 직접 반영 (높을수록 리스크 감소)" },
  { id: "presaleRate", name: "Presale Rate", nameKr: "분양률", type: "percentage", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "presaleRate", description: "분양 진행률", impactDescription: "분양 리스크 프리미엄 산정 (높을수록 현금흐름 확실성 증가)" },
  { id: "noi", name: "Net Operating Income", nameKr: "순영업이익", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "noi", unit: "억원", description: "연간 순영업이익", impactDescription: "직접환원법 분자, DSCR 계산 핵심 변수" },
  { id: "gdv", name: "Gross Dev Value", nameKr: "총개발가치", type: "currency", category: "project", source: "ontology", linkedObject: "Project", linkedProperty: "gdv", unit: "억원", description: "완공 후 예상 가치", impactDescription: "잔여법 기준가치, 전체 사업성 판단의 기초" },
  
  // 회사 관련
  { id: "companyRating", name: "Credit Rating", nameKr: "신용등급", type: "rating", category: "company", source: "ontology", linkedObject: "Company", linkedProperty: "creditRating", description: "시공사/시행사 신용등급", impactDescription: "신용 스프레드 산정, 부도확률(PD) 매핑에 직접 사용" },
  { id: "companyPD", name: "Default Probability", nameKr: "부도확률", type: "percentage", category: "company", source: "calculated", linkedObject: "Company", linkedProperty: "defaultProbability", description: "회사 부도 확률", impactDescription: "연쇄부도 시뮬레이션 및 EL(기대손실) 계산에 사용" },
  
  // 시장/거시 관련
  { id: "riskFreeRate", name: "Risk-Free Rate", nameKr: "무위험이자율", type: "percentage", category: "market", source: "manual", defaultValue: 3.5, description: "국고채 금리 기준", impactDescription: "CAPM 할인율 산정의 기초, 모든 스프레드의 기준점" },
  { id: "marketPremium", name: "Market Premium", nameKr: "시장 프리미엄", type: "percentage", category: "market", source: "manual", defaultValue: 5.0, description: "주식시장 위험 프리미엄", impactDescription: "CAPM Beta 조정 할인율 산정에 사용" },
  { id: "capRate", name: "Cap Rate", nameKr: "환원율", type: "percentage", category: "market", source: "manual", defaultValue: 5.0, description: "시장 자본환원율", impactDescription: "직접환원법 분모, 잔존가치 산정에 사용" },
  
  // 리스크 관련
  { id: "ltv", name: "LTV", nameKr: "담보인정비율", type: "percentage", category: "risk", source: "calculated", description: "Loan-to-Value Ratio", impactDescription: "약정(Covenant) 준수 여부 판단, 추가 담보 필요성 평가" },
  { id: "dscr", name: "DSCR", nameKr: "원리금상환비율", type: "number", category: "risk", source: "calculated", description: "Debt Service Coverage Ratio", impactDescription: "현금흐름 충분성 평가, 약정 위반 리스크 모니터링" },
  { id: "constructionRisk", name: "Construction Risk", nameKr: "공사 리스크", type: "percentage", category: "risk", source: "manual", defaultValue: 15, description: "공사 지연/비용 초과 위험", impactDescription: "리스크 프리미엄으로 할인율에 직접 가산" },
  
  // 연쇄부도 관련 (신규)
  { id: "cascadeEnabled", name: "Cascade Simulation", nameKr: "연쇄부도 반영", type: "number", category: "cascade", source: "calculated", description: "연쇄부도 시뮬레이션 결과 반영 여부", impactDescription: "활성화 시 연쇄부도 확률이 할인율 프리미엄으로 반영됨" },
  { id: "cascadeRiskPremium", name: "Cascade Risk Premium", nameKr: "연쇄부도 프리미엄", type: "percentage", category: "cascade", source: "calculated", description: "연쇄부도 영향 추가 할인율", impactDescription: "연쇄부도 시뮬레이션 결과에 따라 0~5% 추가 프리미엄 적용" },
  { id: "expectedCascadeLoss", name: "Expected Cascade Loss", nameKr: "연쇄부도 예상손실", type: "currency", category: "cascade", source: "calculated", unit: "억원", description: "연쇄부도 시 예상 손실", impactDescription: "현금흐름에서 기대손실(EL)로 차감" }
]

// ════════════════════════════════════════════════════════════════════════════════
// 연쇄부도 시뮬레이션 타입 및 로직
// ════════════════════════════════════════════════════════════════════════════════

interface CascadeNode {
  id: string
  name: string
  type: "company" | "project" | "tranche" | "fund"
  level: number
  impact: number
  lossAmount: number
  probability: number
}

interface CascadeLink {
  from: string
  to: string
  type: string
  description: string
  transmissionRate: number
}

interface CascadeResult {
  nodes: CascadeNode[]
  links: CascadeLink[]
  summary: {
    totalExposure: number
    directImpact: number
    indirectImpact: number
    affectedProjects: number
    avgTransmissionRate: number
    cascadeRiskPremium: number  // 할인율에 추가할 프리미엄
    expectedLoss: number        // 예상 손실 (현금흐름 조정)
  }
}

const DEFAULT_PROBABILITIES: Record<string, number> = {
  "AAA": 0.0001, "AA": 0.0003, "A": 0.0008, "BBB": 0.003, "BB": 0.02, "B": 0.08, "CCC": 0.20, "D": 1.0
}

function simulateCascadeDefault(companyRating: string, projectName: string): CascadeResult {
  const pd = DEFAULT_PROBABILITIES[companyRating] || 0.03
  
  const nodes: CascadeNode[] = [
    { id: "trigger", name: `시공사 (${companyRating})`, type: "company", level: 0, impact: 100, lossAmount: 0, probability: pd },
    { id: "proj-1", name: projectName, type: "project", level: 1, impact: 75, lossAmount: 180, probability: 0.85 * pd },
    { id: "proj-2", name: "관련 PF 프로젝트", type: "project", level: 1, impact: 45, lossAmount: 85, probability: 0.60 * pd },
    { id: "tr-senior", name: "Senior 트랜치", type: "tranche", level: 2, impact: 25, lossAmount: 45, probability: 0.40 * pd },
    { id: "tr-mezz", name: "Mezzanine 트랜치", type: "tranche", level: 2, impact: 65, lossAmount: 120, probability: 0.75 * pd },
    { id: "tr-junior", name: "Junior 트랜치", type: "tranche", level: 2, impact: 90, lossAmount: 95, probability: 0.90 * pd },
    { id: "fund-1", name: "이지대체투자1호", type: "fund", level: 3, impact: 35, lossAmount: 165, probability: 0.50 * pd },
  ]

  const links: CascadeLink[] = [
    { from: "trigger", to: "proj-1", type: "RESPONSIBLE_FOR", description: "책임준공", transmissionRate: 0.85 },
    { from: "trigger", to: "proj-2", type: "CONSTRUCTS", description: "시공참여", transmissionRate: 0.60 },
    { from: "proj-1", to: "tr-senior", type: "HAS_TRANCHE", description: "선순위", transmissionRate: 0.40 },
    { from: "proj-1", to: "tr-mezz", type: "HAS_TRANCHE", description: "중순위", transmissionRate: 0.75 },
    { from: "proj-2", to: "tr-junior", type: "HAS_TRANCHE", description: "후순위", transmissionRate: 0.90 },
    { from: "tr-mezz", to: "fund-1", type: "HELD_BY", description: "펀드보유", transmissionRate: 0.50 },
    { from: "tr-junior", to: "fund-1", type: "HELD_BY", description: "펀드보유", transmissionRate: 0.50 },
  ]

  const totalExposure = nodes.filter(n => n.type !== "company").reduce((sum, n) => sum + n.lossAmount, 0)
  const directImpact = nodes.filter(n => n.level === 1).reduce((sum, n) => sum + n.lossAmount, 0)
  const indirectImpact = nodes.filter(n => n.level >= 2).reduce((sum, n) => sum + n.lossAmount, 0)
  
  // 연쇄부도 리스크 프리미엄 계산 (부도확률 * 전파율 * 손실율 기반)
  const avgTransmissionRate = links.reduce((sum, l) => sum + l.transmissionRate, 0) / links.length
  const cascadeRiskPremium = Math.min(5, pd * avgTransmissionRate * 100 * 2) // 최대 5%
  const expectedLoss = totalExposure * pd * avgTransmissionRate

  return {
    nodes,
    links,
    summary: {
      totalExposure,
      directImpact,
      indirectImpact,
      affectedProjects: nodes.filter(n => n.type === "project").length,
      avgTransmissionRate,
      cascadeRiskPremium,
      expectedLoss
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 워크플로 스텝
// ════════════════════════════════════════════════════════════════════════════════

interface WorkflowStep {
  id: string
  name: string
  description: string
  inputs: string[]
  outputs: string[]
  formula?: string
  status: "pending" | "running" | "completed" | "error"
  result?: Record<string, unknown>
}

// ════════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════════════════════════════════════════════

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
  noi?: number
  capRate?: number
  gdv?: number
  constructionCost?: number
  [key: string]: unknown
}

export function ValuationSimulator() {
  const { toast } = useToast()
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [selectedMethodology, setSelectedMethodology] = useState<string>("dcf_ipev")
  const [showParamWizard, setShowParamWizard] = useState(false)
  const [showMethodologyDetail, setShowMethodologyDetail] = useState(false)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0)
  
  // 연쇄부도 관련 state
  const [cascadeEnabled, setCascadeEnabled] = useState(false)
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null)
  const [showCascadeDetail, setShowCascadeDetail] = useState(false)
  
  const [activeParams, setActiveParams] = useState<string[]>([
    "totalAmount", "currentValue", "completionRate", "presaleRate", 
    "riskFreeRate", "discountPremium", "companyRating", "noi", "capRate"
  ])
  
  const [config, setConfig] = useState<ValuationConfig>({
    projectName: "강남 복합개발 PF",
    assetType: "PF_DEVELOPMENT",
    totalAmount: 2000,
    currentValue: 1800,
    completionRate: 45,
    presaleRate: 65,
    riskFreeRate: 3.5,
    discountPremium: 2.5,
    companyRating: "BBB",
    noi: 120,
    capRate: 5.0,
    gdv: 3000,
    constructionCost: 1500
  })

  // 연쇄부도 시뮬레이션 실행
  useEffect(() => {
    if (cascadeEnabled) {
      const result = simulateCascadeDefault(config.companyRating, config.projectName)
      setCascadeResult(result)
    } else {
      setCascadeResult(null)
    }
  }, [cascadeEnabled, config.companyRating, config.projectName])

  // 자산유형 변경 시 적합한 방법론 자동 선택
  useEffect(() => {
    const applicableMethodologies = VALIDATED_METHODOLOGIES.filter(m => 
      m.applicableAssets.includes(config.assetType)
    )
    if (applicableMethodologies.length > 0 && !applicableMethodologies.find(m => m.id === selectedMethodology)) {
      setSelectedMethodology(applicableMethodologies[0].id)
    }
  }, [config.assetType, selectedMethodology])

  const currentMethodology = VALIDATED_METHODOLOGIES.find(m => m.id === selectedMethodology)
  const applicableMethodologies = VALIDATED_METHODOLOGIES.filter(m => m.applicableAssets.includes(config.assetType))

  // 실제 할인율 계산 (연쇄부도 프리미엄 포함)
  const effectiveDiscountRate = config.riskFreeRate + config.discountPremium + (cascadeResult?.summary.cascadeRiskPremium || 0)

  // 워크플로 생성 (연쇄부도 스텝 포함)
  const generateWorkflow = (): WorkflowStep[] => {
    const methodology = currentMethodology
    if (!methodology) return []

    const steps: WorkflowStep[] = [
      {
        id: "param_load",
        name: "1. 파라미터 로딩",
        description: "온톨로지에서 매핑된 파라미터를 로드합니다.",
        inputs: ["Project", "Company", "Tranche", "Covenant"],
        outputs: activeParams,
        status: "pending"
      }
    ]

    // 연쇄부도 시뮬레이션 스텝 (활성화된 경우)
    if (cascadeEnabled) {
      steps.push({
        id: "cascade_simulation",
        name: "2. 연쇄부도 시뮬레이션",
        description: "시공사/시행사 부도 시 포트폴리오 연쇄 영향을 분석합니다.",
        inputs: ["companyRating", "relatedProjects", "tranches"],
        outputs: ["cascadeRiskPremium", "expectedCascadeLoss"],
        formula: "Cascade Premium = PD × Transmission Rate × Impact Factor",
        status: "pending"
      })
    }

    steps.push({
      id: "discount_rate",
      name: `${steps.length + 1}. 할인율 산정`,
      description: cascadeEnabled 
        ? "CAPM 기반 할인율 + 연쇄부도 리스크 프리미엄을 산정합니다."
        : "CAPM 기반 할인율을 산정합니다.",
      inputs: cascadeEnabled 
        ? ["riskFreeRate", "marketPremium", "creditRating", "cascadeRiskPremium"]
        : ["riskFreeRate", "marketPremium", "creditRating"],
      outputs: ["discountRate"],
      formula: cascadeEnabled
        ? "r = Rf + β×(Rm-Rf) + Credit Spread + Cascade Premium"
        : "r = Rf + β×(Rm-Rf) + Credit Spread",
      status: "pending"
    })

    // 방법론별 스텝
    if (methodology.id === "dcf_ipev") {
      steps.push(
        {
          id: "cashflow_projection",
          name: `${steps.length + 1}. 현금흐름 예측`,
          description: cascadeEnabled 
            ? "기간별 현금흐름을 예측하고 연쇄부도 예상손실을 차감합니다."
            : "기간별 현금흐름을 예측합니다.",
          inputs: cascadeEnabled 
            ? ["totalAmount", "presaleRate", "completionRate", "expectedCascadeLoss"]
            : ["totalAmount", "presaleRate", "completionRate"],
          outputs: ["projectedCashFlows", "adjustedCashFlows"],
          formula: cascadeEnabled 
            ? "Adjusted CF = Projected CF - (EL × Probability)"
            : undefined,
          status: "pending"
        },
        {
          id: "dcf_calc",
          name: `${steps.length + 2}. DCF 계산`,
          description: "할인현금흐름을 계산합니다.",
          inputs: ["adjustedCashFlows", "discountRate"],
          outputs: ["npv", "irr"],
          formula: methodology.formula,
          status: "pending"
        }
      )
    } else if (methodology.id === "income_capitalization") {
      steps.push(
        {
          id: "noi_calc",
          name: `${steps.length + 1}. NOI 계산`,
          description: "순영업이익을 계산합니다.",
          inputs: ["grossIncome", "vacancyRate", "opexRatio"],
          outputs: ["noi"],
          formula: "NOI = Gross Income × (1 - Vacancy) - OpEx",
          status: "pending"
        },
        {
          id: "cap_calc",
          name: `${steps.length + 2}. 직접환원 계산`,
          description: cascadeEnabled
            ? "자본환원율 + 연쇄부도 프리미엄으로 가치를 산정합니다."
            : "자본환원율로 가치를 산정합니다.",
          inputs: cascadeEnabled ? ["noi", "capRate", "cascadeRiskPremium"] : ["noi", "capRate"],
          outputs: ["fairValue"],
          formula: cascadeEnabled 
            ? "Value = NOI / (Cap Rate + Cascade Premium)"
            : methodology.formula,
          status: "pending"
        }
      )
    } else if (methodology.id === "residual_method") {
      steps.push(
        {
          id: "cost_calc",
          name: `${steps.length + 1}. 개발비용 집계`,
          description: "총 개발비용을 집계합니다.",
          inputs: ["constructionCost", "financeCost", "fees", "contingency"],
          outputs: ["totalCost"],
          status: "pending"
        },
        {
          id: "residual_calc",
          name: `${steps.length + 2}. 잔여가치 계산`,
          description: "GDV에서 비용을 차감합니다.",
          inputs: ["gdv", "totalCost", "developerProfit"],
          outputs: ["residualValue"],
          formula: methodology.formula,
          status: "pending"
        }
      )
    }

    // 공통 마무리 스텝
    steps.push(
      {
        id: "risk_adjustment",
        name: `${steps.length + 1}. 리스크 조정`,
        description: "각종 리스크 요소를 반영합니다.",
        inputs: ["constructionRisk", "marketRisk", "completionRate"],
        outputs: ["adjustedValue", "riskAdjustments"],
        status: "pending"
      },
      {
        id: "final_valuation",
        name: `${steps.length + 2}. 최종 가치 산정`,
        description: "공정가치를 확정합니다.",
        inputs: ["adjustedValue", "comparables"],
        outputs: ["fairValue", "valuationRange"],
        status: "pending"
      }
    )

    return steps
  }

  const runWorkflow = async () => {
    setShowWorkflowDialog(true)
    setIsSimulating(true)
    const steps = generateWorkflow()
    setWorkflowSteps(steps)
    setCurrentWorkflowStep(0)

    for (let i = 0; i < steps.length; i++) {
      setCurrentWorkflowStep(i)
      setWorkflowSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "running" } : s
      ))
      
      await new Promise(resolve => setTimeout(resolve, 800))

      // 결과 생성 (연쇄부도 결과 포함)
      const stepResult: Record<string, unknown> = { step: steps[i].id }
      
      if (steps[i].id === "cascade_simulation" && cascadeResult) {
        stepResult.cascadeRiskPremium = cascadeResult.summary.cascadeRiskPremium.toFixed(2) + "%"
        stepResult.expectedCascadeLoss = cascadeResult.summary.expectedLoss.toFixed(1) + "억"
        stepResult.affectedProjects = cascadeResult.summary.affectedProjects
      } else if (steps[i].id === "discount_rate") {
        stepResult.discountRate = effectiveDiscountRate.toFixed(2) + "%"
        if (cascadeEnabled && cascadeResult) {
          stepResult.baseRate = (config.riskFreeRate + config.discountPremium).toFixed(2) + "%"
          stepResult.cascadePremium = "+" + cascadeResult.summary.cascadeRiskPremium.toFixed(2) + "%"
        }
      } else {
        steps[i].outputs.forEach(out => {
          if (out === "npv") stepResult[out] = config.currentValue * 1.05
          else if (out === "irr") stepResult[out] = 0.125
          else if (out === "fairValue") stepResult[out] = config.currentValue * (cascadeEnabled ? 0.95 : 1.08)
          else stepResult[out] = config[out] || "calculated"
        })
      }

      setWorkflowSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "completed", result: stepResult } : s
      ))
    }

    // 최종 결과
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
          valuationModel: selectedMethodology,
          cascadeEnabled,
          cascadeRiskPremium: cascadeResult?.summary.cascadeRiskPremium || 0,
          expectedCascadeLoss: cascadeResult?.summary.expectedLoss || 0
        }
      )
      setResult(scenarioResult)
      toast({
        title: "가치평가 완료",
        description: cascadeEnabled 
          ? `${currentMethodology?.name} + 연쇄부도 분석 완료`
          : `${currentMethodology?.name} 방법론 적용 완료`,
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
      toast({
        title: "파라미터 추가됨",
        description: `${param?.nameKr || paramId}가 평가 모델에 추가되었습니다.`,
      })
    }
    setShowParamWizard(false)
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
            대체자산 가치평가 시뮬레이터
          </h2>
          <p className="text-sm text-zinc-400 mt-1">IPEV / IVS / IFRS 13 기반 검증 방법론 적용</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowParamWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            파라미터 추가
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700" 
            onClick={runWorkflow}
            disabled={isSimulating}
          >
            <Play className="w-4 h-4 mr-2" />
            {isSimulating ? "분석 중..." : "가치평가 실행"}
          </Button>
        </div>
      </div>

      {/* 메인 탭 */}
      <Tabs defaultValue="methodology" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900">
          <TabsTrigger value="methodology">평가 방법론</TabsTrigger>
          <TabsTrigger value="parameters">파라미터 설정</TabsTrigger>
          <TabsTrigger value="cascade" className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            연쇄부도 영향
          </TabsTrigger>
          <TabsTrigger value="result">평가 결과</TabsTrigger>
        </TabsList>

        {/* 평가 방법론 탭 */}
        <TabsContent value="methodology" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    검증 평가 방법론 선택
                  </h3>
                  <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                    {applicableMethodologies.length}개 적용 가능
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {applicableMethodologies.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethodology(method.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedMethodology === method.id
                          ? "bg-purple-500/20 border-purple-500/50"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{method.name}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{method.nameEn}</div>
                        </div>
                        {selectedMethodology === method.id && (
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-2 text-zinc-400">
                        {method.standard}
                      </Badge>
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{method.description}</p>
                    </button>
                  ))}
                </div>

                {currentMethodology && (
                  <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">적용 수식</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowMethodologyDetail(true)}>
                        상세 보기 <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <code className="block text-sm text-zinc-300 font-mono bg-zinc-900/50 p-3 rounded">
                      {currentMethodology.formula}
                    </code>
                    <p className="text-xs text-zinc-400">{currentMethodology.formulaDescription}</p>
                    
                    <div className="pt-3 border-t border-zinc-700">
                      <div className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        적용 제약조건
                      </div>
                      <ul className="text-xs text-zinc-400 space-y-1">
                        {currentMethodology.constraints.slice(0, 2).map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-zinc-600">-</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* 프로젝트 기본 설정 */}
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-4">프로젝트 설정</h3>
              <div className="space-y-4">
                <div>
                  <Label>프로젝트명</Label>
                  <Input 
                    value={config.projectName}
                    onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
                    className="mt-1 bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>자산유형</Label>
                  <Select value={config.assetType} onValueChange={(v) => setConfig({ ...config, assetType: v })}>
                    <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="PF_DEVELOPMENT">PF 개발사업</SelectItem>
                      <SelectItem value="REAL_ESTATE">부동산 (오피스/리테일)</SelectItem>
                      <SelectItem value="INFRASTRUCTURE">인프라</SelectItem>
                      <SelectItem value="PRIVATE_EQUITY">사모펀드(PE)</SelectItem>
                      <SelectItem value="AIRCRAFT">항공기</SelectItem>
                      <SelectItem value="SHIP">선박</SelectItem>
                      <SelectItem value="RENEWABLE_ENERGY">신재생에너지</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>시공사 신용등급</Label>
                  <Select value={config.companyRating} onValueChange={(v) => setConfig({ ...config, companyRating: v })}>
                    <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {["AAA", "AA", "A", "BBB", "BB", "B", "CCC"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 파라미터 설정 탭 */}
        <TabsContent value="parameters" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                온톨로지 연결 파라미터
              </h3>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">
                <Link2 className="w-3 h-3 mr-1" />
                {activeParams.filter(p => ONTOLOGY_PARAMETERS.find(op => op.id === p)?.source === "ontology").length}개 연결됨
              </Badge>
            </div>
            
            <Tabs defaultValue="project" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-zinc-800/50">
                <TabsTrigger value="project">프로젝트</TabsTrigger>
                <TabsTrigger value="company">회사</TabsTrigger>
                <TabsTrigger value="market">시장</TabsTrigger>
                <TabsTrigger value="risk">리스크</TabsTrigger>
                <TabsTrigger value="all">전체</TabsTrigger>
              </TabsList>
              
              {["project", "company", "market", "risk", "all"].map(category => (
                <TabsContent key={category} value={category} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ONTOLOGY_PARAMETERS
                      .filter(p => activeParams.includes(p.id))
                      .filter(p => category === "all" || p.category === category)
                      .map(param => (
                        <div key={param.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Label className="font-medium text-sm">{param.nameKr}</Label>
                              {param.source === "ontology" && param.linkedObject && (
                                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                                  <Link2 className="w-2 h-2 mr-1" />
                                  {param.linkedObject}.{param.linkedProperty}
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                              onClick={() => handleRemoveParameter(param.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {param.type === "percentage" ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">{param.description}</span>
                                <Badge variant="outline">{(config[param.id] as number) || param.defaultValue || 0}%</Badge>
                              </div>
                              <Slider
                                value={[(config[param.id] as number) || param.defaultValue || 0]}
                                onValueChange={(value) => setConfig({ ...config, [param.id]: value[0] })}
                                min={param.min || 0}
                                max={param.max || 100}
                                step={param.id.includes("Rate") ? 0.25 : 5}
                              />
                            </div>
                          ) : param.type === "rating" ? (
                            <Select
                              value={(config[param.id] as string) || "BBB"}
                              onValueChange={(value) => setConfig({ ...config, [param.id]: value })}
                            >
                              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700">
                                {["AAA", "AA", "A", "BBB", "BB", "B", "CCC"].map(r => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="number"
                              value={(config[param.id] as number) || param.defaultValue || ""}
                              onChange={(e) => setConfig({ ...config, [param.id]: Number(e.target.value) })}
                              className="bg-zinc-900 border-zinc-700"
                              placeholder={param.description}
                            />
                          )}
                          
                          {param.impactDescription && (
                            <p className="text-[10px] text-zinc-500 mt-2 flex items-start gap-1">
                              <Target className="w-3 h-3 shrink-0 mt-0.5 text-blue-400" />
                              <span><strong className="text-zinc-400">영향:</strong> {param.impactDescription}</span>
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </TabsContent>

        {/* 연쇄부도 영향 탭 */}
        <TabsContent value="cascade" className="mt-6 space-y-6">
          {/* 연쇄부도 토글 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">연쇄부도 시뮬레이션</h3>
                  <p className="text-sm text-zinc-400">시공사/시행사 부도 시 포트폴리오 영향을 가치평가에 반영합니다.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">{cascadeEnabled ? "활성화됨" : "비활성화"}</span>
                <Switch checked={cascadeEnabled} onCheckedChange={setCascadeEnabled} />
              </div>
            </div>
          </Card>

          {cascadeEnabled && cascadeResult && (
            <>
              {/* 연쇄부도 영향 요약 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-red-500/10 border-red-500/30 p-4">
                  <div className="text-xs text-zinc-400 mb-1">추가 할인율 프리미엄</div>
                  <div className="text-2xl font-bold text-red-400">
                    +{cascadeResult.summary.cascadeRiskPremium.toFixed(2)}%
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">할인율에 가산됨</p>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30 p-4">
                  <div className="text-xs text-zinc-400 mb-1">예상 손실 (EL)</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {cascadeResult.summary.expectedLoss.toFixed(1)}억
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">현금흐름에서 차감</p>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                  <div className="text-xs text-zinc-400 mb-1">영향받는 프로젝트</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {cascadeResult.summary.affectedProjects}건
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">직접 + 간접 영향</p>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30 p-4">
                  <div className="text-xs text-zinc-400 mb-1">평균 전파율</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {(cascadeResult.summary.avgTransmissionRate * 100).toFixed(0)}%
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">링크별 평균</p>
                </Card>
              </div>

              {/* 전파 경로 시각화 */}
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-400" />
                    연쇄 전파 경로
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setShowCascadeDetail(true)}>
                    상세 분석 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {[0, 1, 2, 3].map(level => {
                    const levelNodes = cascadeResult.nodes.filter(n => n.level === level)
                    if (levelNodes.length === 0) return null
                    
                    const levelLabels = ["트리거 (부도 발생)", "1차 영향 (프로젝트)", "2차 영향 (트랜치)", "3차 영향 (펀드)"]
                    const levelColors = ["red", "amber", "blue", "purple"]
                    
                    return (
                      <div key={level}>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={`text-${levelColors[level]}-400 border-${levelColors[level]}-400/50`}>
                            Level {level}
                          </Badge>
                          <span className="text-sm text-zinc-400">{levelLabels[level]}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {levelNodes.map(node => (
                            <div 
                              key={node.id}
                              className={`p-3 rounded-lg border ${
                                level === 0 ? "bg-red-500/10 border-red-500/30" :
                                node.impact >= 70 ? "bg-amber-500/10 border-amber-500/30" :
                                "bg-zinc-800/50 border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {node.type === "company" && <Building2 className="w-4 h-4 text-red-400" />}
                                {node.type === "project" && <Layers className="w-4 h-4 text-amber-400" />}
                                {node.type === "tranche" && <GitBranch className="w-4 h-4 text-blue-400" />}
                                {node.type === "fund" && <Shield className="w-4 h-4 text-purple-400" />}
                                <span className="font-medium text-sm">{node.name}</span>
                              </div>
                              {level > 0 && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-zinc-500">영향도</span>
                                    <span className={`ml-2 font-medium ${node.impact >= 70 ? "text-red-400" : "text-amber-400"}`}>
                                      {node.impact}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">손실</span>
                                    <span className="ml-2 font-medium text-red-400">{node.lossAmount}억</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {level < 3 && cascadeResult.nodes.some(n => n.level === level + 1) && (
                          <div className="flex justify-center my-3">
                            <ArrowDown className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* 가치평가 반영 내역 */}
              <Card className="bg-emerald-500/10 border-emerald-500/30 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  가치평가 반영 내역
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">기본 할인율</div>
                        <div className="text-xs text-zinc-500">무위험이자율 + 시장 프리미엄 + 신용 스프레드</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">{(config.riskFreeRate + config.discountPremium).toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">연쇄부도 리스크 프리미엄</div>
                        <div className="text-xs text-zinc-500">부도확률 x 평균전파율 x 영향계수</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium text-red-400">+{cascadeResult.summary.cascadeRiskPremium.toFixed(2)}%</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">최종 적용 할인율</div>
                        <div className="text-xs text-zinc-500">연쇄부도 리스크 반영</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-lg">{effectiveDiscountRate.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!cascadeEnabled && (
            <Card className="bg-zinc-800/30 border-zinc-700 p-12">
              <div className="text-center">
                <TrendingDown className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-400 mb-2">연쇄부도 시뮬레이션 비활성화</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  활성화하면 시공사/시행사 부도 시 포트폴리오 연쇄 영향이 가치평가에 반영됩니다.
                </p>
                <Button variant="outline" onClick={() => setCascadeEnabled(true)}>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  시뮬레이션 활성화
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* 평가 결과 탭 */}
        <TabsContent value="result" className="mt-6">
          {result ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-lg font-semibold mb-4">가치평가 결과</h3>
                <div className="space-y-4">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <div className="text-xs text-zinc-400 mb-1">공정가치 (Fair Value)</div>
                    <div className="text-3xl font-bold text-emerald-400">
                      {config.currentValue.toFixed(0)}억
                    </div>
                    {cascadeEnabled && cascadeResult && (
                      <div className="text-xs text-red-400 mt-1">
                        연쇄부도 영향 반영: -{cascadeResult.summary.expectedLoss.toFixed(1)}억
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                      <div className="text-xs text-zinc-400 mb-1">적용 할인율</div>
                      <div className="text-xl font-bold text-blue-400">
                        {effectiveDiscountRate.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                      <div className="text-xs text-zinc-400 mb-1">평가 방법론</div>
                      <div className="text-sm font-medium text-purple-400">
                        {currentMethodology?.name}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-lg font-semibold mb-4">AI 투자 의견</h3>
                <div className={`p-4 rounded-lg ${
                  cascadeEnabled ? "bg-amber-500/10 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/30"
                }`}>
                  <div className="flex items-start gap-3">
                    {cascadeEnabled ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                    )}
                    <div>
                      <div className={`font-semibold mb-1 ${cascadeEnabled ? "text-amber-400" : "text-emerald-400"}`}>
                        {cascadeEnabled ? "조건부 투자 검토" : "투자 적합"}
                      </div>
                      <p className="text-sm text-zinc-300">
                        {cascadeEnabled 
                          ? `시공사 신용등급(${config.companyRating}) 및 연쇄부도 리스크(+${cascadeResult?.summary.cascadeRiskPremium.toFixed(2)}%) 고려 시 추가 담보 확보 또는 보증 강화 필요.`
                          : `${currentMethodology?.name} 적용 시 IRR ${((config.riskFreeRate + config.discountPremium + 3) / 100 * 100).toFixed(1)}% 수준으로 투자 기준 충족.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="bg-zinc-800/30 border-zinc-700 p-12">
              <div className="text-center">
                <Calculator className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-400 mb-2">가치평가 실행 대기</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  방법론과 파라미터를 설정한 후 가치평가 실행 버튼을 클릭하세요.
                </p>
                <Button onClick={runWorkflow} disabled={isSimulating}>
                  <Play className="w-4 h-4 mr-2" />
                  가치평가 실행
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 파라미터 추가 위자드 */}
      <Dialog open={showParamWizard} onOpenChange={setShowParamWizard}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              평가 파라미터 추가
            </DialogTitle>
            <DialogDescription>
              온톨로지에서 추가할 파라미터를 선택하세요. 선택된 파라미터는 평가 모델에 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {ONTOLOGY_PARAMETERS.filter(p => !activeParams.includes(p.id)).map(param => (
                <button
                  key={param.id}
                  onClick={() => handleAddParameter(param.id)}
                  className="w-full p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{param.nameKr}</span>
                      <Badge variant="outline" className="text-[10px]">{param.category}</Badge>
                      {param.source === "ontology" && (
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                          <Link2 className="w-2 h-2 mr-1" />
                          온톨로지 연결
                        </Badge>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-zinc-500" />
                  </div>
                  <p className="text-xs text-zinc-500">{param.description}</p>
                  {param.impactDescription && (
                    <p className="text-xs text-blue-400 mt-1">
                      <Target className="w-3 h-3 inline mr-1" />
                      {param.impactDescription}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 방법론 상세 다이얼로그 */}
      <Dialog open={showMethodologyDetail} onOpenChange={setShowMethodologyDetail}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              {currentMethodology?.name}
            </DialogTitle>
            <DialogDescription>{currentMethodology?.standard}</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">설명</h4>
                <p className="text-sm text-zinc-400">{currentMethodology?.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">평가 수식</h4>
                <code className="block text-lg font-mono bg-zinc-800 p-4 rounded-lg text-emerald-400">
                  {currentMethodology?.formula}
                </code>
                <p className="text-sm text-zinc-400 mt-2">{currentMethodology?.formulaDescription}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">필수 파라미터</h4>
                <div className="space-y-2">
                  {currentMethodology?.requiredParams.map(p => (
                    <div key={p.id} className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.nameKr}</span>
                        <Badge variant="outline" className="text-[10px]">{p.name}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">적용 제약조건</h4>
                <ul className="space-y-2">
                  {currentMethodology?.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">참고문헌</h4>
                <ul className="space-y-1">
                  {currentMethodology?.references.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-zinc-400">{r.name}</span>
                      {r.url && <ExternalLink className="w-3 h-3 text-zinc-500" />}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 워크플로 실행 다이얼로그 */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-400" />
              가치평가 워크플로 실행
            </DialogTitle>
            <DialogDescription>
              {currentMethodology?.name} 방법론 기반 단계별 계산 과정
              {cascadeEnabled && " + 연쇄부도 영향 반영"}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-4">
              {workflowSteps.map((step, idx) => (
                <div 
                  key={step.id}
                  className={`p-4 rounded-lg border transition-all ${
                    step.status === "running" ? "bg-blue-500/10 border-blue-500/50 animate-pulse" :
                    step.status === "completed" ? "bg-emerald-500/10 border-emerald-500/30" :
                    step.status === "error" ? "bg-red-500/10 border-red-500/30" :
                    "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {step.status === "running" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                      {step.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {step.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />}
                      <span className="font-medium">{step.name}</span>
                      {step.id === "cascade_simulation" && (
                        <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px]">
                          <TrendingDown className="w-2 h-2 mr-1" />
                          연쇄부도
                        </Badge>
                      )}
                    </div>
                    {step.status === "completed" && (
                      <Badge className="bg-emerald-500/20 text-emerald-400">완료</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{step.description}</p>
                  
                  {step.formula && (
                    <code className="block text-xs font-mono bg-zinc-900/50 p-2 rounded mb-2 text-zinc-300">
                      {step.formula}
                    </code>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500">입력:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.inputs.map(i => (
                          <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500">출력:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.outputs.map(o => (
                          <Badge key={o} variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">{o}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {step.result && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <div className="text-xs text-zinc-500 mb-1">계산 결과:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(step.result).filter(([k]) => k !== "step").map(([key, value]) => (
                          <Badge key={key} className="bg-zinc-800 text-zinc-300">
                            {key}: <span className="text-emerald-400 ml-1">{String(value)}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Progress 
              value={(currentWorkflowStep / Math.max(1, workflowSteps.length)) * 100} 
              className="flex-1 h-2 [&>div]:bg-emerald-500" 
            />
            <DialogClose asChild>
              <Button variant="outline">닫기</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 연쇄부도 상세 다이얼로그 */}
      <Dialog open={showCascadeDetail} onOpenChange={setShowCascadeDetail}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              연쇄부도 시뮬레이션 상세 분석
            </DialogTitle>
            <DialogDescription>
              시공사({config.companyRating}) 부도 시 포트폴리오 영향 분석
            </DialogDescription>
          </DialogHeader>
          
          {cascadeResult && (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* 요약 */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-xs text-zinc-400">총 익스포저</div>
                    <div className="text-xl font-bold text-red-400">{cascadeResult.summary.totalExposure}억</div>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-xs text-zinc-400">직접 영향</div>
                    <div className="text-xl font-bold text-amber-400">{cascadeResult.summary.directImpact}억</div>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-xs text-zinc-400">간접 영향</div>
                    <div className="text-xl font-bold text-blue-400">{cascadeResult.summary.indirectImpact}억</div>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
                    <div className="text-xs text-zinc-400">예상 손실(EL)</div>
                    <div className="text-xl font-bold text-purple-400">{cascadeResult.summary.expectedLoss.toFixed(1)}억</div>
                  </div>
                </div>

                {/* 링크 상세 */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    전파 관계 상세
                  </h4>
                  <div className="space-y-2">
                    {cascadeResult.links.map((link, idx) => {
                      const fromNode = cascadeResult.nodes.find(n => n.id === link.from)
                      const toNode = cascadeResult.nodes.find(n => n.id === link.to)
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                          <Badge variant="outline">{fromNode?.name}</Badge>
                          <ArrowRight className="w-4 h-4 text-zinc-500" />
                          <Badge variant="outline">{toNode?.name}</Badge>
                          <Badge className="bg-blue-500/20 text-blue-400">{link.type}</Badge>
                          <span className="text-xs text-zinc-400 ml-auto">전파율: {(link.transmissionRate * 100).toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 가치평가 반영 공식 */}
                <div>
                  <h4 className="font-semibold mb-3">가치평가 반영 공식</h4>
                  <div className="p-4 bg-zinc-800/50 rounded-lg space-y-3">
                    <code className="block text-sm font-mono text-emerald-400">
                      Cascade Risk Premium = PD({config.companyRating}) × Avg.Transmission Rate × Impact Factor
                    </code>
                    <code className="block text-sm font-mono text-emerald-400">
                      = {(DEFAULT_PROBABILITIES[config.companyRating] * 100).toFixed(2)}% × {(cascadeResult.summary.avgTransmissionRate * 100).toFixed(0)}% × 2.0
                    </code>
                    <code className="block text-sm font-mono text-emerald-400">
                      = {cascadeResult.summary.cascadeRiskPremium.toFixed(2)}%
                    </code>
                    <Separator />
                    <code className="block text-sm font-mono text-amber-400">
                      Expected Loss = Total Exposure × PD × Transmission Rate
                    </code>
                    <code className="block text-sm font-mono text-amber-400">
                      = {cascadeResult.summary.totalExposure}억 × {(DEFAULT_PROBABILITIES[config.companyRating] * 100).toFixed(2)}% × {(cascadeResult.summary.avgTransmissionRate * 100).toFixed(0)}%
                    </code>
                    <code className="block text-sm font-mono text-amber-400">
                      = {cascadeResult.summary.expectedLoss.toFixed(1)}억
                    </code>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
