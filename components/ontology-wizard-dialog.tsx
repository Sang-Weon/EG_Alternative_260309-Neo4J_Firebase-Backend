"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Bot, User, ChevronRight, CheckCircle2, Loader2, Sparkles,
  Database, LinkIcon, Tag, Building2, Factory, Cpu, Package,
  BarChart3, Truck, Lightbulb, RotateCcw
} from "lucide-react"
import { OntologyService } from "@/lib/ontology-service"
import { useToast } from "@/hooks/use-toast"

// ────────────────────────────────────────────────────────────────────────────
// 질문 흐름 데이터 정의
// ────────────────────────────────────────────────────────────────────────────
type StepId = "domain" | "org_name" | "org_structure" | "operations" | "supply_chain" | "kpis" | "review"
type SelectType = "single" | "multi" | "text"

interface Option { value: string; label: string; desc?: string; icon?: string }
interface Step {
  id: StepId
  type: SelectType
  messages: string[]
  options?: Option[]
  placeholder?: string
  minSelect?: number
}

const STEPS: Step[] = [
  {
    id: "domain",
    type: "single",
    messages: [
      "안녕하세요! 저는 온톨로지 구성을 도와드릴 AI 위자드입니다.",
      "처음 설정이라도 괜찮아요. 몇 가지 질문에 답하시면 최적화된 객체·관계·속성을 자동으로 만들어 드릴게요.",
      "먼저, 어떤 업종/비즈니스 도메인을 모델링하시겠어요?"
    ],
    options: [
      { value: "manufacturing", label: "제조업", desc: "공장·공정·부품·완제품 관리", icon: "🏭" },
      { value: "logistics",     label: "유통/물류", desc: "창고·배송·공급망 관리", icon: "🚚" },
      { value: "finance",       label: "금융/서비스", desc: "고객·상품·계약·리스크 관리", icon: "🏦" },
      { value: "it",            label: "IT/소프트웨어", desc: "시스템·서비스·개발팀 관리", icon: "💻" },
      { value: "healthcare",    label: "의료/바이오", desc: "환자·시설·의약품·임상 관리", icon: "🏥" },
    ]
  },
  {
    id: "org_name",
    type: "text",
    messages: ["좋아요! 그럼 회사 또는 사업부 이름을 입력해 주세요. 객체 이름에 사용됩니다."],
    placeholder: "예: 드림텍, Dreamtech, ABC제조"
  },
  {
    id: "org_structure",
    type: "multi",
    messages: ["조직 구조를 설정할게요. 해당하는 조직 단위를 모두 선택하세요. (복수 선택 가능)"],
    minSelect: 1,
    options: [
      { value: "hq",             label: "본사 (HQ)",       desc: "경영 전략 및 총괄 관리", icon: "🏢" },
      { value: "domestic_plant", label: "국내 공장/사업장", desc: "국내 생산 또는 운영 거점", icon: "🏭" },
      { value: "overseas_plant", label: "해외 공장/사업장", desc: "해외 생산 또는 운영 거점", icon: "🌏" },
      { value: "rd_center",      label: "R&D 연구소",      desc: "신제품 개발 및 공정 혁신", icon: "🔬" },
      { value: "sales_office",   label: "영업/마케팅 조직", desc: "영업 채널 및 고객 관리", icon: "📊" },
      { value: "warehouse",      label: "물류창고/물류센터", desc: "재고 보관 및 출하 허브", icon: "📦" },
    ]
  },
  {
    id: "operations",
    type: "multi",
    messages: [
      "핵심 업무 활동이나 공정을 선택해 주세요.",
      "선택하신 항목이 주요 Process 객체로 생성됩니다."
    ],
    minSelect: 1,
    options: [] // 도메인별로 동적 생성
  },
  {
    id: "supply_chain",
    type: "multi",
    messages: ["공급망 구성 요소를 선택하세요. 관련된 항목을 모두 골라주세요."],
    options: [
      { value: "raw_material",      label: "핵심 부품/원자재",   desc: "생산에 투입되는 핵심 재료", icon: "⚙️" },
      { value: "wip",               label: "반제품 (WIP)",       desc: "공정 중간 상태의 산출물", icon: "🔧" },
      { value: "finished_product",  label: "완제품",             desc: "최종 판매 또는 납품 제품", icon: "📱" },
      { value: "equipment",         label: "생산 설비/장비",     desc: "제조에 사용되는 기계나 시스템", icon: "🖥️" },
      { value: "supplier",          label: "핵심 공급업체",      desc: "부품/서비스를 납품하는 외부사", icon: "🤝" },
      { value: "customer",          label: "주요 고객사",        desc: "완제품을 수령하는 고객 기업", icon: "🏪" },
      { value: "logistics_partner", label: "물류/운송 파트너",   desc: "배송·통관·창고 협력사", icon: "🚛" },
    ]
  },
  {
    id: "kpis",
    type: "multi",
    messages: [
      "마지막으로, 어떤 지표(KPI)를 주로 관리하시나요?",
      "선택하신 KPI가 속성(Property)으로 자동 생성되어 각 객체에 연결됩니다."
    ],
    minSelect: 1,
    options: [
      { value: "utilization",   label: "가동율 (Utilization)",       desc: "설비·라인 가동 비율 (%)", icon: "⚡" },
      { value: "yield_rate",    label: "수율 (Yield Rate)",          desc: "양품 비율 (%)", icon: "✅" },
      { value: "defect_rate",   label: "불량율 (Defect Rate)",       desc: "불량품 비율 (%)", icon: "❌" },
      { value: "lead_time",     label: "리드타임 (Lead Time)",       desc: "납기·공정 소요 기간 (일)", icon: "⏱️" },
      { value: "stock_level",   label: "재고수위 (Stock Level)",     desc: "보유 재고 수량 (pcs)", icon: "📦" },
      { value: "unit_price",    label: "단가/원가 (Unit Price/Cost)", desc: "부품 단가 또는 제조원가 (원)", icon: "💰" },
      { value: "oee",           label: "OEE (설비종합효율)",         desc: "가용성×성능×품질 종합 지표 (%)", icon: "📈" },
      { value: "delivery_rate", label: "납기준수율 (On-time Delivery)", desc: "약속 납기 이내 납품 비율 (%)", icon: "🎯" },
      { value: "throughput",    label: "처리량 (Throughput)",        desc: "단위시간당 생산·처리량 (pcs/hr)", icon: "🔄" },
      { value: "cost",          label: "비용/매출 (Cost/Revenue)",   desc: "운영 비용 또는 매출 금액 (억 원)", icon: "💹" },
    ]
  },
  {
    id: "review",
    type: "single",
    messages: ["완벽해요! 아래 내용으로 온톨로지를 구성할게요. 확인 후 '생성 시작'을 누르세요."],
    options: [
      { value: "confirm", label: "생성 시작", icon: "🚀" },
      { value: "restart", label: "처음부터 다시", icon: "🔄" },
    ]
  }
]

// 도메인별 Operations 옵션
const DOMAIN_OPERATIONS: Record<string, Option[]> = {
  manufacturing: [
    { value: "smt",       label: "SMT / PCB 공정",     desc: "표면실장 및 기판 제조", icon: "🔩" },
    { value: "assembly",  label: "모듈 조립",           desc: "부품 결합 및 완성", icon: "🔧" },
    { value: "inspection",label: "품질검사 / AOI",       desc: "광학·전기적 검사", icon: "🔍" },
    { value: "test",      label: "기능 테스트",          desc: "최종 기능 및 성능 검증", icon: "📋" },
    { value: "machining", label: "기계 가공",           desc: "절삭·성형·열처리", icon: "⚙️" },
    { value: "packaging", label: "포장 / 출하",         desc: "완제품 포장 및 물류 출하", icon: "📤" },
  ],
  logistics: [
    { value: "inbound",    label: "입고 / 검수",        desc: "화물 수령 및 품질 확인", icon: "📥" },
    { value: "storage",    label: "창고 관리",          desc: "재고 입출고 및 위치 관리", icon: "🏪" },
    { value: "picking",    label: "피킹 / 분류",        desc: "주문별 상품 수집 및 분류", icon: "🗂️" },
    { value: "delivery",   label: "배송 / 운송",        desc: "차량 배정 및 배송 실행", icon: "🚛" },
    { value: "customs",    label: "통관 / 수출입",      desc: "세관 처리 및 서류 관리", icon: "📄" },
  ],
  finance: [
    { value: "account_mgmt", label: "고객 계좌 관리",  desc: "계좌 개설·유지·해지", icon: "👤" },
    { value: "lending",      label: "여신 / 대출",     desc: "심사·실행·관리", icon: "💳" },
    { value: "investment",   label: "투자 / 운용",     desc: "포트폴리오 관리", icon: "📊" },
    { value: "settlement",   label: "결제 / 정산",     desc: "거래 처리 및 정산", icon: "💱" },
    { value: "compliance",   label: "컴플라이언스",     desc: "규제 준수 및 감사", icon: "⚖️" },
  ],
  it: [
    { value: "development",  label: "소프트웨어 개발", desc: "기능 설계·개발·배포", icon: "👨‍💻" },
    { value: "qa",           label: "QA / 테스트",    desc: "품질 검증 및 버그 관리", icon: "🧪" },
    { value: "infra",        label: "인프라 / DevOps", desc: "서버·클라우드 운영", icon: "☁️" },
    { value: "data",         label: "데이터 분석",     desc: "데이터 수집·분석·모델링", icon: "📉" },
    { value: "support",      label: "고객 지원",      desc: "이슈 접수 및 해결", icon: "🎧" },
  ],
  healthcare: [
    { value: "diagnosis",    label: "진단 / 검사",     desc: "환자 진단 및 검사 시행", icon: "🩺" },
    { value: "treatment",    label: "치료 / 시술",     desc: "치료 계획 및 시행", icon: "💊" },
    { value: "clinical",     label: "임상 연구",       desc: "신약·의료기기 임상 시험", icon: "🔬" },
    { value: "pharmacy",     label: "약품 관리",       desc: "의약품 처방·조제·유통", icon: "💉" },
    { value: "insurance",    label: "보험 / 수납",     desc: "의료비 청구 및 수납 처리", icon: "📑" },
  ],
}

// ────────────────────────────────────────────────────────────────────────────
// 온톨로지 생성 엔진 (answers → objects/links/props)
// ────────────────────────────────────────────────────────────────────────────
type Answers = Record<StepId, string | string[]>

function buildOntology(answers: Answers) {
  const domain   = (answers.domain   as string) || "manufacturing"
  const orgName  = ((answers.org_name as string) || "MyCompany").replace(/\s/g, "_")
  const orgStr   = (answers.org_structure as string[]) || []
  const ops      = (answers.operations   as string[]) || []
  const scItems  = (answers.supply_chain as string[]) || []
  const kpis     = (answers.kpis         as string[]) || []

  const objects: any[] = []
  const links: any[]   = []
  const props: any[]   = []

  // ── 1. 조직 객체 ──────────────────────────────────────────────
  if (orgStr.includes("hq")) {
    objects.push({
      name: `${orgName}_HQ`, description: `${orgName} 본사 - 경영 전략 및 전사 운영 총괄`,
      category: "organization", source: "ai-mapped",
      properties: [{ id: "h1", name: "Location", type: "string", required: true }],
      metadata: { neo4j_label: "HQ" }
    })
  }
  if (orgStr.includes("domestic_plant")) {
    objects.push({
      name: "Domestic_Plant", description: "국내 생산/운영 거점",
      category: "organization", source: "ai-mapped",
      properties: [{ id: "dp1", name: "Location", type: "string", required: true }, { id: "dp2", name: "Monthly_Capacity_K", type: "number", required: false }],
      metadata: { neo4j_label: "Factory" }
    })
    if (orgStr.includes("hq")) links.push({ name: "MANAGES", fromType: `${orgName}_HQ`, toType: "Domestic_Plant", bidirectional: false, description: "본사 → 국내 공장 관리" })
  }
  if (orgStr.includes("overseas_plant")) {
    objects.push({
      name: "Overseas_Plant", description: "해외 생산/운영 거점",
      category: "organization", source: "ai-mapped",
      properties: [{ id: "op1", name: "Region", type: "string", required: true }, { id: "op2", name: "Monthly_Capacity_K", type: "number", required: false }],
      metadata: { neo4j_label: "Factory" }
    })
    if (orgStr.includes("hq")) links.push({ name: "MANAGES", fromType: `${orgName}_HQ`, toType: "Overseas_Plant", bidirectional: false, description: "본사 → 해외 공장 관리" })
  }
  if (orgStr.includes("rd_center")) {
    objects.push({
      name: "RD_Center", description: "R&D 연구소 - 신제품 개발 및 공정 혁신",
      category: "organization", source: "ai-mapped",
      properties: [{ id: "rd1", name: "Active_Projects", type: "number", required: false }],
      metadata: { neo4j_label: "RDCenter" }
    })
    if (orgStr.includes("hq")) links.push({ name: "MANAGES", fromType: `${orgName}_HQ`, toType: "RD_Center", bidirectional: false, description: "본사 → R&D 관리" })
  }
  if (orgStr.includes("warehouse")) {
    objects.push({
      name: "Warehouse", description: "물류창고/물류센터 - 재고 관리 및 출하",
      category: "organization", source: "ai-mapped",
      properties: [{ id: "wh1", name: "Capacity", type: "number", required: false }, { id: "wh2", name: "Utilization", type: "number", required: false }],
      metadata: { neo4j_label: "Warehouse" }
    })
  }

  // ── 2. 프로세스 객체 ──────────────────────────────────────────
  const processObjMap: Record<string, any> = {
    smt:        { name: "SMT_Line",      description: "표면실장 공정 - 솔더 페이스트→마운팅→리플로우", category: "process", neo4j_label: "Line" },
    assembly:   { name: "Assembly_Line", description: "모듈 조립 공정 - 부품 결합 및 완성", category: "process", neo4j_label: "Line" },
    inspection: { name: "QC_Inspection", description: "품질 검사 공정 - AOI·전기적 특성 검사", category: "process", neo4j_label: "Line" },
    test:       { name: "Test_Line",     description: "기능 테스트 공정 - 최종 기능·성능 검증", category: "process", neo4j_label: "Line" },
    machining:  { name: "Machining_Line", description: "기계 가공 공정 - 절삭·성형·열처리", category: "process", neo4j_label: "Line" },
    packaging:  { name: "Packaging_Line", description: "포장/출하 공정 - 포장 및 물류 출하", category: "process", neo4j_label: "Line" },
    inbound:    { name: "Inbound_Process", description: "입고/검수 프로세스", category: "process", neo4j_label: "Process" },
    storage:    { name: "Storage_Process", description: "창고 관리 프로세스", category: "process", neo4j_label: "Process" },
    picking:    { name: "Picking_Process", description: "피킹/분류 프로세스", category: "process", neo4j_label: "Process" },
    delivery:   { name: "Delivery_Process", description: "배송/운송 프로세스", category: "process", neo4j_label: "Process" },
    customs:    { name: "Customs_Process", description: "통관/수출입 프로세스", category: "process", neo4j_label: "Process" },
    development:{ name: "Dev_Process",   description: "소프트웨어 개발 프로세스", category: "process", neo4j_label: "Process" },
    qa:         { name: "QA_Process",    description: "QA/테스트 프로세스", category: "process", neo4j_label: "Process" },
    infra:      { name: "Infra_Process", description: "인프라/DevOps 프로세스", category: "process", neo4j_label: "Process" },
    data:       { name: "Data_Process",  description: "데이터 분석 프로세스", category: "process", neo4j_label: "Process" },
    support:    { name: "Support_Process", description: "고객 지원 프로세스", category: "process", neo4j_label: "Process" },
    diagnosis:  { name: "Diagnosis_Process", description: "진단/검사 프로세스", category: "process", neo4j_label: "Process" },
    treatment:  { name: "Treatment_Process", description: "치료/시술 프로세스", category: "process", neo4j_label: "Process" },
    account_mgmt:{ name: "Account_Management", description: "고객 계좌 관리 프로세스", category: "process", neo4j_label: "Process" },
    lending:    { name: "Lending_Process", description: "여신/대출 프로세스", category: "process", neo4j_label: "Process" },
  }

  const processNames: string[] = []
  const plantName = orgStr.includes("domestic_plant") ? "Domestic_Plant" : (orgStr.includes("overseas_plant") ? "Overseas_Plant" : null)

  ops.forEach(op => {
    const template = processObjMap[op]
    if (!template) return
    objects.push({
      name: template.name,
      description: template.description,
      category: template.category,
      source: "ai-mapped",
      properties: [
        { id: `${op}_util`, name: "Utilization", type: "number", required: false },
        { id: `${op}_stat`, name: "Status", type: "string", required: true }
      ],
      metadata: { neo4j_label: template.neo4j_label }
    })
    processNames.push(template.name)
    if (plantName) {
      links.push({ name: "OPERATES", fromType: plantName, toType: template.name, bidirectional: false, description: `공장 → ${template.name} 운영` })
    }
  })

  // 프로세스 간 순서 링크 (제조업의 경우)
  if (domain === "manufacturing") {
    if (ops.includes("smt") && ops.includes("inspection")) {
      links.push({ name: "FEEDS_INTO", fromType: "SMT_Line", toType: "QC_Inspection", bidirectional: false, description: "SMT → 검사 투입" })
    }
    if (ops.includes("inspection") && ops.includes("assembly")) {
      links.push({ name: "FEEDS_INTO", fromType: "QC_Inspection", toType: "Assembly_Line", bidirectional: false, description: "검사 통과 후 조립 투입" })
    }
    if (ops.includes("assembly") && ops.includes("test")) {
      links.push({ name: "FEEDS_INTO", fromType: "Assembly_Line", toType: "Test_Line", bidirectional: false, description: "조립 완료 후 테스트" })
    }
  }

  // ── 3. 공급망 객체 ──────────────────────────────────────────
  if (scItems.includes("raw_material")) {
    objects.push({
      name: "Core_Material", description: "핵심 부품/원자재",
      category: "material", source: "ai-mapped",
      properties: [{ id: "cm1", name: "Stock_Level", type: "number", required: true }, { id: "cm2", name: "Unit_Price", type: "number", required: true }, { id: "cm3", name: "Lead_Time", type: "number", required: true }],
      metadata: { neo4j_label: "Material" }
    })
    // 소비 관계
    const firstProcess = processNames[0]
    if (firstProcess) links.push({ name: "CONSUMES", fromType: firstProcess, toType: "Core_Material", bidirectional: false, description: `${firstProcess} → 원자재 소비` })
  }
  if (scItems.includes("wip")) {
    objects.push({
      name: "WIP_Module", description: "반제품 (Work-In-Progress) 모듈",
      category: "product", source: "ai-mapped",
      properties: [{ id: "wip1", name: "WIP_Count", type: "number", required: true }, { id: "wip2", name: "Quality_Grade", type: "string", required: false }],
      metadata: { neo4j_label: "WIP" }
    })
    if (processNames.length > 0) links.push({ name: "PRODUCES", fromType: processNames[0], toType: "WIP_Module", bidirectional: false, description: "공정 → 반제품 생산" })
    if (processNames.length > 1) links.push({ name: "FEEDS_INTO", fromType: "WIP_Module", toType: processNames[1], bidirectional: false, description: "반제품 → 다음 공정 투입" })
  }
  if (scItems.includes("finished_product")) {
    objects.push({
      name: "Final_Product", description: "완제품 - 최종 판매 또는 납품 제품",
      category: "product", source: "ai-mapped",
      properties: [{ id: "fp1", name: "Quality_Grade", type: "string", required: true }, { id: "fp2", name: "Unit_Price", type: "number", required: true }, { id: "fp3", name: "Defect_Rate", type: "number", required: false }],
      metadata: { neo4j_label: "Product" }
    })
    const lastProcess = processNames[processNames.length - 1]
    if (lastProcess) links.push({ name: "FINISHES", fromType: lastProcess, toType: "Final_Product", bidirectional: false, description: `${lastProcess} → 완제품 완성` })
  }
  if (scItems.includes("equipment")) {
    objects.push({
      name: "Production_Equipment", description: "생산 설비/장비",
      category: "equipment", source: "ai-mapped",
      properties: [{ id: "eq1", name: "OEE", type: "number", required: true }, { id: "eq2", name: "MTBF", type: "number", required: false }, { id: "eq3", name: "Status", type: "string", required: true }],
      metadata: { neo4j_label: "Equipment" }
    })
    if (processNames.length > 0) links.push({ name: "INSTALLS", fromType: processNames[0], toType: "Production_Equipment", bidirectional: false, description: "공정에 설비 배치" })
  }
  if (scItems.includes("supplier")) {
    objects.push({
      name: "Key_Supplier", description: "핵심 부품/서비스 공급업체",
      category: "supply_chain", source: "ai-mapped",
      properties: [{ id: "sp1", name: "Lead_Time", type: "number", required: true }, { id: "sp2", name: "Quality_Grade", type: "string", required: true }],
      metadata: { neo4j_label: "Supplier" }
    })
    if (scItems.includes("raw_material")) links.push({ name: "SUPPLIES_TO", fromType: "Key_Supplier", toType: "Core_Material", bidirectional: false, description: "공급업체 → 부품 납품" })
  }
  if (scItems.includes("customer")) {
    objects.push({
      name: "Key_Customer", description: "주요 고객사 - 완제품 수령 기업",
      category: "supply_chain", source: "ai-mapped",
      properties: [{ id: "cu1", name: "Delivery_Rate", type: "number", required: true }, { id: "cu2", name: "Region", type: "string", required: true }],
      metadata: { neo4j_label: "Customer" }
    })
    if (scItems.includes("finished_product")) links.push({ name: "SHIPS_TO", fromType: "Final_Product", toType: "Key_Customer", bidirectional: false, description: "완제품 → 고객사 납품" })
  }
  if (scItems.includes("logistics_partner")) {
    objects.push({
      name: "Logistics_Partner", description: "물류/운송 파트너",
      category: "supply_chain", source: "ai-mapped",
      properties: [{ id: "lp1", name: "Lead_Time", type: "number", required: false }],
      metadata: { neo4j_label: "Partner" }
    })
  }

  // ── 4. KPI → 속성 생성 ────────────────────────────────────────
  const kpiMap: Record<string, any> = {
    utilization:   { name: "Utilization",   dataType: "number", description: "설비·라인 가동율 (%)", usedBy: processNames },
    yield_rate:    { name: "Yield_Rate",    dataType: "number", description: "공정 수율 (%)", usedBy: processNames },
    defect_rate:   { name: "Defect_Rate",   dataType: "number", description: "불량율 (%)", usedBy: ["Final_Product", "QC_Inspection", "Test_Line"] },
    lead_time:     { name: "Lead_Time",     dataType: "number", description: "납기·공정 소요 기간 (일)", usedBy: ["Core_Material", "Key_Supplier"] },
    stock_level:   { name: "Stock_Level",   dataType: "number", description: "재고 수위 (pcs)", usedBy: ["Core_Material", "WIP_Module"] },
    unit_price:    { name: "Unit_Price",    dataType: "number", description: "부품 단가 또는 제조원가 (원)", usedBy: ["Core_Material", "Final_Product"] },
    oee:           { name: "OEE",           dataType: "number", description: "설비종합효율 (%)", usedBy: ["Production_Equipment"] },
    delivery_rate: { name: "Delivery_Rate", dataType: "number", description: "납기 준수율 (%)", usedBy: ["Key_Customer"] },
    throughput:    { name: "Throughput",    dataType: "number", description: "단위시간당 처리량 (pcs/hr)", usedBy: processNames },
    cost:          { name: "Annual_Revenue", dataType: "number", description: "연간 매출/비용 (억 원)", usedBy: [`${orgName}_HQ`] },
  }

  const existingObjectNames = objects.map((o: any) => o.name)
  kpis.forEach(kpi => {
    const template = kpiMap[kpi]
    if (!template) return
    const usedBy = template.usedBy.filter((n: string) => existingObjectNames.includes(n))
    props.push({ ...template, usedBy, source: "ai-mapped" })
  })

  // 공통 속성 추가
  props.push({ name: "Status", dataType: "string", description: "현재 운영 상태 (Running/Idle/Error)", usedBy: processNames.slice(0, 3), source: "ai-mapped" })

  return { objects, links, props }
}

// ────────────────────────────────────────────────────────────────────────────
// 채팅 메시지 타입
// ────────────────────────────────────────────────────────────────────────────
type ChatMsg = {
  role: "assistant" | "user"
  text: string
  stepId?: StepId
}

// ────────────────────────────────────────────────────────────────────────────
// 위자드 다이얼로그 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
interface OntologyWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

const STEP_ORDER: StepId[] = ["domain", "org_name", "org_structure", "operations", "supply_chain", "kpis", "review"]

export function OntologyWizardDialog({ open, onOpenChange, onComplete }: OntologyWizardDialogProps) {
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [textInput, setTextInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const currentStep = STEPS.find(s => s.id === STEP_ORDER[currentStepIdx])!
  const progress = Math.round((currentStepIdx / (STEP_ORDER.length - 1)) * 100)

  // 도메인별 operations 옵션 주입
  const getStepOptions = (step: Step): Option[] => {
    if (step.id === "operations") {
      return DOMAIN_OPERATIONS[(answers.domain as string) || "manufacturing"] || []
    }
    return step.options || []
  }

  // 메시지 추가 (타이핑 효과)
  const pushMessages = (messages: string[], stepId: StepId) => {
    setIsTyping(true)
    let delay = 0
    messages.forEach((text, i) => {
      delay += i === 0 ? 400 : 900
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: "assistant", text, stepId }])
        if (i === messages.length - 1) setIsTyping(false)
      }, delay)
    })
  }

  // 초기화 및 첫 메시지
  useEffect(() => {
    if (!open) return
    setChatMessages([])
    setCurrentStepIdx(0)
    setAnswers({})
    setMultiSelected([])
    setTextInput("")
    pushMessages(STEPS[0].messages, "domain")
  }, [open])

  // 자동 스크롤
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }, [chatMessages, isTyping])

  // 단일 선택 처리
  const handleSingleSelect = (value: string, label: string) => {
    if (currentStep.id === "review") {
      if (value === "restart") handleRestart()
      else handleSave()
      return
    }
    const newAnswers = { ...answers, [currentStep.id]: value } as Answers
    setAnswers(newAnswers)
    setChatMessages(prev => [...prev, { role: "user", text: label }])
    goNextStep(newAnswers)
  }

  // 복수 선택 토글
  const handleMultiToggle = (value: string) => {
    setMultiSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // 복수 선택 확정
  const handleMultiConfirm = () => {
    if (multiSelected.length < (currentStep.minSelect || 0)) return
    const opts = getStepOptions(currentStep)
    const labels = multiSelected.map(v => opts.find(o => o.value === v)?.label || v)
    const newAnswers = { ...answers, [currentStep.id]: multiSelected } as Answers
    setAnswers(newAnswers)
    setChatMessages(prev => [...prev, { role: "user", text: labels.join(", ") }])
    setMultiSelected([])
    goNextStep(newAnswers)
  }

  // 텍스트 입력 확정
  const handleTextConfirm = () => {
    if (!textInput.trim()) return
    const newAnswers = { ...answers, [currentStep.id]: textInput.trim() } as Answers
    setAnswers(newAnswers)
    setChatMessages(prev => [...prev, { role: "user", text: textInput.trim() }])
    setTextInput("")
    goNextStep(newAnswers)
  }

  // 다음 단계로 이동
  const goNextStep = (currentAnswers: Partial<Answers>) => {
    const nextIdx = currentStepIdx + 1
    if (nextIdx >= STEP_ORDER.length) return
    setCurrentStepIdx(nextIdx)
    const nextStep = STEPS.find(s => s.id === STEP_ORDER[nextIdx])!
    setTimeout(() => pushMessages(nextStep.messages, nextStep.id), 300)
  }

  // 처음부터 다시
  const handleRestart = () => {
    setChatMessages([])
    setCurrentStepIdx(0)
    setAnswers({})
    setMultiSelected([])
    setTextInput("")
    setTimeout(() => pushMessages(STEPS[0].messages, "domain"), 200)
  }

  // Firebase 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { objects, links, props } = buildOntology(answers as Answers)
      await OntologyService.seedCustomData(objects, links, props)
      setChatMessages(prev => [...prev, {
        role: "assistant",
        text: `✅ 완료! Objects ${objects.length}개, Links ${links.length}개, Properties ${props.length}개가 Firebase에 저장되었습니다. 온톨로지 구성 탭에서 확인하세요!`,
        stepId: "review"
      }])
      toast({
        title: "온톨로지 생성 완료",
        description: `Objects ${objects.length}개 · Links ${links.length}개 · Props ${props.length}개 저장됨`
      })
      setTimeout(() => {
        onComplete?.()
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // 리뷰 미리보기 데이터
  const previewData = currentStep.id === "review" && Object.keys(answers).length >= 4
    ? buildOntology(answers as Answers)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] bg-zinc-950 border-zinc-800 text-white flex flex-col p-0 gap-0 overflow-hidden">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            온톨로지 구성 위자드
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            질문에 답하면 AI가 최적화된 객체·관계·속성을 자동 생성합니다
          </DialogDescription>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-zinc-500 w-8">{progress}%</span>
          </div>
        </DialogHeader>

        {/* 채팅 영역 */}
        <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef as any}>
          <div className="space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* 아바타 */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === "assistant" ? "bg-purple-500/20" : "bg-blue-500/20"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot className="w-4 h-4 text-purple-400" />
                    : <User className="w-4 h-4 text-blue-400" />
                  }
                </div>
                {/* 말풍선 */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-zinc-800/80 text-zinc-200 rounded-tl-sm"
                    : "bg-blue-600/30 text-blue-200 rounded-tr-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* 타이핑 인디케이터 */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div className="bg-zinc-800/80 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* 리뷰 프리뷰 */}
            {!isTyping && currentStep.id === "review" && previewData && (
              <div className="mt-2 space-y-2">
                {[
                  { icon: Database,  color: "text-purple-400", label: "생성될 객체", items: previewData.objects.map((o: any) => `${o.name} (${o.category})`), count: previewData.objects.length },
                  { icon: LinkIcon,  color: "text-green-400",  label: "생성될 관계", items: previewData.links.map((l: any) => `${l.fromType} → ${l.toType}`), count: previewData.links.length },
                  { icon: Tag,       color: "text-orange-400", label: "생성될 속성", items: previewData.props.map((p: any) => p.name), count: previewData.props.length },
                ].map(({ icon: Icon, color, label, items, count }) => (
                  <Card key={label} className="bg-zinc-900 border-zinc-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs font-semibold text-zinc-300">{label}</span>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px] ml-auto">{count}개</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {items.slice(0, 8).map((item: string, i: number) => (
                        <Badge key={i} className="bg-zinc-800/50 text-zinc-500 border-zinc-700 text-[10px]">{item}</Badge>
                      ))}
                      {items.length > 8 && <Badge className="bg-zinc-800/50 text-zinc-600 text-[10px]">+{items.length - 8}</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 입력 영역 */}
        {!isTyping && (
          <div className="px-5 pb-5 pt-3 border-t border-zinc-800 flex-shrink-0 space-y-3">
            {/* 단일 선택 */}
            {currentStep.type === "single" && (
              <div className="grid grid-cols-1 gap-2">
                {(currentStep.id === "review"
                  ? currentStep.options!
                  : getStepOptions(currentStep)
                ).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSingleSelect(opt.value, `${opt.icon || ""} ${opt.label}`.trim())}
                    disabled={isSaving}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                      opt.value === "confirm"
                        ? "bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30"
                        : opt.value === "restart"
                        ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700/50"
                        : "bg-zinc-900 border-zinc-700 hover:border-purple-500/50 hover:bg-zinc-800"
                    }`}
                  >
                    {opt.icon && <span className="text-lg">{opt.icon}</span>}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                        {opt.label}
                        {opt.value === "confirm" && isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      </div>
                      {opt.desc && <div className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</div>}
                    </div>
                    {opt.value !== "restart" && <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* 복수 선택 */}
            {currentStep.type === "multi" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {getStepOptions(currentStep).map(opt => {
                    const selected = multiSelected.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleMultiToggle(opt.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? "bg-purple-500/20 border-purple-500/60 text-purple-200"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{opt.label}</div>
                          {opt.desc && <div className="text-[10px] text-zinc-600 truncate">{opt.desc}</div>}
                        </div>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                <Button
                  onClick={handleMultiConfirm}
                  disabled={multiSelected.length < (currentStep.minSelect || 0)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                >
                  {multiSelected.length > 0
                    ? `${multiSelected.length}개 선택 완료 →`
                    : `최소 ${currentStep.minSelect || 1}개 선택해주세요`
                  }
                </Button>
              </div>
            )}

            {/* 텍스트 입력 */}
            {currentStep.type === "text" && (
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTextConfirm()}
                  placeholder={currentStep.placeholder}
                  className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                  autoFocus
                />
                <Button
                  onClick={handleTextConfirm}
                  disabled={!textInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 px-4"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
