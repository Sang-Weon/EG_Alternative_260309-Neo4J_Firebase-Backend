/**
 * [이지자산평가] 리스크 평가 및 연쇄부도 시뮬레이션
 * 
 * 약정 모니터링, 조기경보 시스템, Cascade Default 시뮬레이션
 */

import {
  Project,
  Company,
  Tranche,
  Fund,
  Covenant,
  CreditEvent,
  CreditEventType,
  CovenantStatus,
  CovenantType,
  TrancheSeniority,
  CreditRating,
  RiskMetrics,
  CascadeSimulationResult,
  EarlyWarningAlert,
  AlertSeverity
} from "./asset-pricing-types";

// ═══════════════════════════════════════════════════════════════════
// 신용등급별 부도확률 (1년)
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_PROBABILITIES: Record<CreditRating, number> = {
  "AAA": 0.0001, "AA+": 0.0002, "AA": 0.0003, "AA-": 0.0004,
  "A+": 0.0006, "A": 0.0008, "A-": 0.001,
  "BBB+": 0.002, "BBB": 0.003, "BBB-": 0.005,
  "BB+": 0.01, "BB": 0.02, "BB-": 0.035,
  "B+": 0.055, "B": 0.08, "B-": 0.12,
  "CCC": 0.20, "CC": 0.35, "C": 0.50, "D": 1.0, "NR": 0.05
};

// 트랜치별 LGD (Loss Given Default)
const TRANCHE_LGD: Record<TrancheSeniority, number> = {
  "SENIOR": 0.25,
  "MEZZANINE": 0.50,
  "JUNIOR": 0.75,
  "EQUITY": 1.0
};

// ═══════════════════════════════════════════════════════════════════
// 리스크 평가 서비스
// ═══════════════════════════════════════════════════════════════════

export const RiskAssessment = {

  /**
   * 약정 준수 여부 평가
   */
  assessCovenantCompliance(covenant: Covenant): CovenantStatus {
    const { currentValue, threshold, direction, warningThreshold, criticalThreshold } = covenant;
    
    // 방향에 따른 비교
    const isAbove = direction === "above";
    const meetsThreshold = isAbove ? currentValue >= threshold : currentValue <= threshold;
    const meetsWarning = isAbove ? currentValue >= warningThreshold : currentValue <= warningThreshold;
    const meetsCritical = isAbove ? currentValue >= criticalThreshold : currentValue <= criticalThreshold;
    
    if (!meetsThreshold) return "BREACH";
    if (!meetsCritical) return "WARNING";
    if (!meetsWarning) return "WARNING";
    return "COMPLIANT";
  },

  /**
   * 전체 약정 상태 요약
   */
  summarizeCovenants(covenants: Covenant[]): {
    total: number;
    compliant: number;
    warning: number;
    breach: number;
    waived: number;
  } {
    const summary = {
      total: covenants.length,
      compliant: 0,
      warning: 0,
      breach: 0,
      waived: 0
    };

    covenants.forEach(cov => {
      const status = this.assessCovenantCompliance(cov);
      if (cov.status === "WAIVED") {
        summary.waived++;
      } else {
        summary[status.toLowerCase() as keyof typeof summary]++;
      }
    });

    return summary;
  },

  /**
   * 프로젝트 리스크 점수 계산 (0-100, 높을수록 위험)
   */
  calculateProjectRiskScore(
    project: Project,
    company: Company,
    covenants: Covenant[],
    riskMetrics: RiskMetrics
  ): { score: number; factors: { name: string; weight: number; value: number }[] } {
    const factors: { name: string; weight: number; value: number }[] = [];

    // 1. LTV 점수 (0-25)
    const ltvScore = Math.min(25, Math.max(0, (riskMetrics.ltv - 0.5) * 50));
    factors.push({ name: "LTV", weight: 25, value: ltvScore });

    // 2. DSCR 점수 (0-25) - 낮을수록 위험
    const dscrScore = Math.min(25, Math.max(0, (1.5 - riskMetrics.dscr) * 25));
    factors.push({ name: "DSCR", weight: 25, value: dscrScore });

    // 3. 시공사/시행사 신용등급 (0-20)
    const creditScore = (DEFAULT_PROBABILITIES[company.creditRating] / 0.05) * 20;
    factors.push({ name: "신용등급", weight: 20, value: Math.min(20, creditScore) });

    // 4. 약정 상태 (0-15)
    const covenantSummary = this.summarizeCovenants(covenants);
    const covenantScore = (covenantSummary.breach * 15 + covenantSummary.warning * 7) / Math.max(1, covenants.length);
    factors.push({ name: "약정상태", weight: 15, value: Math.min(15, covenantScore) });

    // 5. 공정률 (PF의 경우, 0-15) - 낮을수록 위험
    if (project.assetType === "PF_DEVELOPMENT" && project.completionRate !== undefined) {
      const completionScore = (1 - project.completionRate) * 15;
      factors.push({ name: "공정률", weight: 15, value: completionScore });
    } else {
      factors.push({ name: "공정률", weight: 15, value: 0 });
    }

    const score = factors.reduce((sum, f) => sum + f.value, 0);
    return { score: Math.round(score), factors };
  },

  /**
   * 연쇄부도 시뮬레이션
   */
  simulateCascadeDefault(
    triggerCompany: Company,
    projects: Project[],
    companies: Company[],
    tranches: Tranche[],
    funds: Fund[]
  ): CascadeSimulationResult {
    
    const triggerEvent: CreditEvent = {
      id: `evt-${Date.now()}`,
      projectId: "",
      companyId: triggerCompany.id,
      type: "DEFAULT",
      occurredDate: new Date(),
      severity: "CRITICAL",
      description: `${triggerCompany.name} 부도 발생`,
      impactedTrancheIds: [],
      estimatedLoss: 0,
      resolved: false
    };

    // 1. 직접 영향받는 프로젝트 식별
    const directlyAffectedProjects = projects.filter(p => 
      p.companyIds.includes(triggerCompany.id)
    );

    // 2. 각 프로젝트별 손실 계산
    const affectedProjects: CascadeSimulationResult["affectedProjects"] = [];
    const trancheLosses: CascadeSimulationResult["trancheLosses"] = [];
    const impactedTrancheIds: string[] = [];

    directlyAffectedProjects.forEach(project => {
      // 직접 영향
      const projectLoss = project.currentValue * DEFAULT_PROBABILITIES[triggerCompany.creditRating];
      affectedProjects.push({
        projectId: project.id,
        projectName: project.name,
        impactType: "DIRECT",
        estimatedLoss: projectLoss,
        probabilityOfImpact: 0.8
      });

      // 트랜치별 손실 계산
      const projectTranches = tranches.filter(t => project.trancheIds.includes(t.id));
      projectTranches.forEach(tranche => {
        const lgd = TRANCHE_LGD[tranche.seniority];
        const trancheLoss = tranche.amount * lgd * DEFAULT_PROBABILITIES[triggerCompany.creditRating];
        const recovery = tranche.amount - trancheLoss;

        trancheLosses.push({
          trancheId: tranche.id,
          seniority: tranche.seniority,
          originalAmount: tranche.amount,
          expectedRecovery: recovery,
          expectedLoss: trancheLoss,
          lossRate: trancheLoss / tranche.amount
        });

        impactedTrancheIds.push(tranche.id);
      });
    });

    // 3. 교차 부도 (Cross-Default) 영향 식별
    const otherCompanies = companies.filter(c => c.id !== triggerCompany.id);
    otherCompanies.forEach(company => {
      // 동일 프로젝트 참여 여부 확인
      const sharedProjects = projects.filter(p => 
        p.companyIds.includes(company.id) && 
        p.companyIds.includes(triggerCompany.id)
      );

      if (sharedProjects.length > 0) {
        // 간접 영향 프로젝트 추가
        const otherProjects = projects.filter(p => 
          p.companyIds.includes(company.id) && 
          !p.companyIds.includes(triggerCompany.id)
        );

        otherProjects.forEach(project => {
          const contagionProb = 0.3; // 전염 확률
          const indirectLoss = project.currentValue * contagionProb * DEFAULT_PROBABILITIES[company.creditRating];
          
          affectedProjects.push({
            projectId: project.id,
            projectName: project.name,
            impactType: "CROSS_DEFAULT",
            estimatedLoss: indirectLoss,
            probabilityOfImpact: contagionProb
          });
        });
      }
    });

    // 4. 펀드별 영향 계산
    const fundImpacts: CascadeSimulationResult["fundImpacts"] = [];
    funds.forEach(fund => {
      const fundTranches = tranches.filter(t => 
        t.investorIds.includes(fund.id) && 
        impactedTrancheIds.includes(t.id)
      );

      if (fundTranches.length > 0) {
        const fundLoss = trancheLosses
          .filter(tl => fundTranches.some(ft => ft.id === tl.trancheId))
          .reduce((sum, tl) => sum + tl.expectedLoss, 0);

        const totalExposure = fundTranches.reduce((sum, t) => sum + t.amount, 0);

        fundImpacts.push({
          fundId: fund.id,
          fundName: fund.name,
          totalExposure,
          estimatedLoss: fundLoss,
          portfolioImpact: fundLoss / fund.aum
        });
      }
    });

    // 5. 시스템 리스크 종합
    const totalExposure = trancheLosses.reduce((sum, tl) => sum + tl.originalAmount, 0);
    const totalExpectedLoss = trancheLosses.reduce((sum, tl) => sum + tl.expectedLoss, 0);
    const contagionFactor = affectedProjects.filter(p => p.impactType !== "DIRECT").length / 
                           Math.max(1, affectedProjects.length);

    triggerEvent.impactedTrancheIds = impactedTrancheIds;
    triggerEvent.estimatedLoss = totalExpectedLoss;

    return {
      scenarioName: `${triggerCompany.name} 부도 시나리오`,
      triggerEvent,
      affectedProjects,
      trancheLosses,
      fundImpacts,
      systemicRisk: {
        totalExposure,
        totalExpectedLoss,
        contagionFactor
      }
    };
  },

  /**
   * 조기경보 생성
   */
  generateEarlyWarnings(
    projects: Project[],
    companies: Company[],
    covenants: Covenant[],
    riskMetricsMap: Map<string, RiskMetrics>
  ): EarlyWarningAlert[] {
    const alerts: EarlyWarningAlert[] = [];
    const now = new Date();

    // 1. 약정 위반/경고
    covenants.forEach(covenant => {
      const status = this.assessCovenantCompliance(covenant);
      if (status === "BREACH" || status === "WARNING") {
        const project = projects.find(p => p.covenantIds.includes(covenant.id));
        alerts.push({
          id: `alert-cov-${covenant.id}`,
          timestamp: now,
          severity: status === "BREACH" ? "CRITICAL" : "WARNING",
          targetType: "COVENANT",
          targetId: covenant.id,
          targetName: project?.name || "Unknown",
          alertType: "COVENANT_VIOLATION",
          title: `${covenant.type} 약정 ${status === "BREACH" ? "위반" : "경고"}`,
          description: `현재값 ${covenant.currentValue.toFixed(2)} (기준: ${covenant.threshold.toFixed(2)})`,
          metric: {
            name: covenant.type,
            currentValue: covenant.currentValue,
            threshold: covenant.threshold,
            trend: covenant.currentValue < covenant.threshold ? "DETERIORATING" : "STABLE"
          },
          recommendedActions: status === "BREACH" 
            ? ["즉시 차주 협의 필요", "담보 추가 확보 검토", "리스크 위원회 보고"]
            : ["모니터링 강화", "사전 대응 방안 수립"],
          acknowledged: false,
          resolved: false
        });
      }
    });

    // 2. 높은 LTV 경고
    projects.forEach(project => {
      const metrics = riskMetricsMap.get(project.id);
      if (metrics && metrics.ltv > 0.75) {
        alerts.push({
          id: `alert-ltv-${project.id}`,
          timestamp: now,
          severity: metrics.ltv > 0.85 ? "CRITICAL" : "WARNING",
          targetType: "PROJECT",
          targetId: project.id,
          targetName: project.name,
          alertType: "HIGH_LTV",
          title: `높은 LTV 비율`,
          description: `LTV ${(metrics.ltv * 100).toFixed(1)}% - 기준 초과`,
          metric: {
            name: "LTV",
            currentValue: metrics.ltv,
            threshold: 0.70,
            trend: "DETERIORATING"
          },
          recommendedActions: ["담보가치 재평가 요청", "추가 담보 확보", "익스포저 조정 검토"],
          acknowledged: false,
          resolved: false
        });
      }
    });

    // 3. 낮은 DSCR 경고
    projects.forEach(project => {
      const metrics = riskMetricsMap.get(project.id);
      if (metrics && metrics.dscr < 1.2) {
        alerts.push({
          id: `alert-dscr-${project.id}`,
          timestamp: now,
          severity: metrics.dscr < 1.0 ? "CRITICAL" : "WARNING",
          targetType: "PROJECT",
          targetId: project.id,
          targetName: project.name,
          alertType: "LOW_DSCR",
          title: `낮은 DSCR`,
          description: `DSCR ${metrics.dscr.toFixed(2)}x - 원리금 상환 여력 부족`,
          metric: {
            name: "DSCR",
            currentValue: metrics.dscr,
            threshold: 1.2,
            trend: metrics.dscr < 1.0 ? "DETERIORATING" : "STABLE"
          },
          recommendedActions: metrics.dscr < 1.0 
            ? ["긴급 자금수지 점검", "상환 유예 협의", "구조조정 검토"]
            : ["현금흐름 모니터링 강화", "운영비 절감 방안 검토"],
          acknowledged: false,
          resolved: false
        });
      }
    });

    // 4. 시공사/시행사 신용등급 하락 경고
    companies.forEach(company => {
      const pd = DEFAULT_PROBABILITIES[company.creditRating];
      if (pd >= 0.05) { // BB- 이하
        const relatedProjects = projects.filter(p => p.companyIds.includes(company.id));
        alerts.push({
          id: `alert-credit-${company.id}`,
          timestamp: now,
          severity: pd >= 0.12 ? "CRITICAL" : "WARNING",
          targetType: "COMPANY",
          targetId: company.id,
          targetName: company.name,
          alertType: "CREDIT_DETERIORATION",
          title: `${company.role} 신용 위험`,
          description: `신용등급 ${company.creditRating} - 부도확률 ${(pd * 100).toFixed(1)}%`,
          metric: {
            name: "부도확률",
            currentValue: pd,
            threshold: 0.03,
            trend: "DETERIORATING"
          },
          recommendedActions: [
            `관련 프로젝트 ${relatedProjects.length}건 점검`,
            "대체 시공사/시행사 확보 방안 검토",
            "담보 강화 또는 보증 추가"
          ],
          acknowledged: false,
          resolved: false
        });
      }
    });

    // 심각도 순 정렬
    const severityOrder: Record<AlertSeverity, number> = {
      "EMERGENCY": 0, "CRITICAL": 1, "WARNING": 2, "INFO": 3
    };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  },

  /**
   * 포트폴리오 집중도 리스크 계산
   */
  calculateConcentrationRisk(
    funds: Fund[],
    tranches: Tranche[],
    projects: Project[]
  ): { fundId: string; singleName: number; sector: Record<string, number>; }[] {
    return funds.map(fund => {
      const fundTranches = tranches.filter(t => t.investorIds.includes(fund.id));
      const totalExposure = fundTranches.reduce((sum, t) => sum + t.amount, 0);

      // Single-name 집중도 (최대 익스포저 / 전체)
      const exposureByProject = new Map<string, number>();
      fundTranches.forEach(t => {
        const current = exposureByProject.get(t.projectId) || 0;
        exposureByProject.set(t.projectId, current + t.amount);
      });
      const maxSingleExposure = Math.max(...exposureByProject.values(), 0);
      const singleName = totalExposure > 0 ? maxSingleExposure / totalExposure : 0;

      // 섹터 집중도
      const sector: Record<string, number> = {};
      fundTranches.forEach(t => {
        const project = projects.find(p => p.trancheIds.includes(t.id));
        if (project) {
          const type = project.assetType;
          sector[type] = (sector[type] || 0) + t.amount;
        }
      });
      Object.keys(sector).forEach(key => {
        sector[key] = sector[key] / totalExposure;
      });

      return { fundId: fund.id, singleName, sector };
    });
  },

  /**
   * 스트레스 테스트: 금리 상승 시나리오
   */
  stressTestInterestRateShock(
    tranches: Tranche[],
    projects: Project[],
    rateShockBps: number
  ): { trancheId: string; originalDSCR: number; stressedDSCR: number; breached: boolean }[] {
    return tranches.map(tranche => {
      const project = projects.find(p => p.trancheIds.includes(tranche.id));
      if (!project || !project.noi) {
        return { trancheId: tranche.id, originalDSCR: 0, stressedDSCR: 0, breached: false };
      }

      const originalInterest = tranche.amount * tranche.interestRate;
      const stressedRate = tranche.interestRate + (rateShockBps / 10000);
      const stressedInterest = tranche.amount * stressedRate;

      const originalDSCR = project.noi / originalInterest;
      const stressedDSCR = project.noi / stressedInterest;

      return {
        trancheId: tranche.id,
        originalDSCR,
        stressedDSCR,
        breached: stressedDSCR < 1.0
      };
    });
  }
};

export default RiskAssessment;
