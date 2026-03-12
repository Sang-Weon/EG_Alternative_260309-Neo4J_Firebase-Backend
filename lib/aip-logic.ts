/**
 * [이지자산평가] AIP Logic - 자산 가치평가 시뮬레이션 엔진
 * 
 * 대체투자 자산의 DCF/NPV, 리스크 조정 수익률, 연쇄부도 시뮬레이션 수행
 */

import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { ValuationEngine } from "./valuation-engine";
import { RiskAssessment } from "./risk-assessment";
import {
  AlternativeAssetType,
  Project,
  Company,
  Tranche,
  Fund,
  Covenant,
  CashFlow,
  ValuationResult,
  RiskMetrics,
  CascadeSimulationResult,
  EarlyWarningAlert,
  TrancheSeniority,
  CreditRating,
  AlertSeverity
} from "./asset-pricing-types";

// ═══════════════════════════════════════════════════════════════════
// 시뮬레이션 시나리오 인터페이스
// ═══════════════════════════════════════════════════════════════════

export interface AssetSimulationScenario {
  id?: string;
  name: string;
  scenarioType: "VALUATION" | "RISK" | "CASCADE" | "STRESS_TEST" | "COVENANT_CHECK";
  
  // 입력 파라미터
  targetAssetId?: string;
  targetCompanyId?: string;
  variables: Record<string, any>;
  
  // 결과
  result: {
    valuationResult?: ValuationResult;
    riskMetrics?: RiskMetrics;
    cascadeResult?: CascadeSimulationResult;
    alerts?: EarlyWarningAlert[];
    summary: SimulationSummary;
  };
  
  recommendation: string;
  createdAt: any;
}

export interface SimulationSummary {
  // 가치평가 요약
  fairValue?: number;
  irr?: number;
  npv?: number;
  
  // 리스크 요약
  riskScore?: number;
  ltv?: number;
  dscr?: number;
  
  // 연쇄부도 요약
  totalExposure?: number;
  expectedLoss?: number;
  contagionFactor?: number;
  
  // 경고 요약
  criticalAlerts?: number;
  warningAlerts?: number;
}

// ═══════════════════════════════════════════════════════════════════
// AIP Logic 서비스
// ═══════════════════════════════════════════════════════════════════

export const AIPLogic = {

  /**
   * 시뮬레이션 시나리오 분석 및 결과 생성
   */
  async simulateScenario(
    name: string, 
    variables: Record<string, any>
  ): Promise<AssetSimulationScenario> {
    
    let scenarioType: AssetSimulationScenario["scenarioType"] = "VALUATION";
    let result: AssetSimulationScenario["result"];
    let recommendation = "";

    // 시나리오 유형 판별
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes("부도") || lowerName.includes("cascade") || lowerName.includes("연쇄")) {
      scenarioType = "CASCADE";
      result = await this.runCascadeSimulation(variables);
      recommendation = this.generateCascadeRecommendation(result);
    } 
    else if (lowerName.includes("ltv") || lowerName.includes("dscr") || lowerName.includes("리스크") || lowerName.includes("위험")) {
      scenarioType = "RISK";
      result = await this.runRiskAnalysis(variables);
      recommendation = this.generateRiskRecommendation(result);
    }
    else if (lowerName.includes("금리") || lowerName.includes("스트레스") || lowerName.includes("충격")) {
      scenarioType = "STRESS_TEST";
      result = await this.runStressTest(variables);
      recommendation = this.generateStressTestRecommendation(result);
    }
    else if (lowerName.includes("약정") || lowerName.includes("covenant")) {
      scenarioType = "COVENANT_CHECK";
      result = await this.runCovenantCheck(variables);
      recommendation = this.generateCovenantRecommendation(result);
    }
    else {
      // 기본: 가치평가
      scenarioType = "VALUATION";
      result = await this.runValuationAnalysis(variables);
      recommendation = this.generateValuationRecommendation(result);
    }

    // Helper function to recursively remove undefined values and replace with null
    const removeUndefined = (obj: any): any => {
      if (obj === undefined) return null;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(item => removeUndefined(item));
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Always include the key, but convert undefined to null
        cleaned[key] = value === undefined ? null : removeUndefined(value);
      }
      return cleaned;
    };

    // Ensure targetAssetId and targetCompanyId are never undefined
    const targetAssetId = variables.projectId !== undefined ? variables.projectId : null;
    const targetCompanyId = variables.companyId !== undefined ? variables.companyId : null;

    const scenario: AssetSimulationScenario = {
      name,
      scenarioType,
      targetAssetId,
      targetCompanyId,
      variables: removeUndefined(variables),
      result: removeUndefined(result),
      recommendation: recommendation || "",
      createdAt: serverTimestamp()
    };

    // Firebase에 저장 (실패해도 결과는 반환)
    // undefined 값을 null로 변환하여 Firebase 호환성 확보
    try {
      const sanitizedScenario = removeUndefined(scenario);
      // serverTimestamp()를 다시 설정 (removeUndefined에서 제거될 수 있음)
      sanitizedScenario.createdAt = serverTimestamp();
      // 최종 검증: undefined가 없는지 확인
      const finalData = JSON.parse(JSON.stringify(sanitizedScenario, (_, v) => v === undefined ? null : v));
      finalData.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "assetSimulations"), finalData);
      scenario.id = docRef.id;
    } catch (firebaseError) {
      console.warn("[AIPLogic] Firebase 저장 실패, 로컬 결과만 반환:", firebaseError);
      scenario.id = `local-${Date.now()}`;
    }

    return scenario;
  },

  /**
   * 가치평가 분석 실행
   */
  async runValuationAnalysis(variables: Record<string, any>): Promise<AssetSimulationScenario["result"]> {
    const {
      projectId,
      projectName = "Sample Project",
      assetType = "PF_DEVELOPMENT" as AlternativeAssetType,
      totalAmount = 1000,
      currentValue = 950,
      completionRate = 0.6,
      riskFreeRate = 0.035,
      marketPremium = 0.05,
      cashFlows = this.generateSampleCashFlows(assetType, totalAmount)
    } = variables;

    const project: Project = {
      id: projectId || `proj-${Date.now()}`,
      name: projectName,
      assetType,
      status: completionRate >= 1 ? "준공완료" : "개발중",
      totalAmount,
      currentValue,
      completionRate,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      expectedEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
      projectedCashFlows: cashFlows,
      companyIds: [],
      trancheIds: [],
      covenantIds: [],
      collateralIds: []
    };

    const valuationResult = ValuationEngine.performValuation(project, {
      assetType,
      riskFreeRate,
      marketPremium,
      assetSpecificPremium: 0.02,
      illiquidityPremium: 0.015,
      projectedCashFlows: cashFlows,
      completionRisk: assetType === "PF_DEVELOPMENT" ? (1 - completionRate) * 0.15 : 0,
      presaleRate: variables.presaleRate || 0.7
    });

    return {
      valuationResult,
      summary: {
        fairValue: valuationResult.fairValue,
        irr: valuationResult.metrics.irr,
        npv: valuationResult.metrics.npv
      }
    };
  },

  /**
   * 리스크 분석 실행
   */
  async runRiskAnalysis(variables: Record<string, any>): Promise<AssetSimulationScenario["result"]> {
    const {
      projectId,
      projectName = "Sample Project",
      assetType = "PF_DEVELOPMENT" as AlternativeAssetType,
      totalAmount = 1000,
      currentValue = 950,
      noi = 80,
      debtService = 65,
      interestExpense = 45,
      seniorAmount = 700,
      mezzanineAmount = 200,
      juniorAmount = 100,
      companyRating = "BBB" as CreditRating
    } = variables;

    const project: Project = {
      id: projectId || `proj-${Date.now()}`,
      name: projectName,
      assetType,
      status: "운영중",
      totalAmount,
      currentValue,
      noi,
      startDate: new Date(),
      expectedEndDate: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000),
      projectedCashFlows: [],
      companyIds: ["comp-1"],
      trancheIds: ["tr-senior", "tr-mezz", "tr-junior"],
      covenantIds: [],
      collateralIds: []
    };

    const tranches: Tranche[] = [
      { id: "tr-senior", projectId: project.id, seniority: "SENIOR", amount: seniorAmount, ratio: seniorAmount / totalAmount, interestRate: 0.045, spreadBps: 150, expectedLoss: 0.02, lgd: 0.25, pd: 0.01, investorIds: [] },
      { id: "tr-mezz", projectId: project.id, seniority: "MEZZANINE", amount: mezzanineAmount, ratio: mezzanineAmount / totalAmount, interestRate: 0.08, spreadBps: 350, expectedLoss: 0.08, lgd: 0.50, pd: 0.03, investorIds: [] },
      { id: "tr-junior", projectId: project.id, seniority: "JUNIOR", amount: juniorAmount, ratio: juniorAmount / totalAmount, interestRate: 0.12, spreadBps: 600, expectedLoss: 0.20, lgd: 0.75, pd: 0.08, investorIds: [] }
    ];

    const riskMetrics = ValuationEngine.calculateRiskMetrics(
      project,
      tranches,
      noi,
      debtService,
      interestExpense
    );

    const company: Company = {
      id: "comp-1",
      name: variables.companyName || "Sample Company",
      role: "시행사",
      creditRating: companyRating,
      defaultProbability: 0.003
    };

    const covenants: Covenant[] = [
      { id: "cov-ltv", projectId: project.id, type: "LTV", threshold: 0.70, currentValue: riskMetrics.ltv, direction: "below", status: "COMPLIANT", lastCheckedDate: new Date(), breachCount: 0, warningThreshold: 0.75, criticalThreshold: 0.80 },
      { id: "cov-dscr", projectId: project.id, type: "DSCR", threshold: 1.2, currentValue: riskMetrics.dscr, direction: "above", status: "COMPLIANT", lastCheckedDate: new Date(), breachCount: 0, warningThreshold: 1.15, criticalThreshold: 1.05 }
    ];

    const { score, factors } = RiskAssessment.calculateProjectRiskScore(
      project,
      company,
      covenants,
      riskMetrics
    );

    // 조기경보 생성
    const riskMetricsMap = new Map([[project.id, riskMetrics]]);
    const alerts = RiskAssessment.generateEarlyWarnings(
      [project],
      [company],
      covenants,
      riskMetricsMap
    );

    return {
      riskMetrics,
      alerts,
      summary: {
        riskScore: score,
        ltv: riskMetrics.ltv,
        dscr: riskMetrics.dscr,
        criticalAlerts: alerts.filter(a => a.severity === "CRITICAL").length,
        warningAlerts: alerts.filter(a => a.severity === "WARNING").length
      }
    };
  },

  /**
   * 연쇄부도 시뮬레이션 실행
   */
  async runCascadeSimulation(variables: Record<string, any>): Promise<AssetSimulationScenario["result"]> {
    const {
      triggerCompanyId,
      triggerCompanyName = "태영건설",
      triggerCompanyRating = "BB-" as CreditRating
    } = variables;

    // 샘플 데이터 생성
    const triggerCompany: Company = {
      id: triggerCompanyId || "comp-trigger",
      name: triggerCompanyName,
      role: "시공사",
      creditRating: triggerCompanyRating,
      defaultProbability: 0.035
    };

    const companies: Company[] = [
      triggerCompany,
      { id: "comp-2", name: "롯데건설", role: "시공사", creditRating: "BBB", defaultProbability: 0.003 },
      { id: "comp-3", name: "GS건설", role: "시공사", creditRating: "A-", defaultProbability: 0.001 }
    ];

    const projects: Project[] = [
      { id: "proj-1", name: "강남 오피스 PF", assetType: "PF_DEVELOPMENT", status: "개발중", totalAmount: 2000, currentValue: 1800, completionRate: 0.4, startDate: new Date(), expectedEndDate: new Date(), projectedCashFlows: [], companyIds: ["comp-trigger", "comp-2"], trancheIds: ["tr-1-s", "tr-1-m"], covenantIds: [], collateralIds: [] },
      { id: "proj-2", name: "판교 물류센터", assetType: "PF_DEVELOPMENT", status: "개발중", totalAmount: 1500, currentValue: 1400, completionRate: 0.6, startDate: new Date(), expectedEndDate: new Date(), projectedCashFlows: [], companyIds: ["comp-trigger"], trancheIds: ["tr-2-s", "tr-2-m"], covenantIds: [], collateralIds: [] },
      { id: "proj-3", name: "부산 호텔", assetType: "REAL_ESTATE", status: "운영중", totalAmount: 800, currentValue: 850, startDate: new Date(), expectedEndDate: new Date(), projectedCashFlows: [], companyIds: ["comp-2", "comp-3"], trancheIds: ["tr-3-s"], covenantIds: [], collateralIds: [] }
    ];

    const tranches: Tranche[] = [
      { id: "tr-1-s", projectId: "proj-1", seniority: "SENIOR", amount: 1400, ratio: 0.7, interestRate: 0.05, spreadBps: 180, expectedLoss: 0.02, lgd: 0.25, pd: 0.01, investorIds: ["fund-1"] },
      { id: "tr-1-m", projectId: "proj-1", seniority: "MEZZANINE", amount: 400, ratio: 0.2, interestRate: 0.09, spreadBps: 400, expectedLoss: 0.10, lgd: 0.50, pd: 0.05, investorIds: ["fund-2"] },
      { id: "tr-2-s", projectId: "proj-2", seniority: "SENIOR", amount: 1050, ratio: 0.7, interestRate: 0.05, spreadBps: 200, expectedLoss: 0.03, lgd: 0.25, pd: 0.015, investorIds: ["fund-1"] },
      { id: "tr-2-m", projectId: "proj-2", seniority: "MEZZANINE", amount: 300, ratio: 0.2, interestRate: 0.10, spreadBps: 450, expectedLoss: 0.12, lgd: 0.50, pd: 0.06, investorIds: ["fund-2", "fund-3"] },
      { id: "tr-3-s", projectId: "proj-3", seniority: "SENIOR", amount: 560, ratio: 0.7, interestRate: 0.045, spreadBps: 150, expectedLoss: 0.01, lgd: 0.25, pd: 0.005, investorIds: ["fund-1", "fund-3"] }
    ];

    const funds: Fund[] = [
      { id: "fund-1", name: "KB부동산신탁", type: "부동산펀드", aum: 50000, portfolioIds: ["tr-1-s", "tr-2-s", "tr-3-s"], totalExposure: 3010, maxConcentration: 0.15, targetReturn: 0.06 },
      { id: "fund-2", name: "신한대체투자", type: "인프라펀드", aum: 30000, portfolioIds: ["tr-1-m", "tr-2-m"], totalExposure: 700, maxConcentration: 0.10, targetReturn: 0.08 },
      { id: "fund-3", name: "한화생명", type: "보험사", aum: 100000, portfolioIds: ["tr-2-m", "tr-3-s"], totalExposure: 860, maxConcentration: 0.05, targetReturn: 0.05 }
    ];

    const cascadeResult = RiskAssessment.simulateCascadeDefault(
      triggerCompany,
      projects,
      companies,
      tranches,
      funds
    );

    return {
      cascadeResult,
      summary: {
        totalExposure: cascadeResult.systemicRisk.totalExposure,
        expectedLoss: cascadeResult.systemicRisk.totalExpectedLoss,
        contagionFactor: cascadeResult.systemicRisk.contagionFactor
      }
    };
  },

  /**
   * 스트레스 테스트 실행
   */
  async runStressTest(variables: Record<string, any>): Promise<AssetSimulationScenario["result"]> {
    const { rateShockBps = 100 } = variables;
    
    // 간단한 스트레스 테스트 결과 생성
    const alerts: EarlyWarningAlert[] = [];
    
    if (rateShockBps >= 100) {
      alerts.push({
        id: `alert-stress-${Date.now()}`,
        timestamp: new Date(),
        severity: rateShockBps >= 200 ? "CRITICAL" : "WARNING",
        targetType: "PROJECT",
        targetId: "portfolio",
        targetName: "전체 포트폴리오",
        alertType: "STRESS_TEST",
        title: `금리 ${rateShockBps}bp 상승 시나리오`,
        description: `금리 ${rateShockBps}bp 상승 시 DSCR 1.0 미만 트랜치 발생 예상`,
        recommendedActions: ["금리 헤지 전략 검토", "변동금리 익스포저 점검", "현금 유동성 확보"],
        acknowledged: false,
        resolved: false
      });
    }

    return {
      alerts,
      summary: {
        criticalAlerts: alerts.filter(a => a.severity === "CRITICAL").length,
        warningAlerts: alerts.filter(a => a.severity === "WARNING").length
      }
    };
  },

  /**
   * 약정 점검 실행
   */
  async runCovenantCheck(variables: Record<string, any>): Promise<AssetSimulationScenario["result"]> {
    const {
      ltv = 0.72,
      dscr = 1.15,
      icr = 2.1
    } = variables;

    const covenants: Covenant[] = [
      { id: "cov-ltv", projectId: "proj-1", type: "LTV", threshold: 0.70, currentValue: ltv, direction: "below", status: ltv > 0.70 ? "BREACH" : "COMPLIANT", lastCheckedDate: new Date(), breachCount: ltv > 0.70 ? 1 : 0, warningThreshold: 0.75, criticalThreshold: 0.80 },
      { id: "cov-dscr", projectId: "proj-1", type: "DSCR", threshold: 1.2, currentValue: dscr, direction: "above", status: dscr < 1.2 ? "WARNING" : "COMPLIANT", lastCheckedDate: new Date(), breachCount: 0, warningThreshold: 1.15, criticalThreshold: 1.05 },
      { id: "cov-icr", projectId: "proj-1", type: "ICR", threshold: 2.0, currentValue: icr, direction: "above", status: icr < 2.0 ? "WARNING" : "COMPLIANT", lastCheckedDate: new Date(), breachCount: 0, warningThreshold: 1.8, criticalThreshold: 1.5 }
    ];

    const summary = RiskAssessment.summarizeCovenants(covenants);
    
    const alerts: EarlyWarningAlert[] = covenants
      .filter(c => c.status !== "COMPLIANT")
      .map(c => ({
        id: `alert-${c.id}`,
        timestamp: new Date(),
        severity: c.status === "BREACH" ? "CRITICAL" as AlertSeverity : "WARNING" as AlertSeverity,
        targetType: "COVENANT" as const,
        targetId: c.id,
        targetName: c.type,
        alertType: "COVENANT_VIOLATION",
        title: `${c.type} 약정 ${c.status === "BREACH" ? "위반" : "경고"}`,
        description: `현재값 ${c.currentValue.toFixed(2)} (기준: ${c.threshold.toFixed(2)})`,
        metric: {
          name: c.type,
          currentValue: c.currentValue,
          threshold: c.threshold,
          trend: "DETERIORATING" as const
        },
        recommendedActions: c.status === "BREACH" 
          ? ["즉시 차주 협의", "담보 추가 확보", "리스크 위원회 보고"]
          : ["모니터링 강화", "사전 대응 방안 수립"],
        acknowledged: false,
        resolved: false
      }));

    return {
      alerts,
      summary: {
        criticalAlerts: summary.breach,
        warningAlerts: summary.warning
      }
    };
  },

  /**
   * 샘플 현금흐름 생성
   */
  generateSampleCashFlows(assetType: AlternativeAssetType, totalAmount: number): CashFlow[] {
    const cashFlows: CashFlow[] = [];
    
    // 초기 투자
    cashFlows.push({
      period: 0,
      periodType: "YEAR",
      amount: totalAmount * 0.4,
      type: "OUTFLOW",
      category: "투자"
    });

    if (assetType === "PF_DEVELOPMENT") {
      // PF: 개발 후 매각
      for (let year = 1; year <= 2; year++) {
        cashFlows.push({
          period: year,
          periodType: "YEAR",
          amount: totalAmount * 0.3,
          type: "OUTFLOW",
          category: "투자"
        });
      }
      // 3년차 매각
      cashFlows.push({
        period: 3,
        periodType: "YEAR",
        amount: totalAmount * 1.3,
        type: "INFLOW",
        category: "매각",
        probability: 0.85
      });
    } else {
      // 수익형: 운영 수익
      for (let year = 1; year <= 10; year++) {
        cashFlows.push({
          period: year,
          periodType: "YEAR",
          amount: totalAmount * 0.08,
          type: "INFLOW",
          category: "운영수입"
        });
      }
      // 10년차 매각
      cashFlows.push({
        period: 10,
        periodType: "YEAR",
        amount: totalAmount * 1.1,
        type: "INFLOW",
        category: "매각",
        probability: 0.9
      });
    }

    return cashFlows;
  },

  /**
   * 추천 의견 생성 함수들
   */
  generateValuationRecommendation(result: AssetSimulationScenario["result"]): string {
    const { fairValue, irr } = result.summary;
    if (!fairValue || !irr) return "가치평가 결과를 확인해 주세요.";
    
    const irrPercent = (irr * 100).toFixed(1);
    if (irr >= 0.12) {
      return `예상 IRR ${irrPercent}%로 투자 매력도 높음. 공정가치 ${fairValue.toFixed(0)}억원 기준 적극 투자 권고.`;
    } else if (irr >= 0.08) {
      return `예상 IRR ${irrPercent}%로 양호한 수익 기대. 공정가치 ${fairValue.toFixed(0)}억원 기준 투자 검토 가능.`;
    } else {
      return `예상 IRR ${irrPercent}%로 수익률 미흡. 공정가치 ${fairValue.toFixed(0)}억원 기준 투자 재검토 필요.`;
    }
  },

  generateRiskRecommendation(result: AssetSimulationScenario["result"]): string {
    const { riskScore, ltv, dscr, criticalAlerts } = result.summary;
    
    if (criticalAlerts && criticalAlerts > 0) {
      return `위험 경보 ${criticalAlerts}건 발생. LTV ${((ltv || 0) * 100).toFixed(1)}%, DSCR ${(dscr || 0).toFixed(2)}x. 즉시 리스크 관리 조치 필요.`;
    } else if ((riskScore || 0) >= 60) {
      return `리스크 점수 ${riskScore}점 (고위험). LTV ${((ltv || 0) * 100).toFixed(1)}%, DSCR ${(dscr || 0).toFixed(2)}x. 집중 모니터링 필요.`;
    } else if ((riskScore || 0) >= 40) {
      return `리스크 점수 ${riskScore}점 (중위험). LTV ${((ltv || 0) * 100).toFixed(1)}%, DSCR ${(dscr || 0).toFixed(2)}x. 정기 점검 유지.`;
    } else {
      return `리스크 점수 ${riskScore}점 (저위험). LTV ${((ltv || 0) * 100).toFixed(1)}%, DSCR ${(dscr || 0).toFixed(2)}x. 안정적 상태.`;
    }
  },

  generateCascadeRecommendation(result: AssetSimulationScenario["result"]): string {
    const { totalExposure, expectedLoss, contagionFactor } = result.summary;
    
    if (!expectedLoss || !totalExposure) return "연쇄부도 시뮬레이션 결과를 확인해 주세요.";
    
    const lossRate = (expectedLoss / totalExposure * 100).toFixed(1);
    const contagion = ((contagionFactor || 0) * 100).toFixed(0);
    
    if ((contagionFactor || 0) >= 0.5) {
      return `연쇄부도 시 예상 손실 ${expectedLoss.toFixed(0)}억원 (손실률 ${lossRate}%). 전염 계수 ${contagion}%로 시스템 리스크 우려. 포트폴리오 분산 시급.`;
    } else {
      return `연쇄부도 시 예상 손실 ${expectedLoss.toFixed(0)}억원 (손실률 ${lossRate}%). 전염 계수 ${contagion}%로 통제 가능 수준.`;
    }
  },

  generateStressTestRecommendation(result: AssetSimulationScenario["result"]): string {
    const { criticalAlerts, warningAlerts } = result.summary;
    
    if ((criticalAlerts || 0) > 0) {
      return `스트레스 테스트 결과 ${criticalAlerts}건의 심각한 위험 요소 발견. 금리 헤지 및 유동성 확보 조치 즉시 이행 권고.`;
    } else if ((warningAlerts || 0) > 0) {
      return `스트레스 테스트 결과 ${warningAlerts}건의 주의 요소 발견. 사전 대응 계획 수립 권고.`;
    } else {
      return `스트레스 테스트 통과. 현재 포트폴리오 금리 리스크 관리 양호.`;
    }
  },

  generateCovenantRecommendation(result: AssetSimulationScenario["result"]): string {
    const { criticalAlerts, warningAlerts } = result.summary;
    
    if ((criticalAlerts || 0) > 0) {
      return `약정 위반 ${criticalAlerts}건 발생. 즉시 차주 협의 및 담보 추가 확보 조치 필요. 리스크 위원회 보고 요망.`;
    } else if ((warningAlerts || 0) > 0) {
      return `약정 경고 ${warningAlerts}건. 모니터링 강화 및 사전 대응 방안 수립 권고.`;
    } else {
      return `전체 약정 정상 준수 중. 정기 점검 일정 유지.`;
    }
  },

  /**
   * 피드백 처리 (기존 호환성 유지)
   */
  async processFeedback(actionId: string, actualResult: any) {
    console.log(`[AIPLogic] Processing feedback for action ${actionId}:`, actualResult);
    // 추후 ML 모델 학습용 피드백 저장 로직 추가 가능
  }
};

export default AIPLogic;
