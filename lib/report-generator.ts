/**
 * ════════════════════════════════════════════════════════════════════════════
 * 이지자산평가 - Report Generator
 * 가치평가, 시나리오 분석, 시뮬레이션 결과를 종합하여 최적 제안서 생성
 * ════════════════════════════════════════════════════════════════════════════
 */

import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { ValuationResult, RiskMetrics, CascadeSimulationResult, EarlyWarningAlert, CreditRating } from "./asset-pricing-types";

// ════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ════════════════════════════════════════════════════════════════════════════

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "risk" | "valuation" | "covenant" | "restructure" | "monitor";
  title: string;
  description: string;
  responsible?: string;
  deadline?: string;
  status: "pending" | "in_progress" | "completed";
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: "summary" | "valuation" | "risk" | "scenario" | "cascade" | "recommendation" | "action_items" | "decision_path";
  content: any;
  charts?: ChartConfig[];
  tables?: TableConfig[];
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "radar" | "waterfall";
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  colors?: string[];
}

export interface TableConfig {
  title: string;
  headers: string[];
  rows: any[][];
  highlights?: { row: number; type: "success" | "warning" | "danger" }[];
}

export interface DecisionPath {
  id: string;
  question: string;
  currentState: string;
  options: {
    label: string;
    description: string;
    pros: string[];
    cons: string[];
    recommendation: boolean;
    nextSteps: string[];
  }[];
  rationale: string;
}

export interface InvestmentReport {
  id?: string;
  title: string;
  projectId?: string;
  projectName?: string;
  generatedAt: any;
  status: "draft" | "final" | "archived";
  
  // Executive Summary
  executiveSummary: {
    overallRecommendation: "invest" | "hold" | "divest" | "restructure";
    confidenceLevel: number;
    keyFindings: string[];
    criticalRisks: string[];
    expectedReturn: number;
    riskAdjustedReturn: number;
  };

  // Sections
  sections: ReportSection[];

  // Action Items
  actionItems: ActionItem[];

  // Decision Paths
  decisionPaths: DecisionPath[];

  // Metadata
  metadata: {
    simulationIds: string[];
    dataAsOf: string;
    analyst?: string;
    reviewedBy?: string;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Report Generator
// ════════════════════════════════════════════════════════════════════════════

export const ReportGenerator = {
  /**
   * 종합 투자 보고서 생성
   */
  async generateReport(params: {
    projectId: string;
    projectName: string;
    valuationResult?: ValuationResult;
    riskMetrics?: RiskMetrics;
    cascadeResult?: CascadeSimulationResult;
    alerts?: EarlyWarningAlert[];
    scenarios?: { name: string; result: any }[];
  }): Promise<InvestmentReport> {
    const {
      projectId,
      projectName,
      valuationResult,
      riskMetrics,
      cascadeResult,
      alerts = [],
      scenarios = []
    } = params;

    // 1. Executive Summary 생성
    const executiveSummary = this.generateExecutiveSummary(
      valuationResult,
      riskMetrics,
      cascadeResult,
      alerts
    );

    // 2. 섹션별 콘텐츠 생성
    const sections: ReportSection[] = [];

    // 요약 섹션
    sections.push(this.generateSummarySection(projectName, executiveSummary));

    // 가치평가 섹션
    if (valuationResult) {
      sections.push(this.generateValuationSection(valuationResult));
    }

    // 리스크 분석 섹션
    if (riskMetrics) {
      sections.push(this.generateRiskSection(riskMetrics));
    }

    // 시나리오 분석 섹션
    if (scenarios.length > 0) {
      sections.push(this.generateScenarioSection(scenarios));
    }

    // 연쇄영향 분석 섹션
    if (cascadeResult) {
      sections.push(this.generateCascadeSection(cascadeResult));
    }

    // 의사결정 경로 섹션
    const decisionPaths = this.generateDecisionPaths(
      executiveSummary,
      valuationResult,
      riskMetrics
    );
    sections.push(this.generateDecisionPathSection(decisionPaths));

    // 3. 액션 아이템 생성
    const actionItems = this.generateActionItems(
      executiveSummary,
      riskMetrics,
      alerts,
      cascadeResult
    );
    sections.push(this.generateActionItemsSection(actionItems));

    // 4. 보고서 객체 생성
    const report: InvestmentReport = {
      title: `${projectName} 투자 분석 보고서`,
      projectId,
      projectName,
      generatedAt: serverTimestamp(),
      status: "draft",
      executiveSummary,
      sections,
      actionItems,
      decisionPaths,
      metadata: {
        simulationIds: [],
        dataAsOf: new Date().toISOString().split("T")[0],
      }
    };

    // 5. Firebase에 저장
    // Firebase는 중첩 배열을 지원하지 않으므로 직렬화하여 저장
    try {
      const sanitizeForFirebase = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
          // Check if any element is an array (nested array)
          const hasNestedArray = obj.some(item => Array.isArray(item));
          if (hasNestedArray) {
            // Serialize nested arrays to JSON strings
            return obj.map(item => Array.isArray(item) ? JSON.stringify(item) : sanitizeForFirebase(item));
          }
          return obj.map(sanitizeForFirebase);
        }
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = sanitizeForFirebase(value);
          }
        }
        return cleaned;
      };
      
      const sanitizedReport = sanitizeForFirebase(report);
      sanitizedReport.generatedAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "investmentReports"), sanitizedReport);
      report.id = docRef.id;
    } catch (error) {
      console.warn("[ReportGenerator] Firebase save failed:", error);
      report.id = `local-${Date.now()}`;
    }

    return report;
  },

  /**
   * Executive Summary 생성
   */
  generateExecutiveSummary(
    valuationResult?: ValuationResult,
    riskMetrics?: RiskMetrics,
    cascadeResult?: CascadeSimulationResult,
    alerts?: EarlyWarningAlert[]
  ) {
    const irr = valuationResult?.irr || 0;
    const riskScore = riskMetrics?.riskScore || 50;
    const hasHighRisk = riskScore > 70;
    const hasCriticalAlerts = alerts?.some(a => a.severity === "critical");
    const cascadeRisk = (cascadeResult?.affectedEntities?.length || 0) > 3;

    // 투자 추천 결정 로직
    let recommendation: "invest" | "hold" | "divest" | "restructure" = "hold";
    let confidenceLevel = 70;

    if (irr >= 0.12 && riskScore < 50 && !hasCriticalAlerts) {
      recommendation = "invest";
      confidenceLevel = 85;
    } else if (irr >= 0.08 && riskScore < 70) {
      recommendation = "hold";
      confidenceLevel = 75;
    } else if (hasHighRisk || hasCriticalAlerts || cascadeRisk) {
      if (irr < 0.05) {
        recommendation = "divest";
        confidenceLevel = 80;
      } else {
        recommendation = "restructure";
        confidenceLevel = 70;
      }
    }

    const keyFindings: string[] = [];
    const criticalRisks: string[] = [];

    // Key Findings
    if (valuationResult) {
      keyFindings.push(`공정가치 ${valuationResult.fairValue.toFixed(0)}억원, IRR ${(valuationResult.irr * 100).toFixed(1)}%`);
      keyFindings.push(`NPV ${valuationResult.npv.toFixed(0)}억원 (할인율 ${(valuationResult.discountRate * 100).toFixed(1)}%)`);
    }
    if (riskMetrics) {
      keyFindings.push(`LTV ${(riskMetrics.ltv * 100).toFixed(1)}%, DSCR ${riskMetrics.dscr.toFixed(2)}x`);
      keyFindings.push(`리스크 등급 ${riskMetrics.riskGrade}, 종합 점수 ${riskMetrics.riskScore.toFixed(0)}점`);
    }

    // Critical Risks
    if (riskMetrics) {
      if (riskMetrics.ltv > 0.7) criticalRisks.push(`LTV ${(riskMetrics.ltv * 100).toFixed(1)}% - 담보 부족 위험`);
      if (riskMetrics.dscr < 1.2) criticalRisks.push(`DSCR ${riskMetrics.dscr.toFixed(2)}x - 원리금 상환 위험`);
    }
    if (hasCriticalAlerts) {
      criticalRisks.push("Critical 등급 조기경보 발생");
    }
    if (cascadeRisk) {
      criticalRisks.push(`연쇄영향 대상 ${cascadeResult?.affectedEntities?.length || 0}개 엔티티`);
    }

    const riskAdjustedReturn = irr - (riskScore / 1000);

    return {
      overallRecommendation: recommendation,
      confidenceLevel,
      keyFindings,
      criticalRisks,
      expectedReturn: irr,
      riskAdjustedReturn
    };
  },

  /**
   * 요약 섹션 생성
   */
  generateSummarySection(projectName: string, summary: InvestmentReport["executiveSummary"]): ReportSection {
    const recommendationText = {
      invest: "투자 실행 권고",
      hold: "현상 유지 권고",
      divest: "매각/청산 권고",
      restructure: "구조조정 권고"
    };

    return {
      id: "summary",
      title: "Executive Summary",
      type: "summary",
      content: {
        projectName,
        recommendation: recommendationText[summary.overallRecommendation],
        confidenceLevel: summary.confidenceLevel,
        keyFindings: summary.keyFindings,
        criticalRisks: summary.criticalRisks,
        expectedReturn: summary.expectedReturn,
        riskAdjustedReturn: summary.riskAdjustedReturn
      }
    };
  },

  /**
   * 가치평가 섹션 생성
   */
  generateValuationSection(result: ValuationResult): ReportSection {
    return {
      id: "valuation",
      title: "가치평가 분석",
      type: "valuation",
      content: {
        fairValue: result.fairValue,
        npv: result.npv,
        irr: result.irr,
        discountRate: result.discountRate,
        riskPremium: result.riskPremium,
        valuationMethod: result.valuationMethod,
        cashFlows: result.cashFlows
      },
      charts: [
        {
          type: "waterfall",
          title: "가치 구성 분석",
          data: [
            { name: "기초 가치", value: result.fairValue * 0.8 },
            { name: "리스크 조정", value: -(result.fairValue * result.riskPremium) },
            { name: "성장 프리미엄", value: result.fairValue * 0.15 },
            { name: "최종 가치", value: result.fairValue }
          ]
        }
      ],
      tables: [
        {
          title: "DCF 분석 요약",
          headers: ["항목", "값", "비고"],
          rows: [
            ["공정가치", `${result.fairValue.toFixed(0)}억원`, "DCF 기반"],
            ["NPV", `${result.npv.toFixed(0)}억원`, "순현재가치"],
            ["IRR", `${(result.irr * 100).toFixed(1)}%`, "내부수익률"],
            ["할인율", `${(result.discountRate * 100).toFixed(1)}%`, "WACC 기반"],
            ["리스크 프리미엄", `${(result.riskPremium * 100).toFixed(1)}%`, "자산유형별 조정"]
          ]
        }
      ]
    };
  },

  /**
   * 리스크 분석 섹션 생성
   */
  generateRiskSection(metrics: RiskMetrics): ReportSection {
    return {
      id: "risk",
      title: "리스크 분석",
      type: "risk",
      content: {
        ltv: metrics.ltv,
        dscr: metrics.dscr,
        icr: metrics.icr,
        pd: metrics.pd,
        lgd: metrics.lgd,
        expectedLoss: metrics.expectedLoss,
        riskScore: metrics.riskScore,
        riskGrade: metrics.riskGrade
      },
      charts: [
        {
          type: "radar",
          title: "리스크 프로파일",
          data: [
            { metric: "LTV", value: metrics.ltv * 100, threshold: 70 },
            { metric: "DSCR", value: Math.min(metrics.dscr * 50, 100), threshold: 60 },
            { metric: "PD", value: metrics.pd * 100, threshold: 5 },
            { metric: "LGD", value: metrics.lgd * 100, threshold: 40 },
            { metric: "리스크점수", value: metrics.riskScore, threshold: 50 }
          ]
        }
      ],
      tables: [
        {
          title: "리스크 지표 상세",
          headers: ["지표", "현재값", "임계값", "상태"],
          rows: [
            ["LTV", `${(metrics.ltv * 100).toFixed(1)}%`, "70%", metrics.ltv > 0.7 ? "위험" : "정상"],
            ["DSCR", `${metrics.dscr.toFixed(2)}x`, "1.2x", metrics.dscr < 1.2 ? "위험" : "정상"],
            ["PD", `${(metrics.pd * 100).toFixed(2)}%`, "5%", metrics.pd > 0.05 ? "위험" : "정상"],
            ["LGD", `${(metrics.lgd * 100).toFixed(1)}%`, "40%", metrics.lgd > 0.4 ? "위험" : "정상"]
          ],
          highlights: [
            ...(metrics.ltv > 0.7 ? [{ row: 0, type: "danger" as const }] : []),
            ...(metrics.dscr < 1.2 ? [{ row: 1, type: "danger" as const }] : [])
          ]
        }
      ]
    };
  },

  /**
   * 시나리오 분석 섹션 생성
   */
  generateScenarioSection(scenarios: { name: string; result: any }[]): ReportSection {
    return {
      id: "scenario",
      title: "시나리오 분석",
      type: "scenario",
      content: {
        scenarios: scenarios.map(s => ({
          name: s.name,
          irr: s.result?.summary?.irr || 0,
          npv: s.result?.summary?.npv || 0,
          fairValue: s.result?.summary?.fairValue || 0
        }))
      },
      charts: [
        {
          type: "bar",
          title: "시나리오별 IRR 비교",
          data: scenarios.map(s => ({
            name: s.name,
            IRR: (s.result?.summary?.irr || 0) * 100
          })),
          xKey: "name",
          yKey: "IRR"
        }
      ]
    };
  },

  /**
   * 연쇄영향 분석 섹션 생성
   */
  generateCascadeSection(result: CascadeSimulationResult): ReportSection {
    return {
      id: "cascade",
      title: "연쇄영향 분석",
      type: "cascade",
      content: {
        triggerEvent: result.triggerEvent,
        totalAffected: result.affectedEntities.length,
        totalLoss: result.totalEstimatedLoss,
        propagationDepth: result.propagationDepth,
        affectedEntities: result.affectedEntities.slice(0, 10)
      },
      tables: [
        {
          title: "영향받는 엔티티",
          headers: ["엔티티", "유형", "영향확률", "심각도"],
          rows: result.affectedEntities.slice(0, 10).map(e => [
            e.name,
            e.type,
            `${(e.impactProbability * 100).toFixed(0)}%`,
            e.impactSeverity
          ])
        }
      ]
    };
  },

  /**
   * 의사결정 경로 생성
   */
  generateDecisionPaths(
    summary: InvestmentReport["executiveSummary"],
    valuationResult?: ValuationResult,
    riskMetrics?: RiskMetrics
  ): DecisionPath[] {
    const paths: DecisionPath[] = [];

    // 투자 의사결정 경로
    paths.push({
      id: "investment_decision",
      question: "해당 프로젝트에 투자를 진행해야 하는가?",
      currentState: `IRR ${((valuationResult?.irr || 0) * 100).toFixed(1)}%, 리스크 등급 ${riskMetrics?.riskGrade || "N/A"}`,
      options: [
        {
          label: "투자 실행",
          description: "현재 조건에서 투자를 진행",
          pros: ["예상 수익률 달성 가능", "시장 선점 기회"],
          cons: ["리스크 노출", "자본 lock-up"],
          recommendation: summary.overallRecommendation === "invest",
          nextSteps: ["투자위원회 승인", "법률 실사", "계약 체결"]
        },
        {
          label: "조건부 투자",
          description: "리스크 완화 조건 충족 시 투자",
          pros: ["리스크 관리", "협상 여지"],
          cons: ["시간 소요", "기회 상실 가능"],
          recommendation: summary.overallRecommendation === "hold",
          nextSteps: ["추가 담보 요청", "금리 조건 협상", "약정 강화"]
        },
        {
          label: "투자 보류",
          description: "현 시점에서 투자하지 않음",
          pros: ["리스크 회피", "자본 보존"],
          cons: ["기회비용", "시장 이탈"],
          recommendation: summary.overallRecommendation === "divest",
          nextSteps: ["모니터링 유지", "대안 검토", "재평가 일정 수립"]
        }
      ],
      rationale: `현재 리스크 점수 ${riskMetrics?.riskScore?.toFixed(0) || "N/A"}점, 예상 수익률 ${((valuationResult?.irr || 0) * 100).toFixed(1)}% 기준으로 ${summary.overallRecommendation === "invest" ? "투자 실행을 권고합니다." : "신중한 검토가 필요합니다."}`
    });

    // 리스크가 높은 경우 구조조정 경로 추가
    if (riskMetrics && riskMetrics.riskScore > 60) {
      paths.push({
        id: "restructure_decision",
        question: "리스크 완화를 위해 구조조정이 필요한가?",
        currentState: `LTV ${((riskMetrics.ltv || 0) * 100).toFixed(1)}%, DSCR ${riskMetrics.dscr?.toFixed(2) || "N/A"}x`,
        options: [
          {
            label: "담보 강화",
            description: "추가 담보 확보를 통한 LTV 개선",
            pros: ["신용 보강", "조건 개선 여지"],
            cons: ["비용 발생", "시간 소요"],
            recommendation: riskMetrics.ltv > 0.7,
            nextSteps: ["담보 재평가", "추가 담보 협상", "근저당 설정"]
          },
          {
            label: "상환 구조 변경",
            description: "원리금 상환 스케줄 조정",
            pros: ["현금흐름 개선", "부도 위험 감소"],
            cons: ["수익률 하락", "장기 비용 증가"],
            recommendation: riskMetrics.dscr < 1.2,
            nextSteps: ["상환 일정 재협상", "금리 조정", "만기 연장"]
          },
          {
            label: "현상 유지",
            description: "현재 구조 유지 및 모니터링",
            pros: ["추가 비용 없음", "안정적"],
            cons: ["리스크 지속", "기회 상실"],
            recommendation: riskMetrics.riskScore < 50,
            nextSteps: ["월간 모니터링", "조기경보 설정", "정기 리뷰"]
          }
        ],
        rationale: `현재 리스크 수준이 높아 적극적인 리스크 관리가 필요합니다. ${riskMetrics.ltv > 0.7 ? "LTV가 70%를 초과하여 담보 강화를 우선 권고합니다." : "DSCR이 1.2x 미만으로 상환 구조 검토가 필요합니다."}`
      });
    }

    return paths;
  },

  /**
   * 의사결정 경로 섹션 생성
   */
  generateDecisionPathSection(paths: DecisionPath[]): ReportSection {
    return {
      id: "decision_path",
      title: "의사결정 경로",
      type: "decision_path",
      content: { paths }
    };
  },

  /**
   * 액션 아이템 생성
   */
  generateActionItems(
    summary: InvestmentReport["executiveSummary"],
    riskMetrics?: RiskMetrics,
    alerts?: EarlyWarningAlert[],
    cascadeResult?: CascadeSimulationResult
  ): ActionItem[] {
    const items: ActionItem[] = [];
    let itemId = 1;

    // Critical 알림 기반 액션
    alerts?.filter(a => a.severity === "critical").forEach(alert => {
      items.push({
        id: `action_${itemId++}`,
        priority: "critical",
        category: "risk",
        title: `[긴급] ${alert.type} 임계값 초과`,
        description: alert.message,
        status: "pending",
        relatedEntityId: alert.entityId,
        relatedEntityType: alert.entityType
      });
    });

    // 리스크 지표 기반 액션
    if (riskMetrics) {
      if (riskMetrics.ltv > 0.7) {
        items.push({
          id: `action_${itemId++}`,
          priority: "high",
          category: "covenant",
          title: "LTV 약정 위반 대응",
          description: `현재 LTV ${(riskMetrics.ltv * 100).toFixed(1)}%로 70% 기준 초과. 추가 담보 확보 또는 원금 상환 필요.`,
          deadline: "2주 이내",
          status: "pending"
        });
      }
      if (riskMetrics.dscr < 1.2) {
        items.push({
          id: `action_${itemId++}`,
          priority: "high",
          category: "restructure",
          title: "DSCR 개선 방안 수립",
          description: `현재 DSCR ${riskMetrics.dscr.toFixed(2)}x로 1.2x 기준 미달. 상환 구조 조정 검토 필요.`,
          deadline: "1개월 이내",
          status: "pending"
        });
      }
    }

    // 연쇄영향 기반 액션
    if (cascadeResult && cascadeResult.affectedEntities.length > 0) {
      items.push({
        id: `action_${itemId++}`,
        priority: cascadeResult.affectedEntities.length > 5 ? "high" : "medium",
        category: "monitor",
        title: "연쇄영향 모니터링 강화",
        description: `${cascadeResult.affectedEntities.length}개 엔티티가 연쇄영향 대상. 일일 모니터링 체계 구축 필요.`,
        status: "pending"
      });
    }

    // 투자 추천 기반 액션
    if (summary.overallRecommendation === "invest") {
      items.push({
        id: `action_${itemId++}`,
        priority: "medium",
        category: "valuation",
        title: "투자위원회 보고 준비",
        description: "투자 실행을 위한 최종 보고서 작성 및 위원회 승인 요청",
        deadline: "1주 이내",
        status: "pending"
      });
    } else if (summary.overallRecommendation === "divest") {
      items.push({
        id: `action_${itemId++}`,
        priority: "high",
        category: "restructure",
        title: "Exit 전략 수립",
        description: "투자 회수를 위한 매각/청산 전략 수립 및 잠재 매수자 탐색",
        deadline: "2주 이내",
        status: "pending"
      });
    }

    // 정기 모니터링 액션
    items.push({
      id: `action_${itemId++}`,
      priority: "low",
      category: "monitor",
      title: "정기 가치평가 리뷰",
      description: "분기별 가치평가 업데이트 및 리스크 재평가 수행",
      deadline: "분기말",
      status: "pending"
    });

    return items;
  },

  /**
   * 액션 아이템 섹션 생성
   */
  generateActionItemsSection(items: ActionItem[]): ReportSection {
    return {
      id: "action_items",
      title: "액션 아이템",
      type: "action_items",
      content: { items },
      tables: [
        {
          title: "우선순위별 액션 아이템",
          headers: ["우선순위", "카테고리", "항목", "기한", "상태"],
          rows: items.map(item => [
            item.priority.toUpperCase(),
            item.category,
            item.title,
            item.deadline || "-",
            item.status
          ]),
          highlights: items.map((item, idx) => ({
            row: idx,
            type: item.priority === "critical" ? "danger" as const : 
                  item.priority === "high" ? "warning" as const : "success" as const
          }))
        }
      ]
    };
  },

  /**
   * 보고서 목록 조회
   */
  async getReports(projectId?: string): Promise<InvestmentReport[]> {
    try {
      let q;
      if (projectId) {
        q = query(
          collection(db, "investmentReports"),
          where("projectId", "==", projectId),
          orderBy("generatedAt", "desc")
        );
      } else {
        q = query(
          collection(db, "investmentReports"),
          orderBy("generatedAt", "desc"),
          limit(20)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentReport));
    } catch (error) {
      console.error("[ReportGenerator] Error fetching reports:", error);
      return [];
    }
  },

  /**
   * 보고서 실시간 구독
   */
  subscribeToReports(callback: (reports: InvestmentReport[]) => void) {
    const q = query(
      collection(db, "investmentReports"),
      orderBy("generatedAt", "desc"),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentReport));
      callback(reports);
    });
  }
};
