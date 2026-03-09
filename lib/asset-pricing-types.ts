/**
 * [이지자산평가] 대체투자 자산 가치평가 타입 정의
 * 
 * 자산 유형: PF개발, 인프라, 사모펀드, 항공기/선박, 신재생에너지
 * 평가 방식: DCF/NPV, LTV/DSCR, 리스크 조정 수익률, 연쇄부도 시뮬레이션
 */

// ═══════════════════════════════════════════════════════════════════
// 1. 대체자산 유형 및 기본 열거형
// ═══════════════════════════════════════════════════════════════════

export type AlternativeAssetType =
  | "PF_DEVELOPMENT"      // 부동산 PF (개발형)
  | "REAL_ESTATE"         // 부동산 (수익형)
  | "INFRASTRUCTURE"      // SOC 인프라
  | "PRIVATE_EQUITY"      // 사모펀드
  | "AIRCRAFT"            // 항공기
  | "SHIP"                // 선박
  | "RENEWABLE_ENERGY";   // 신재생에너지

export type TrancheSeniority = "SENIOR" | "MEZZANINE" | "JUNIOR" | "EQUITY";

export type CreditRating = 
  | "AAA" | "AA+" | "AA" | "AA-" 
  | "A+" | "A" | "A-" 
  | "BBB+" | "BBB" | "BBB-" 
  | "BB+" | "BB" | "BB-" 
  | "B+" | "B" | "B-" 
  | "CCC" | "CC" | "C" | "D" | "NR";

export type CovenantType = 
  | "LTV"           // Loan-to-Value
  | "DSCR"          // Debt Service Coverage Ratio
  | "ICR"           // Interest Coverage Ratio
  | "COMPLETION"    // 공정률
  | "FINANCIAL";    // 기타 재무 약정

export type CovenantStatus = "COMPLIANT" | "WARNING" | "BREACH" | "WAIVED";

export type CreditEventType = 
  | "DEFAULT"           // 채무불이행
  | "RESTRUCTURING"     // 구조조정
  | "DOWNGRADE"         // 신용등급 하향
  | "COVENANT_BREACH"   // 약정 위반
  | "CROSS_DEFAULT";    // 교차 부도

// ═══════════════════════════════════════════════════════════════════
// 2. 핵심 엔티티 인터페이스
// ═══════════════════════════════════════════════════════════════════

export interface Company {
  id: string;
  name: string;
  role: "시행사" | "시공사" | "운영사" | "펀드매니저" | "보증기관";
  creditRating: CreditRating;
  defaultProbability: number;  // 0 ~ 1
  financials?: {
    totalAssets: number;
    totalLiabilities: number;
    netIncome: number;
    operatingCashFlow: number;
  };
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  assetType: AlternativeAssetType;
  status: "개발중" | "운영중" | "준공완료" | "부실";
  
  // 기본 정보
  totalAmount: number;           // 총 사업비 (억원)
  currentValue: number;          // 현재 가치평가액
  completionRate?: number;       // 공정률 (PF의 경우)
  
  // 프로젝트 일정
  startDate: Date;
  expectedEndDate: Date;
  actualEndDate?: Date;
  
  // 수익 정보
  projectedCashFlows: CashFlow[];
  noi?: number;                  // Net Operating Income (수익형)
  capRate?: number;              // Capitalization Rate
  
  // 관련 엔티티 ID
  companyIds: string[];          // 관련 회사 (시행사, 시공사 등)
  trancheIds: string[];          // 트랜치 구조
  covenantIds: string[];         // 재무 약정
  collateralIds: string[];       // 담보 자산
  
  metadata?: Record<string, any>;
}

export interface Tranche {
  id: string;
  projectId: string;
  seniority: TrancheSeniority;
  
  // 금액 정보
  amount: number;                // 투자 금액
  ratio: number;                 // 전체 대비 비율 (0~1)
  
  // 수익 조건
  interestRate: number;          // 금리 (연)
  spreadBps: number;             // 스프레드 (bp)
  
  // 리스크 지표
  expectedLoss: number;          // 예상 손실률
  lgd: number;                   // Loss Given Default
  pd: number;                    // Probability of Default
  
  // 투자자 정보
  investorIds: string[];         // 투자 펀드/기관
  
  metadata?: Record<string, any>;
}

export interface Fund {
  id: string;
  name: string;
  type: "부동산펀드" | "인프라펀드" | "PEF" | "기관투자자" | "보험사" | "은행";
  aum: number;                   // Assets Under Management
  
  // 투자 현황
  portfolioIds: string[];        // 보유 트랜치 ID
  totalExposure: number;         // 총 익스포저
  
  // 리스크 한도
  maxConcentration: number;      // 최대 집중도
  targetReturn: number;          // 목표 수익률
  
  metadata?: Record<string, any>;
}

export interface Covenant {
  id: string;
  projectId: string;
  type: CovenantType;
  
  // 약정 조건
  threshold: number;             // 기준치
  currentValue: number;          // 현재 값
  direction: "above" | "below";  // 기준 충족 방향
  
  // 상태
  status: CovenantStatus;
  lastCheckedDate: Date;
  breachCount: number;
  
  // 조기경보
  warningThreshold: number;      // 경고 기준
  criticalThreshold: number;     // 위험 기준
  
  metadata?: Record<string, any>;
}

export interface Collateral {
  id: string;
  projectId: string;
  type: "토지" | "건물" | "시설물" | "기계장치" | "채권" | "주식" | "보증";
  
  // 가치 정보
  appraisedValue: number;        // 감정가
  liquidationValue: number;      // 청산가치
  haircut: number;               // 담보인정비율 차감률
  
  // 감정 정보
  appraisalDate: Date;
  appraiser: string;
  
  metadata?: Record<string, any>;
}

export interface CreditEvent {
  id: string;
  projectId: string;
  companyId: string;
  type: CreditEventType;
  
  occurredDate: Date;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  
  // 영향 분석
  impactedTrancheIds: string[];
  estimatedLoss: number;
  
  // 처리 상태
  resolved: boolean;
  resolutionDate?: Date;
  resolutionNote?: string;
  
  metadata?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════
// 3. 현금흐름 및 가치평가 관련
// ═══════════════════════════════════════════════════════════════════

export interface CashFlow {
  period: number;                // 기간 (연도 또는 월)
  periodType: "YEAR" | "MONTH" | "QUARTER";
  amount: number;
  type: "INFLOW" | "OUTFLOW";
  category: "투자" | "운영수입" | "운영비용" | "원리금상환" | "매각" | "기타";
  probability?: number;          // 실현 확률
}

export interface ValuationParams {
  assetType: AlternativeAssetType;
  
  // 할인율 파라미터
  riskFreeRate: number;          // 무위험 이자율
  marketPremium: number;         // 시장 리스크 프리미엄
  assetSpecificPremium: number;  // 자산 고유 프리미엄
  illiquidityPremium: number;    // 비유동성 프리미엄
  
  // 현금흐름
  projectedCashFlows: CashFlow[];
  terminalValue?: number;
  terminalGrowthRate?: number;
  
  // 비교 평가용
  comparables?: ComparableAsset[];
  
  // PF 특화
  completionRisk?: number;       // 준공 리스크
  presaleRate?: number;          // 분양률
  
  // 수익형 특화
  noi?: number;
  exitCapRate?: number;
  holdingPeriod?: number;
}

export interface ComparableAsset {
  id: string;
  name: string;
  transactionDate: Date;
  transactionPrice: number;
  metrics: {
    pricePerSqm?: number;
    capRate?: number;
    noi?: number;
  };
  adjustments: {
    location: number;
    size: number;
    quality: number;
    timing: number;
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. 가치평가 결과
// ═══════════════════════════════════════════════════════════════════

export type ValuationType = "DCF" | "COMPARATIVE" | "COST_BASED" | "INCOME_APPROACH";

export interface ValuationResult {
  assetId: string;
  valuationType: ValuationType;
  valuationDate: Date;
  
  // 가치 산정 결과
  baseValue: number;             // 기본 가치
  adjustedValue: number;         // 조정 가치
  fairValue: number;             // 공정가치
  
  // 세부 내역
  breakdown: {
    dcfValue?: number;
    comparativeValue?: number;
    costValue?: number;
    incomeValue?: number;
  };
  
  // 리스크 조정
  riskAdjustments: RiskAdjustment[];
  totalRiskDiscount: number;
  
  // 민감도 분석
  sensitivityAnalysis?: SensitivityResult[];
  
  // 핵심 지표
  metrics: {
    irr?: number;                // Internal Rate of Return
    npv?: number;                // Net Present Value
    paybackPeriod?: number;      // 회수 기간
    multipleOnInvested?: number; // MOIC
  };
  
  // 의견
  recommendation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface RiskAdjustment {
  factor: string;
  description: string;
  impact: number;                // 조정 금액 또는 비율
  impactType: "ABSOLUTE" | "PERCENTAGE";
}

export interface SensitivityResult {
  variable: string;
  baseCase: number;
  scenarios: {
    change: number;              // 변동률 (예: -10%, +10%)
    resultValue: number;
    delta: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════════
// 5. 리스크 분석 관련
// ═══════════════════════════════════════════════════════════════════

export interface RiskMetrics {
  ltv: number;                   // Loan-to-Value
  dscr: number;                  // Debt Service Coverage Ratio
  icr: number;                   // Interest Coverage Ratio
  debtYield: number;             // Debt Yield
  
  // 신용 리스크
  pd: number;                    // Probability of Default
  lgd: number;                   // Loss Given Default
  ead: number;                   // Exposure at Default
  expectedLoss: number;          // EL = PD × LGD × EAD
  
  // 집중도 리스크
  singleNameConcentration: number;
  sectorConcentration: number;
  
  // 유동성 리스크
  liquidityScore: number;        // 1-10
  estimatedLiquidationTime: number; // 일수
}

export interface CascadeSimulationResult {
  scenarioName: string;
  triggerEvent: CreditEvent;
  
  // 연쇄 영향
  affectedProjects: {
    projectId: string;
    projectName: string;
    impactType: "DIRECT" | "INDIRECT" | "CROSS_DEFAULT";
    estimatedLoss: number;
    probabilityOfImpact: number;
  }[];
  
  // 트랜치별 손실
  trancheLosses: {
    trancheId: string;
    seniority: TrancheSeniority;
    originalAmount: number;
    expectedRecovery: number;
    expectedLoss: number;
    lossRate: number;
  }[];
  
  // 펀드별 영향
  fundImpacts: {
    fundId: string;
    fundName: string;
    totalExposure: number;
    estimatedLoss: number;
    portfolioImpact: number;     // 포트폴리오 대비 비율
  }[];
  
  // 총 시스템 영향
  systemicRisk: {
    totalExposure: number;
    totalExpectedLoss: number;
    contagionFactor: number;     // 연쇄 확산 계수
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. 조기경보 시스템
// ═══════════════════════════════════════════════════════════════════

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";

export interface EarlyWarningAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  
  // 대상
  targetType: "PROJECT" | "COMPANY" | "TRANCHE" | "COVENANT";
  targetId: string;
  targetName: string;
  
  // 경보 내용
  alertType: string;
  title: string;
  description: string;
  
  // 지표 정보
  metric?: {
    name: string;
    currentValue: number;
    threshold: number;
    trend: "IMPROVING" | "STABLE" | "DETERIORATING";
  };
  
  // 권고 조치
  recommendedActions: string[];
  
  // 처리 상태
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// 7. 자산 유형별 특화 파라미터
// ═══════════════════════════════════════════════════════════════════

export interface PFDevelopmentParams {
  landCost: number;              // 토지비
  constructionCost: number;      // 공사비
  otherCosts: number;            // 제비용
  contingency: number;           // 예비비
  
  gfa: number;                   // 연면적 (㎡)
  saleableArea: number;          // 분양면적
  
  presaleRate: number;           // 분양률
  presalePrice: number;          // 평균 분양가
  
  constructionPeriod: number;    // 공사 기간 (월)
  completionDate: Date;          // 예정 준공일
  
  // 시공사 관련
  constructorId: string;
  constructorRating: CreditRating;
  completionGuarantee: boolean;
}

export interface InfrastructureParams {
  concessionPeriod: number;      // 사업 기간 (년)
  constructionPeriod: number;    // 건설 기간 (년)
  
  // 수입 구조
  revenueType: "TOLL" | "AVAILABILITY" | "HYBRID";
  minimumRevenueGuarantee?: number;
  
  // 운영 정보
  operationalCost: number;
  maintenanceReserve: number;
  
  // 정부 지원
  governmentSupport?: number;
  subsidyRate?: number;
}

export interface AircraftShipParams {
  assetAge: number;              // 경과 연수
  remainingUsefulLife: number;   // 잔여 내용연수
  
  // 리스 정보
  leaseType: "OPERATING" | "FINANCE";
  lesseeId: string;
  lesseeRating: CreditRating;
  
  monthlyLease: number;          // 월 리스료
  leaseEndDate: Date;
  
  // 잔존가치
  residualValue: number;
  residualValueGuarantee?: number;
}

export interface RenewableEnergyParams {
  capacity: number;              // 설비 용량 (MW)
  capacityFactor: number;        // 이용률
  
  // 판매 계약
  ppaPrice: number;              // PPA 단가
  ppaContractEnd: Date;
  
  // REC
  recPrice: number;
  recWeight: number;
  
  // 정부 정책
  fitRate?: number;              // 발전차액지원제도
  rpsMandatory?: boolean;
}
