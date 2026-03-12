"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, User, ChevronRight, CheckCircle2, Loader2, Sparkles,
  Database, LinkIcon, Tag, Building2, Landmark, Shield, AlertTriangle,
  TrendingUp, Layers, Users, FileText, ArrowRight, RotateCcw, 
  HelpCircle, Settings, Network, RefreshCw
} from "lucide-react"
import { OntologyService } from "@/lib/ontology-service"
import { useToast } from "@/hooks/use-toast"

// ────────────────────────────────────────────────────────────────────────────
// Dynamic Question Types - Neo4j 객체/속성/관계 기반 동적 질문 생성
// ────────────────────────────────────────────────────────────────────────────
export interface DynamicQuestion {
  id: string
  question: string
  category: "object" | "attribute" | "relationship"
  sourceEntity?: string // Neo4j 객체명
  sourceProperty?: string // Neo4j 속성명
  sourceRelationship?: string // Neo4j 관계명
  isDefault: boolean
  isSelected: boolean
  priority: number
}

// Default questions generator based on Neo4j schema
export function generateDefaultQuestionsFromSchema(
  objects: { name: string; category?: string; properties?: { name: string; type: string }[] }[],
  links: { name: string; fromType: string; toType: string }[]
): DynamicQuestion[] {
  const questions: DynamicQuestion[] = []
  let priority = 1

  // Generate questions from objects
  objects.forEach(obj => {
    questions.push({
      id: `obj_${obj.name}`,
      question: `${obj.name} 객체를 포함하시겠습니까?`,
      category: "object",
      sourceEntity: obj.name,
      isDefault: true,
      isSelected: true,
      priority: priority++
    })

    // Generate questions from properties
    obj.properties?.forEach(prop => {
      questions.push({
        id: `prop_${obj.name}_${prop.name}`,
        question: `${obj.name}의 ${prop.name} 속성을 관리하시겠습니까?`,
        category: "attribute",
        sourceEntity: obj.name,
        sourceProperty: prop.name,
        isDefault: true,
        isSelected: prop.type === "number" || prop.name.includes("Rate") || prop.name.includes("Value"),
        priority: priority++
      })
    })
  })

  // Generate questions from relationships
  links.forEach(link => {
    questions.push({
      id: `rel_${link.name}`,
      question: `${link.fromType}와 ${link.toType} 간의 ${link.name} 관계를 모델링하시겠습니까?`,
      category: "relationship",
      sourceRelationship: link.name,
      isDefault: true,
      isSelected: true,
      priority: priority++
    })
  })

  return questions
}

// ────────────────────────────────────────────────────────────────────────────
// 분기형 질문 흐름 정의 - 대체투자 가치평가 관점
// ────────────────────────────────────────────────────────────────────────────
type StepId = 
  | "welcome" 
  | "investor_type" 
  | "asset_type" 
  | "customer_type"
  | "fund_structure"
  | "collateral_type"
  | "company_roles" 
  | "tranche_structure" 
  | "risk_metrics" 
  | "covenants" 
  | "valuation_method"
  | "dynamic_questions"
  | "review"

type SelectType = "single" | "multi" | "text"

interface Option { 
  value: string
  label: string
  desc?: string
  icon?: string
  nextStep?: StepId // 분기 로직
  condition?: (answers: Answers) => boolean // 조건부 표시
}

interface Step {
  id: StepId
  type: SelectType
  messages: string[]
  options?: Option[]
  placeholder?: string
  minSelect?: number
  conditionalDisplay?: (answers: Answers) => boolean // 조건부 스텝 표시
}

const WIZARD_STEPS: Step[] = [
  {
    id: "welcome",
    type: "single",
    messages: [
      "안녕하세요! 이지자산평가 온톨로지 구성 위자드입니다.",
      "몇 가지 질문에 답하시면 대체투자 자산평가에 최적화된 그래프 구조를 자동으로 생성해 드립니다.",
      "시작하시겠습니까?"
    ],
    options: [
      { value: "start", label: "네, 시작합니다", icon: "rocket", nextStep: "investor_type" },
    ]
  },
  {
    id: "investor_type",
    type: "single",
    messages: [
      "먼저 투자 주체의 역할을 선택해 주세요.",
      "GP(운용사)인지 LP(출자자)인지에 따라 관리해야 할 객체와 관계가 달라집니다."
    ],
    options: [
      { value: "gp", label: "GP (운용사/자산운용)", desc: "펀드 운용, 투자 결정, 자산 관리 담당", icon: "building2", nextStep: "asset_type" },
      { value: "lp", label: "LP (출자자/투자자)", desc: "펀드 출자, 수익 배분 수령", icon: "users", nextStep: "asset_type" },
      { value: "advisor", label: "투자자문/평가기관", desc: "자산 평가, 실사, 자문 서비스", icon: "filetext", nextStep: "asset_type" },
    ]
  },
  {
    id: "asset_type",
    type: "multi",
    messages: [
      "어떤 대체자산 유형을 평가/관리하시나요?",
      "선택하신 자산유형에 맞는 객체와 속성이 자동으로 구성됩니다. (복수 선택 가능)"
    ],
    minSelect: 1,
    options: [
      { value: "pf_development", label: "부동산 PF (개발형)", desc: "준공 전 개발 프로젝트 - 공정률/분양률 관리", icon: "construction" },
      { value: "real_estate", label: "수익형 부동산", desc: "오피스/상업/물류/호텔 - NOI/Cap Rate 관리", icon: "building" },
      { value: "infrastructure", label: "SOC 인프라", desc: "도로/항만/공항/에너지 - 사업권/수요 관리", icon: "road" },
      { value: "aircraft", label: "항공기", desc: "여객기/화물기 리스 - 잔존가치/리스료 관리", icon: "plane" },
      { value: "ship", label: "선박", desc: "컨테이너/벌크/탱커 - 용선료/잔존가치 관리", icon: "ship" },
      { value: "renewable", label: "신재생에너지", desc: "태양광/풍력/ESS - 발전량/PPA 관리", icon: "sun" },
    ]
  },
  {
    id: "customer_type",
    type: "single",
    messages: [
      "주요 고객 유형을 선택해 주세요.",
      "고객 유형에 따라 필요한 보고서 형식과 KPI가 달라집니다."
    ],
    options: [
      { value: "institutional", label: "기관투자자", desc: "연기금/공제회/보험사/은행 등", icon: "landmark", nextStep: "fund_structure" },
      { value: "corporate", label: "일반기업", desc: "건설사/시행사/운영사 등", icon: "building2", nextStep: "fund_structure" },
      { value: "financial", label: "금융기관", desc: "증권사/자산운용사/캐피탈 등", icon: "banknotes", nextStep: "fund_structure" },
      { value: "public", label: "공공기관", desc: "정부/지자체/공기업 등", icon: "shield", nextStep: "fund_structure" },
    ]
  },
  {
    id: "fund_structure",
    type: "single",
    messages: [
      "투자 구조(펀드 형태)를 선택해 주세요.",
      "구조에 따라 트랜치 및 수익 배분 로직이 달라집니다."
    ],
    options: [
      { value: "blind_pool", label: "블라인드 펀드", desc: "투자 대상 미확정 - 포트폴리오 구성 예정", icon: "layers", nextStep: "collateral_type" },
      { value: "project_fund", label: "프로젝트 펀드", desc: "특정 프로젝트 대상 - 단일 자산 투자", icon: "target", nextStep: "collateral_type" },
      { value: "club_deal", label: "클럽딜", desc: "복수 투자자 공동 투자 - 지분 구조", icon: "users", nextStep: "collateral_type" },
      { value: "direct", label: "직접 투자", desc: "펀드 없이 직접 자산 취득/관리", icon: "arrowright", nextStep: "collateral_type" },
    ]
  },
  {
    id: "collateral_type",
    type: "multi",
    messages: [
      "담보 유형을 선택해 주세요.",
      "담보 유형에 따라 LTV 계산 방식과 평가 기준이 달라집니다."
    ],
    minSelect: 1,
    options: [
      { value: "real_property", label: "부동산 담보", desc: "토지/건물/수익권 등", icon: "home" },
      { value: "movable", label: "동산 담보", desc: "기계/장비/항공기/선박 등", icon: "truck" },
      { value: "receivables", label: "채권 담보", desc: "매출채권/리스채권/PPA 수익 등", icon: "receipt" },
      { value: "equity", label: "지분 담보", desc: "SPC 지분/펀드 지분 등", icon: "piechart" },
      { value: "guarantee", label: "보증/신용보강", desc: "책임준공/연대보증/신용보험 등", icon: "shield" },
      { value: "none", label: "무담보", desc: "담보 없이 신용 기반 투자", icon: "alert" },
    ]
  },
  {
    id: "company_roles",
    type: "multi",
    messages: [
      "투자 구조에 관여하는 회사 역할을 선택하세요.",
      "각 역할이 그래프 노드로 생성되고, 프로젝트와 연결됩니다."
    ],
    minSelect: 1,
    options: [
      { value: "constructor", label: "시공사", desc: "건설 공사 실행 및 책임준공 담당", icon: "hammer" },
      { value: "developer", label: "시행사", desc: "부동산 개발 사업 기획 및 추진", icon: "pencil" },
      { value: "operator", label: "운영사/AM", desc: "자산 운영 및 관리 담당", icon: "settings" },
      { value: "trustee", label: "수탁사/신탁사", desc: "자금 관리 및 신탁 업무", icon: "vault" },
      { value: "guarantor", label: "보증기관", desc: "신용보강 및 보증 제공", icon: "shield" },
      { value: "lender", label: "대주단/금융기관", desc: "대출 제공 금융기관", icon: "bank" },
      { value: "appraiser", label: "감정평가사", desc: "담보 및 자산 가치 평가", icon: "search" },
    ]
  },
  {
    id: "tranche_structure",
    type: "multi",
    messages: [
      "투자 구조의 트랜치 구성을 선택하세요.",
      "선택하신 항목이 트랜치 노드로 생성되고 상환 우선순위가 설정됩니다."
    ],
    minSelect: 1,
    options: [
      { value: "senior", label: "선순위 (Senior)", desc: "우선 상환, 낮은 리스크, 낮은 수익률", icon: "1" },
      { value: "mezzanine", label: "중순위 (Mezzanine)", desc: "중간 위험/수익, 후순위 대출 또는 우선주", icon: "2" },
      { value: "junior", label: "후순위 (Junior)", desc: "높은 위험/수익, 선순위 상환 후 회수", icon: "3" },
      { value: "equity", label: "지분 (Equity)", desc: "자본금/출자금, 최종 배당", icon: "star" },
    ]
  },
  {
    id: "risk_metrics",
    type: "multi",
    messages: [
      "주로 관리할 리스크 지표(KPI)를 선택하세요.",
      "선택하신 지표가 프로젝트 속성으로 자동 생성됩니다."
    ],
    minSelect: 1,
    options: [
      { value: "ltv", label: "LTV (담보인정비율)", desc: "대출금액 / 담보가치 (%)", icon: "percent" },
      { value: "dscr", label: "DSCR (원리금상환비율)", desc: "영업이익 / 원리금 (배수)", icon: "calculator" },
      { value: "icr", label: "ICR (이자보상비율)", desc: "영업이익 / 이자비용 (배수)", icon: "trending" },
      { value: "irr", label: "IRR (내부수익률)", desc: "투자 수익률 (%)", icon: "target" },
      { value: "npv", label: "NPV (순현재가치)", desc: "현금흐름 현재가치 (억원)", icon: "coins" },
      { value: "cap_rate", label: "Cap Rate (자본환원율)", desc: "NOI / 자산가치 (%)", icon: "home" },
      { value: "noi", label: "NOI (순영업이익)", desc: "임대수익 - 운영비용 (억원)", icon: "receipt" },
      { value: "pd", label: "PD (부도확률)", desc: "차주 부도 확률 (%)", icon: "alert" },
    ]
  },
  {
    id: "covenants",
    type: "multi",
    messages: [
      "관리할 재무 약정(Covenant) 유형을 선택하세요.",
      "약정 위반 시 조기경보 알림이 발생합니다."
    ],
    options: [
      { value: "ltv_covenant", label: "LTV 약정", desc: "담보인정비율 유지 의무 (예: 70% 이하)", icon: "percent" },
      { value: "dscr_covenant", label: "DSCR 약정", desc: "원리금상환비율 유지 의무 (예: 1.2x 이상)", icon: "calculator" },
      { value: "completion", label: "공정률 약정", desc: "공사 진행률 달성 의무", icon: "construction" },
      { value: "presale", label: "분양률 약정", desc: "분양 목표 달성 의무", icon: "home" },
      { value: "occupancy", label: "임대율 약정", desc: "임대 목표 달성 의무", icon: "key" },
      { value: "cash_trap", label: "Cash Trap", desc: "현금 유보 조건 트���거", icon: "lock" },
      { value: "rating", label: "신용등급 유지", desc: "차주/보증인 신용등급 유지 의무", icon: "star" },
    ]
  },
  {
    id: "valuation_method",
    type: "multi",
    messages: [
      "사용할 가치평가 방법론을 선택하세요.",
      "선택하신 방법론이 시뮬레이션에서 사용 가능하도록 설정됩니다."
    ],
    options: [
      { value: "dcf", label: "DCF (할인현금흐름)", desc: "미래 현금흐름 현재가치화", icon: "trending" },
      { value: "npv", label: "NPV (순현재가치)", desc: "투자 대비 순수익 현재가치", icon: "coins" },
      { value: "irr", label: "IRR (내부수익률)", desc: "NPV=0이 되는 할인율", icon: "target" },
      { value: "cap_rate", label: "Cap Rate (자본환원율)", desc: "NOI 기반 자산가치 산정", icon: "home" },
      { value: "replacement", label: "대체원가법", desc: "동일자산 재취득 비용 기준", icon: "refresh" },
      { value: "residual", label: "잔여법 (개발형)", desc: "완공가치 - 사업비 = 토지가치", icon: "layers" },
    ]
  },
  {
    id: "dynamic_questions",
    type: "multi",
    messages: [
      "거의 다 됐어요! 아래는 Neo4j 그래프 스키마를 기반으로 자동 생성된 구성 질문입니다.",
      "필요한 항목을 선택하거나 사용자 정의 질문을 추가할 수 있습니다."
    ],
    options: [], // dynamically populated
    minSelect: 0
  },
  {
    id: "review",
    type: "single",
    messages: ["완벽해요! 아래 내용으로 대체투자 온톨로지를 구성할게요. 확인 후 '생성 시작'을 누르세요."],
    options: [
      { value: "confirm", label: "생성 시작", icon: "rocket" },
      { value: "restart", label: "처음부터 다시", icon: "refresh" },
    ]
  }
]

// ────────────────────────────────────────────────────────────────────────────
// 온톨로지 생성 엔진
// ────────────────────────────────────────────────────────────────────────────
type Answers = Record<StepId, string | string[]>

function buildOntologyFromAnswers(answers: Answers) {
  const investorType = (answers.investor_type as string) || "gp"
  const assetTypes = (answers.asset_type as string[]) || []
  const customerType = (answers.customer_type as string) || "institutional"
  const fundStructure = (answers.fund_structure as string) || "project_fund"
  const collateralTypes = (answers.collateral_type as string[]) || []
  const companyRoles = (answers.company_roles as string[]) || []
  const tranches = (answers.tranche_structure as string[]) || []
  const riskMetrics = (answers.risk_metrics as string[]) || []
  const covenants = (answers.covenants as string[]) || []
  const valuationMethods = (answers.valuation_method as string[]) || []

  const objects: any[] = []
  const links: any[] = []
  const props: any[] = []

  // ── 1. 투자자/펀드 객체 ──────────────────────────────────────────────
  const investorLabel = investorType === "gp" ? "AssetManager" : investorType === "lp" ? "Investor" : "Advisor"
  objects.push({
    name: investorLabel,
    description: `${investorType.toUpperCase()} - ${investorType === "gp" ? "자산운용사/GP" : investorType === "lp" ? "출자자/LP" : "투자자문사"}`,
    category: "investor",
    source: "ai-mapped",
    properties: [
      { id: "inv_name", name: "Name", type: "string", required: true },
      { id: "inv_aum", name: "AUM_B", type: "number", required: true },
      { id: "inv_type", name: "Investor_Type", type: "string", required: true },
    ],
    metadata: { neo4j_label: investorLabel, investor_type: investorType }
  })

  // 펀드 객체 (직접투자가 아닌 경우)
  if (fundStructure !== "direct") {
    objects.push({
      name: "Fund",
      description: `${fundStructure === "blind_pool" ? "블라인드 펀드" : fundStructure === "club_deal" ? "클럽딜 펀드" : "프로젝트 펀드"}`,
      category: "fund",
      source: "ai-mapped",
      properties: [
        { id: "fund_name", name: "Name", type: "string", required: true },
        { id: "fund_aum", name: "AUM_B", type: "number", required: true },
        { id: "fund_vintage", name: "Vintage_Year", type: "number", required: true },
        { id: "fund_target", name: "Target_Return", type: "number", required: false },
      ],
      metadata: { neo4j_label: "Fund", structure: fundStructure }
    })
    links.push({ name: "MANAGES", fromType: investorLabel, toType: "Fund", bidirectional: false, neo4jType: "MANAGES", description: `${investorLabel}가 펀드 운용` })
  }

  // ── 2. 프로젝트 객체 (자산유형별) ──────────────────────────────────────────
  const projectMap: Record<string, any> = {
    pf_development: { name: "PF_Project", description: "부동산 PF 개발 사업", neo4j_label: "Project", asset_type: "PF_DEVELOPMENT" },
    real_estate: { name: "Real_Estate", description: "수익형 부동산 자산", neo4j_label: "Project", asset_type: "REAL_ESTATE" },
    infrastructure: { name: "Infrastructure", description: "SOC 인프라 자산", neo4j_label: "Project", asset_type: "INFRASTRUCTURE" },
    aircraft: { name: "Aircraft", description: "항공기 리스 자산", neo4j_label: "Project", asset_type: "AIRCRAFT" },
    ship: { name: "Ship", description: "선박 리스 자산", neo4j_label: "Project", asset_type: "SHIP" },
    renewable: { name: "Renewable_Energy", description: "신재생에너지 자산", neo4j_label: "Project", asset_type: "RENEWABLE_ENERGY" },
  }

  const projectNames: string[] = []
  assetTypes.forEach(type => {
    const template = projectMap[type]
    if (!template) return
    
    // 자산유형별 특화 속성 추가
    const assetSpecificProps: any[] = [
      { id: `${type}_name`, name: "Name", type: "string", required: true },
      { id: `${type}_value`, name: "Current_Value_B", type: "number", required: true },
      { id: `${type}_status`, name: "Status", type: "string", required: true },
    ]
    
    // PF 개발형 특화 속성
    if (type === "pf_development") {
      assetSpecificProps.push(
        { id: `${type}_completion`, name: "Completion_Rate", type: "number", required: true },
        { id: `${type}_presale`, name: "Presale_Rate", type: "number", required: false },
        { id: `${type}_gdv`, name: "GDV_B", type: "number", required: true }
      )
    }
    
    // 수익형 부동산 특화 속성
    if (type === "real_estate") {
      assetSpecificProps.push(
        { id: `${type}_noi`, name: "NOI_B", type: "number", required: true },
        { id: `${type}_cap_rate`, name: "Cap_Rate", type: "number", required: true },
        { id: `${type}_occupancy`, name: "Occupancy_Rate", type: "number", required: true }
      )
    }
    
    // 항공기/선박 특화 속성
    if (type === "aircraft" || type === "ship") {
      assetSpecificProps.push(
        { id: `${type}_residual`, name: "Residual_Value_B", type: "number", required: true },
        { id: `${type}_lease_rate`, name: "Lease_Rate", type: "number", required: true },
        { id: `${type}_age`, name: "Asset_Age", type: "number", required: true }
      )
    }
    
    // 신재생에너지 특화 속성
    if (type === "renewable") {
      assetSpecificProps.push(
        { id: `${type}_capacity`, name: "Capacity_MW", type: "number", required: true },
        { id: `${type}_ppa_price`, name: "PPA_Price", type: "number", required: true },
        { id: `${type}_cf`, name: "Capacity_Factor", type: "number", required: true }
      )
    }

    objects.push({
      name: template.name,
      description: template.description,
      category: "project",
      source: "ai-mapped",
      properties: assetSpecificProps,
      metadata: { neo4j_label: template.neo4j_label, asset_type: template.asset_type }
    })
    projectNames.push(template.name)

    // 펀드-프로젝트 관계
    if (fundStructure !== "direct") {
      links.push({ name: "INVESTS_IN", fromType: "Fund", toType: template.name, bidirectional: false, neo4jType: "INVESTS_IN", description: `펀드의 ${template.name} 투자` })
    } else {
      links.push({ name: "OWNS", fromType: investorLabel, toType: template.name, bidirectional: false, neo4jType: "OWNS", description: `${investorLabel}의 ${template.name} 직접 보유` })
    }
  })

  // ── 3. 회사 객체 ──────────────────────────────────────────────
  const companyMap: Record<string, any> = {
    constructor: { name: "Constructor", description: "시공사 - 건설 공사 실행 및 책임준공 담당", role: "시공사" },
    developer: { name: "Developer", description: "시행사 - 부동산 개발 사업 기획 및 추진", role: "시행사" },
    operator: { name: "Operator", description: "운영사 - 자산 운영 및 관리 담당", role: "운영사" },
    trustee: { name: "Trustee", description: "수탁사 - 자금 관리 및 신탁 업무", role: "수탁사" },
    guarantor: { name: "Guarantor", description: "보증기관 - 신용보강 및 보증 제공", role: "보증기관" },
    lender: { name: "Lender", description: "대주단 - 대출 제공 금융기관", role: "대주단" },
    appraiser: { name: "Appraiser", description: "감정평가사 - 담보 및 자산 가치 평가", role: "감정평가사" },
  }

  companyRoles.forEach(role => {
    const template = companyMap[role]
    if (!template) return
    objects.push({
      name: template.name,
      description: template.description,
      category: "company",
      source: "ai-mapped",
      properties: [
        { id: `${role}_name`, name: "Name", type: "string", required: true },
        { id: `${role}_rating`, name: "Credit_Rating", type: "string", required: true },
        { id: `${role}_pd`, name: "Default_Probability", type: "number", required: false }
      ],
      metadata: { neo4j_label: "Company", role: template.role }
    })

    // 회사-프로젝트 관계
    projectNames.forEach(projName => {
      if (role === "constructor" && (projName.includes("PF") || projName.includes("Real"))) {
        links.push({ name: "CONSTRUCTS", fromType: template.name, toType: projName, bidirectional: false, neo4jType: "CONSTRUCTS", description: "시공사의 건설 책임" })
      }
      if (role === "developer" && projName.includes("PF")) {
        links.push({ name: "DEVELOPS", fromType: template.name, toType: projName, bidirectional: false, neo4jType: "DEVELOPS", description: "시행사의 개발 사업 추진" })
      }
      if (role === "operator") {
        links.push({ name: "OPERATES", fromType: template.name, toType: projName, bidirectional: false, neo4jType: "OPERATES", description: "운영사의 자산 운영" })
      }
      if (role === "lender") {
        links.push({ name: "LENDS_TO", fromType: template.name, toType: projName, bidirectional: false, neo4jType: "LENDS_TO", description: "대주단의 대출 제공" })
      }
    })
  })

  // ── 4. 트랜치 객체 ──────────────────────────────────────────
  const trancheMap: Record<string, any> = {
    senior: { name: "Senior_Tranche", description: "선순위 트랜치 - 우선 상환", seniority: "SENIOR", priority: 1 },
    mezzanine: { name: "Mezzanine_Tranche", description: "중순위 트랜치 - 중간 위험/수익", seniority: "MEZZANINE", priority: 2 },
    junior: { name: "Junior_Tranche", description: "후순위 트랜치 - 높은 위험/수익", seniority: "JUNIOR", priority: 3 },
    equity: { name: "Equity_Tranche", description: "지분 트랜치 - 자본금/출자금", seniority: "EQUITY", priority: 4 },
  }

  tranches.forEach(tr => {
    const template = trancheMap[tr]
    if (!template) return
    objects.push({
      name: template.name,
      description: template.description,
      category: "tranche",
      source: "ai-mapped",
      properties: [
        { id: `${tr}_amount`, name: "Amount_B", type: "number", required: true },
        { id: `${tr}_ratio`, name: "Ratio", type: "number", required: true },
        { id: `${tr}_rate`, name: "Interest_Rate", type: "number", required: true },
        { id: `${tr}_el`, name: "Expected_Loss", type: "number", required: false }
      ],
      metadata: { neo4j_label: "Tranche", seniority: template.seniority, priority: template.priority }
    })

    // 프로젝트-트랜치 관계
    projectNames.forEach(projName => {
      links.push({ name: "HAS_TRANCHE", fromType: projName, toType: template.name, bidirectional: false, neo4jType: "HAS_TRANCHE", description: `${projName}의 ${template.name}` })
    })

    // 트랜치-펀드 관계
    if (fundStructure !== "direct") {
      links.push({ name: "HELD_BY", fromType: template.name, toType: "Fund", bidirectional: false, neo4jType: "HELD_BY", description: `펀드의 ${template.name} 보유` })
    }
  })

  // ── 5. 담보 객체 ──────────────────────────────────────────
  const collateralMap: Record<string, any> = {
    real_property: { name: "Real_Property_Collateral", description: "부동산 담보 - 토지/건물/수익권", type: "REAL_PROPERTY" },
    movable: { name: "Movable_Collateral", description: "동산 담보 - 기계/장비/항공기/선박", type: "MOVABLE" },
    receivables: { name: "Receivables_Collateral", description: "채권 담보 - 매출채권/리스채권/PPA", type: "RECEIVABLES" },
    equity: { name: "Equity_Collateral", description: "지분 담보 - SPC지분/펀드지분", type: "EQUITY" },
    guarantee: { name: "Guarantee", description: "보증/신용보강 - 책임준공/연대보증", type: "GUARANTEE" },
  }

  collateralTypes.filter(c => c !== "none").forEach(colType => {
    const template = collateralMap[colType]
    if (!template) return
    objects.push({
      name: template.name,
      description: template.description,
      category: "collateral",
      source: "ai-mapped",
      properties: [
        { id: `${colType}_value`, name: "Appraised_Value_B", type: "number", required: true },
        { id: `${colType}_liq`, name: "Liquidation_Value_B", type: "number", required: true },
        { id: `${colType}_haircut`, name: "Haircut", type: "number", required: true }
      ],
      metadata: { neo4j_label: "Collateral", collateral_type: template.type }
    })

    projectNames.forEach(projName => {
      links.push({ name: "SECURED_BY", fromType: projName, toType: template.name, bidirectional: false, neo4jType: "SECURED_BY", description: `${projName}의 담보 설정` })
    })
  })

  // ── 6. 약정 객체 ──────────────────────────────────────────
  if (covenants.length > 0) {
    objects.push({
      name: "Financial_Covenant",
      description: "재무 약정 - LTV/DSCR/ICR 등 기준",
      category: "covenant",
      source: "ai-mapped",
      properties: [
        { id: "cov_type", name: "Type", type: "string", required: true },
        { id: "cov_threshold", name: "Threshold", type: "number", required: true },
        { id: "cov_current", name: "Current_Value", type: "number", required: true },
        { id: "cov_status", name: "Status", type: "string", required: true },
        { id: "cov_direction", name: "Direction", type: "string", required: true }
      ],
      metadata: { neo4j_label: "Covenant", covenant_types: covenants }
    })

    projectNames.forEach(projName => {
      links.push({ name: "HAS_COVENANT", fromType: projName, toType: "Financial_Covenant", bidirectional: false, neo4jType: "HAS_COVENANT", description: `${projName}의 재무 약정` })
    })
  }

  // ── 7. 신용이벤트 객체 ──────────────────────────────────────
  objects.push({
    name: "Credit_Event",
    description: "신용 이벤트 - 부도/구조조정/등급하락 등",
    category: "credit_event",
    source: "ai-mapped",
    properties: [
      { id: "evt_type", name: "Type", type: "string", required: true },
      { id: "evt_date", name: "Occurred_Date", type: "date", required: true },
      { id: "evt_severity", name: "Severity", type: "string", required: true },
      { id: "evt_loss", name: "Estimated_Loss_B", type: "number", required: false }
    ],
    metadata: { neo4j_label: "CreditEvent" }
  })

  companyRoles.forEach(role => {
    const template = companyMap[role]
    if (template) {
      links.push({ name: "TRIGGERS", fromType: template.name, toType: "Credit_Event", bidirectional: false, neo4jType: "TRIGGERS", description: `${template.role} 관련 신용 이벤트` })
    }
  })
  projectNames.forEach(projName => {
    links.push({ name: "AFFECTS", fromType: "Credit_Event", toType: projName, bidirectional: false, neo4jType: "AFFECTS", description: "신용 이벤트가 프로젝트에 영향" })
  })

  // ── 8. KPI 속성 생성 ────────────────────────────────────────
  const kpiMap: Record<string, any> = {
    ltv: { name: "LTV", dataType: "number", description: "담보인정비율 Loan-to-Value (%)" },
    dscr: { name: "DSCR", dataType: "number", description: "원리금상환비율 Debt Service Coverage Ratio (배)" },
    icr: { name: "ICR", dataType: "number", description: "이자보상비율 Interest Coverage Ratio (배)" },
    irr: { name: "IRR", dataType: "number", description: "내부수익률 Internal Rate of Return (%)" },
    npv: { name: "NPV_B", dataType: "number", description: "순현재가치 Net Present Value (억원)" },
    cap_rate: { name: "Cap_Rate", dataType: "number", description: "자본환원율 Capitalization Rate (%)" },
    noi: { name: "NOI_B", dataType: "number", description: "순영업이익 Net Operating Income (억원)" },
    pd: { name: "Default_Probability", dataType: "number", description: "부도확률 PD (%)" },
  }

  riskMetrics.forEach(metric => {
    const template = kpiMap[metric]
    if (!template) return
    props.push({
      name: template.name,
      dataType: template.dataType,
      description: template.description,
      usedBy: projectNames,
      source: "ai-mapped"
    })
  })

  return { 
    objects, 
    links, 
    props,
    summary: {
      investorType,
      assetTypes,
      customerType,
      fundStructure,
      collateralTypes,
      companyRoles,
      tranches,
      riskMetrics,
      covenants,
      valuationMethods
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OntologyWizardDialog({ open, onOpenChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({} as Answers)
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([])
  const [textInput, setTextInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedOntology, setGeneratedOntology] = useState<ReturnType<typeof buildOntologyFromAnswers> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  
  // Dynamic questions state
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([])
  const [questionFilter, setQuestionFilter] = useState<"all" | "object" | "attribute" | "relationship">("all")
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)

  // Load dynamic questions when reaching that step
  const loadDynamicQuestions = useCallback(async () => {
    setIsLoadingQuestions(true)
    try {
      // Get existing objects and links from the generated ontology or create preview
      const previewOntology = buildOntologyFromAnswers(answers)
      const questions = generateDefaultQuestionsFromSchema(
        previewOntology.objects,
        previewOntology.links
      )
      setDynamicQuestions(questions)
    } catch (error) {
      console.error("Error loading dynamic questions:", error)
      // Generate fallback questions
      setDynamicQuestions([
        { id: "q1", question: "프로젝트 가치평가 모델을 구성하시겠습니까?", category: "object", isDefault: true, isSelected: true, priority: 1 },
        { id: "q2", question: "리스크 지표(LTV, DSCR)를 관리하시겠습니까?", category: "attribute", isDefault: true, isSelected: true, priority: 2 },
        { id: "q3", question: "시공사-프로젝트 관계를 모델링하시겠습니까?", category: "relationship", isDefault: true, isSelected: true, priority: 3 },
      ])
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [answers])

  const toggleQuestion = (id: string) => {
    setDynamicQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, isSelected: !q.isSelected } : q)
    )
  }

  const selectAllQuestions = (category?: "object" | "attribute" | "relationship") => {
    setDynamicQuestions(prev => 
      prev.map(q => (!category || q.category === category) ? { ...q, isSelected: true } : q)
    )
  }

  const deselectAllQuestions = (category?: "object" | "attribute" | "relationship") => {
    setDynamicQuestions(prev => 
      prev.map(q => (!category || q.category === category) ? { ...q, isSelected: false } : q)
    )
  }

  const filteredQuestions = dynamicQuestions.filter(q => 
    questionFilter === "all" || q.category === questionFilter
  )

  // 현재 표시할 스텝 시퀀스 계산
  const [stepSequence, setStepSequence] = useState<StepId[]>(["welcome"])
  const currentStepId = stepSequence[stepIndex]
  const currentStep = WIZARD_STEPS.find(s => s.id === currentStepId)!
  const progress = ((stepIndex + 1) / stepSequence.length) * 100

  useEffect(() => {
    if (open && stepIndex === 0 && messages.length === 0) {
      pushBotMessages(WIZARD_STEPS[0].messages)
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function pushBotMessages(texts: string[]) {
    texts.forEach((text, i) => {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "bot", text }])
      }, i * 400)
    })
  }

  function calculateNextSteps(currentId: StepId, selectedValue?: string): StepId[] {
    // 기본 순서 - dynamic_questions 추가
    const defaultSequence: StepId[] = [
      "welcome", "investor_type", "asset_type", "customer_type", 
      "fund_structure", "collateral_type", "company_roles", 
      "tranche_structure", "risk_metrics", "covenants", "valuation_method", 
      "dynamic_questions", "review"
    ]
    
    const currentIndex = defaultSequence.indexOf(currentId)
    if (currentIndex === -1) return defaultSequence
    
    // 현재까지의 시퀀스 유지 + 나머지
    return [...stepSequence.slice(0, stepIndex + 1), ...defaultSequence.slice(currentIndex + 1)]
  }

  function handleOptionSelect(value: string) {
    if (currentStep.type === "single") {
      if (currentStep.id === "review") {
        if (value === "confirm") {
          handleGenerate()
        } else {
          resetWizard()
        }
        return
      }
      
      setAnswers(prev => ({ ...prev, [currentStep.id]: value }))
      const label = currentStep.options?.find(o => o.value === value)?.label || value
      setMessages(prev => [...prev, { role: "user", text: label }])
      
      // 다음 스텝 시퀀스 업데이트
      const newSequence = calculateNextSteps(currentStep.id, value)
      setStepSequence(newSequence)
      goNext()
    } else if (currentStep.type === "multi") {
      const current = (answers[currentStep.id] as string[]) || []
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      setAnswers(prev => ({ ...prev, [currentStep.id]: updated }))
    }
  }

  function handleMultiConfirm() {
    const selected = (answers[currentStep.id] as string[]) || []
    if (currentStep.minSelect && selected.length < currentStep.minSelect) {
      toast({ title: "선택 필요", description: `최소 ${currentStep.minSelect}개를 선택해 주세요.`, variant: "destructive" })
      return
    }
    const labels = selected.map(v => currentStep.options?.find(o => o.value === v)?.label || v)
    setMessages(prev => [...prev, { role: "user", text: labels.join(", ") }])
    goNext()
  }

  function goNext() {
    const nextIndex = stepIndex + 1
    if (nextIndex < stepSequence.length) {
      setStepIndex(nextIndex)
      setTimeout(() => {
        const nextStep = WIZARD_STEPS.find(s => s.id === stepSequence[nextIndex])
        if (nextStep) {
          if (nextStep.id === "dynamic_questions") {
            // Load dynamic questions from Neo4j schema
            loadDynamicQuestions()
          }
          if (nextStep.id === "review") {
            const ontology = buildOntologyFromAnswers(answers)
            setGeneratedOntology(ontology)
          }
          pushBotMessages(nextStep.messages)
        }
      }, 500)
    }
  }

  function resetWizard() {
    setStepIndex(0)
    setStepSequence(["welcome"])
    setAnswers({} as Answers)
    setMessages([])
    setGeneratedOntology(null)
    setTimeout(() => pushBotMessages(WIZARD_STEPS[0].messages), 200)
  }

  async function handleGenerate() {
    if (!generatedOntology) return
    setIsGenerating(true)
    try {
      await OntologyService.seedCustomData(
        generatedOntology.objects,
        generatedOntology.links,
        generatedOntology.props
      )
      toast({ title: "온톨로지 생성 완료", description: `${generatedOntology.objects.length}개 객체, ${generatedOntology.links.length}개 관계가 생성되었습니다.` })
      onOpenChange(false)
      resetWizard()
    } catch (e: any) {
      toast({ title: "생성 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedMulti = (answers[currentStep?.id] as string[]) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* 고정 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
              이지자산평가 온톨로지 구성 위자드
            </DialogTitle>
            <DialogDescription>
              대체투자 자산평가에 최적화된 그래프 구조를 자동으로 생성합니다.
            </DialogDescription>
          </DialogHeader>
          
          {/* 진행 상태 바 */}
          <div className="flex items-center gap-4 mt-4">
            <Progress value={progress} className="flex-1 h-2 [&>div]:bg-purple-500" />
            <Badge variant="outline" className="text-purple-400 border-purple-400/50 shrink-0">
              {stepIndex + 1} / {stepSequence.length}
            </Badge>
          </div>
        </div>

        {/* 스크롤 가능한 대화 영역 */}
        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea ref={scrollRef} className="h-full py-4">
            <div className="space-y-4 pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div className={`max-w-[75%] p-3 rounded-lg ${
                    msg.role === "bot" 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "bg-purple-600 text-white"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-zinc-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 고정 하단 - 선택 옵션 영역 */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4 space-y-4">
          {/* Review 단계 - 생성될 온톨로지 요약 */}
          {currentStep?.id === "review" && generatedOntology ? (
            <Card className="bg-zinc-800/50 border-zinc-700 p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                생성될 온톨로지 구조
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-zinc-400 text-xs mb-1">객체 (Nodes)</div>
                  <div className="text-2xl font-bold text-emerald-400">{generatedOntology.objects.length}개</div>
                  <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    {generatedOntology.objects.slice(0, 3).map(o => o.name).join(", ")}...
                  </div>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-zinc-400 text-xs mb-1">관계 (Links)</div>
                  <div className="text-2xl font-bold text-blue-400">{generatedOntology.links.length}개</div>
                  <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    {generatedOntology.links.slice(0, 2).map(l => l.name).join(", ")}...
                  </div>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-zinc-400 text-xs mb-1">속성 (Props)</div>
                  <div className="text-2xl font-bold text-purple-400">{generatedOntology.props.length}개</div>
                  <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    {generatedOntology.props.slice(0, 2).map(p => p.name).join(", ")}...
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Single 선택 옵션 */}
          {currentStep?.type === "single" && currentStep.options && (
            <div className="grid grid-cols-2 gap-3">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleOptionSelect(opt.value)}
                  disabled={isGenerating}
                  className="flex items-start gap-3 p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-purple-500/50 transition-all text-left disabled:opacity-50 group"
                >
                  <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{opt.label}</div>
                    {opt.desc && <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{opt.desc}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Multi 선택 옵션 */}
          {currentStep?.type === "multi" && currentStep.id !== "dynamic_questions" && currentStep.options && (
            <div className="space-y-3">
              <ScrollArea className="h-[180px]">
                <div className="grid grid-cols-2 gap-2 pr-4">
                  {currentStep.options.map((opt) => {
                    const isSelected = selectedMulti.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleOptionSelect(opt.value)}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          isSelected 
                            ? "border-purple-500 bg-purple-500/20" 
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? "bg-purple-500 border-purple-500" : "border-zinc-600"
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{opt.label}</div>
                          {opt.desc && <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{opt.desc}</div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <Badge variant="outline" className="text-zinc-400">
                  {selectedMulti.length}개 선택됨 {currentStep.minSelect && `(최소 ${currentStep.minSelect}개)`}
                </Badge>
                <Button 
                  onClick={handleMultiConfirm} 
                  disabled={currentStep.minSelect ? selectedMulti.length < currentStep.minSelect : false}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  다음 단계
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Dynamic Questions Step - Neo4j 기반 동적 질문 */}
          {currentStep?.id === "dynamic_questions" && (
            <div className="space-y-4">
              {/* Filter tabs */}
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <span className="text-xs text-zinc-500">필터:</span>
                {[
                  { value: "all" as const, label: "전체", icon: Settings },
                  { value: "object" as const, label: "객체", icon: Database },
                  { value: "attribute" as const, label: "속성", icon: Tag },
                  { value: "relationship" as const, label: "관계", icon: Network },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={questionFilter === value ? "default" : "outline"}
                    onClick={() => setQuestionFilter(value)}
                    className={`h-7 text-xs ${questionFilter === value ? "bg-purple-600" : "border-zinc-700"}`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => selectAllQuestions(questionFilter === "all" ? undefined : questionFilter)} className="h-7 text-xs text-emerald-400">
                  전체 선택
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deselectAllQuestions(questionFilter === "all" ? undefined : questionFilter)} className="h-7 text-xs text-zinc-400">
                  전체 해제
                </Button>
              </div>

              {/* Questions list with scrollbar */}
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span className="text-sm text-zinc-400">Neo4j 스키마에서 질문 생성 중...</span>
                </div>
              ) : (
                <ScrollArea className="h-[220px]">
                  <div className="space-y-2 pr-4">
                    {filteredQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          q.isSelected
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-zinc-700 bg-zinc-800/30 hover:border-zinc-600"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          q.isSelected ? "bg-purple-500 border-purple-500" : "border-zinc-600"
                        }`}>
                          {q.isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-3 h-3 text-zinc-500" />
                            <span className="text-sm text-zinc-200">{q.question}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={`text-[9px] ${
                              q.category === "object" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              q.category === "attribute" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-green-500/20 text-green-400 border-green-500/30"
                            }`}>
                              {q.category === "object" ? "객체" : q.category === "attribute" ? "속성" : "관계"}
                            </Badge>
                            {q.sourceEntity && (
                              <span className="text-[10px] text-zinc-500 font-mono">{q.sourceEntity}</span>
                            )}
                            {q.sourceProperty && (
                              <span className="text-[10px] text-zinc-500 font-mono">.{q.sourceProperty}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Summary and next button */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-zinc-400">
                    {dynamicQuestions.filter(q => q.isSelected).length} / {dynamicQuestions.length} 선택됨
                  </Badge>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-blue-400">객체: {dynamicQuestions.filter(q => q.category === "object" && q.isSelected).length}</span>
                    <span className="text-orange-400">속성: {dynamicQuestions.filter(q => q.category === "attribute" && q.isSelected).length}</span>
                    <span className="text-green-400">관계: {dynamicQuestions.filter(q => q.category === "relationship" && q.isSelected).length}</span>
                  </div>
                </div>
                <Button
                  onClick={goNext}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  다음 단계
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* 생성 중 로딩 */}
          {isGenerating && (
            <div className="flex items-center justify-center py-6 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-sm text-zinc-400">온톨로지 생성 중...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
