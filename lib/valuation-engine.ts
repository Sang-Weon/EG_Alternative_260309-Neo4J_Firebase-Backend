/**
 * [이지자산평가] 가치평가 엔진
 * 
 * DCF/NPV, 비교평가, 원가법, 수익환원법 기반 자산 가치 산정
 */

import {
  AlternativeAssetType,
  CashFlow,
  ValuationParams,
  ValuationResult,
  RiskAdjustment,
  SensitivityResult,
  RiskMetrics,
  Project,
  Tranche,
  TrancheSeniority,
  CreditRating
} from "./asset-pricing-types";

// ═══════════════════════════════════════════════════════════════════
// 신용등급별 기본 스프레드 (bp)
// ═══════════════════════════════════════════════════════════════════

const CREDIT_SPREADS: Record<CreditRating, number> = {
  "AAA": 30, "AA+": 40, "AA": 50, "AA-": 60,
  "A+": 80, "A": 100, "A-": 120,
  "BBB+": 150, "BBB": 180, "BBB-": 220,
  "BB+": 280, "BB": 350, "BB-": 450,
  "B+": 550, "B": 700, "B-": 900,
  "CCC": 1200, "CC": 1600, "C": 2000, "D": 3000, "NR": 500
};

// 트랜치 우선순위별 기본 스프레드 추가 (bp)
const TRANCHE_SPREADS: Record<TrancheSeniority, number> = {
  "SENIOR": 0,
  "MEZZANINE": 200,
  "JUNIOR": 450,
  "EQUITY": 800
};

// 자산유형별 비유동성 프리미엄 (%)
const ILLIQUIDITY_PREMIUMS: Record<AlternativeAssetType, number> = {
  "PF_DEVELOPMENT": 3.0,
  "REAL_ESTATE": 1.5,
  "INFRASTRUCTURE": 2.0,
  "PRIVATE_EQUITY": 3.5,
  "AIRCRAFT": 2.0,
  "SHIP": 2.5,
  "RENEWABLE_ENERGY": 1.8
};

// ═══════════════════════════════════════════════════════════════════
// 핵심 가치평가 함수
// ═══════════════════════════════════════════════════════════════════

export const ValuationEngine = {
  
  /**
   * DCF (Discounted Cash Flow) 가치 산정
   */
  calculateDCF(
    cashFlows: CashFlow[],
    discountRate: number,
    terminalValue?: number,
    terminalGrowthRate?: number
  ): { npv: number; irr: number; breakdown: number[] } {
    
    const periodMultiplier = cashFlows[0]?.periodType === "MONTH" ? 12 : 
                            cashFlows[0]?.periodType === "QUARTER" ? 4 : 1;
    
    const annualRate = discountRate;
    const periodicRate = annualRate / periodMultiplier;
    
    let npv = 0;
    const breakdown: number[] = [];
    
    // 각 기간 현금흐름 할인
    cashFlows.forEach((cf, index) => {
      const netFlow = cf.type === "INFLOW" ? cf.amount : -cf.amount;
      const probabilityAdjusted = netFlow * (cf.probability ?? 1);
      const period = cf.period || (index + 1);
      const discountFactor = Math.pow(1 + periodicRate, -period);
      const presentValue = probabilityAdjusted * discountFactor;
      
      npv += presentValue;
      breakdown.push(presentValue);
    });
    
    // 잔존가치 (Terminal Value) 계산
    if (terminalValue && cashFlows.length > 0) {
      const lastPeriod = cashFlows[cashFlows.length - 1].period || cashFlows.length;
      const tvDiscountFactor = Math.pow(1 + periodicRate, -lastPeriod);
      npv += terminalValue * tvDiscountFactor;
    } else if (terminalGrowthRate !== undefined && cashFlows.length > 0) {
      // Gordon Growth Model
      const lastCF = cashFlows[cashFlows.length - 1];
      const lastFlow = lastCF.type === "INFLOW" ? lastCF.amount : -lastCF.amount;
      const gordonTV = (lastFlow * (1 + terminalGrowthRate)) / (annualRate - terminalGrowthRate);
      const lastPeriod = lastCF.period || cashFlows.length;
      const tvDiscountFactor = Math.pow(1 + periodicRate, -lastPeriod);
      npv += gordonTV * tvDiscountFactor;
    }
    
    // IRR 계산 (Newton-Raphson 근사)
    const irr = this.calculateIRR(cashFlows);
    
    return { npv, irr, breakdown };
  },
  
  /**
   * IRR (Internal Rate of Return) 계산
   */
  calculateIRR(cashFlows: CashFlow[], initialGuess: number = 0.1): number {
    const flows = cashFlows.map(cf => cf.type === "INFLOW" ? cf.amount : -cf.amount);
    
    if (flows.length === 0) return 0;
    
    let rate = initialGuess;
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;
      
      flows.forEach((flow, t) => {
        const period = t + 1;
        npv += flow / Math.pow(1 + rate, period);
        derivative -= (period * flow) / Math.pow(1 + rate, period + 1);
      });
      
      if (Math.abs(npv) < tolerance) break;
      if (Math.abs(derivative) < tolerance) break;
      
      rate = rate - npv / derivative;
      
      // 범위 제한
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }
    
    return rate;
  },
  
  /**
   * LTV (Loan-to-Value) 계산
   */
  calculateLTV(loanAmount: number, assetValue: number): number {
    if (assetValue <= 0) return Infinity;
    return loanAmount / assetValue;
  },
  
  /**
   * DSCR (Debt Service Coverage Ratio) 계산
   */
  calculateDSCR(noi: number, debtService: number): number {
    if (debtService <= 0) return Infinity;
    return noi / debtService;
  },
  
  /**
   * ICR (Interest Coverage Ratio) 계산
   */
  calculateICR(ebit: number, interestExpense: number): number {
    if (interestExpense <= 0) return Infinity;
    return ebit / interestExpense;
  },
  
  /**
   * Debt Yield 계산
   */
  calculateDebtYield(noi: number, loanAmount: number): number {
    if (loanAmount <= 0) return 0;
    return noi / loanAmount;
  },
  
  /**
   * 할인율 산정 (CAPM 기반)
   */
  calculateDiscountRate(params: {
    riskFreeRate: number;
    marketPremium: number;
    beta?: number;
    assetType: AlternativeAssetType;
    creditRating?: CreditRating;
    trancheSeniority?: TrancheSeniority;
  }): number {
    const { riskFreeRate, marketPremium, beta = 1.0, assetType, creditRating, trancheSeniority } = params;
    
    // 기본 CAPM 수익률
    let discount = riskFreeRate + (beta * marketPremium);
    
    // 비유동성 프리미엄 추가
    discount += ILLIQUIDITY_PREMIUMS[assetType] / 100;
    
    // 신용 스프레드 추가
    if (creditRating) {
      discount += CREDIT_SPREADS[creditRating] / 10000;
    }
    
    // 트랜치 스프레드 추가
    if (trancheSeniority) {
      discount += TRANCHE_SPREADS[trancheSeniority] / 10000;
    }
    
    return discount;
  },
  
  /**
   * 종합 가치평가 수행
   */
  performValuation(project: Project, params: ValuationParams): ValuationResult {
    const valuationDate = new Date();
    const riskAdjustments: RiskAdjustment[] = [];
    
    // 1. 할인율 산정
    const discountRate = this.calculateDiscountRate({
      riskFreeRate: params.riskFreeRate,
      marketPremium: params.marketPremium,
      assetType: params.assetType,
      beta: 1.0
    }) + params.assetSpecificPremium + params.illiquidityPremium;
    
    // 2. DCF 가치평가
    const dcfResult = this.calculateDCF(
      params.projectedCashFlows,
      discountRate,
      params.terminalValue,
      params.terminalGrowthRate
    );
    
    let baseValue = dcfResult.npv;
    let adjustedValue = baseValue;
    
    // 3. 리스크 조정
    
    // 3-1. PF 개발 리스크 (준공 리스크)
    if (params.assetType === "PF_DEVELOPMENT" && params.completionRisk) {
      const completionDiscount = baseValue * params.completionRisk;
      riskAdjustments.push({
        factor: "준공리스크",
        description: `공정률 ${(project.completionRate || 0) * 100}% 기준 준공 불확실성 반영`,
        impact: -completionDiscount,
        impactType: "ABSOLUTE"
      });
      adjustedValue -= completionDiscount;
    }
    
    // 3-2. 분양률 리스크 (PF)
    if (params.presaleRate !== undefined && params.presaleRate < 1) {
      const presaleDiscount = baseValue * (1 - params.presaleRate) * 0.3;
      riskAdjustments.push({
        factor: "분양리스크",
        description: `현재 분양률 ${params.presaleRate * 100}% 기준 미분양 리스크 반영`,
        impact: -presaleDiscount,
        impactType: "ABSOLUTE"
      });
      adjustedValue -= presaleDiscount;
    }
    
    // 4. 비교평가 (있는 경우)
    let comparativeValue: number | undefined;
    if (params.comparables && params.comparables.length > 0) {
      const adjustedPrices = params.comparables.map(comp => {
        let adjPrice = comp.transactionPrice;
        adjPrice *= (1 + comp.adjustments.location);
        adjPrice *= (1 + comp.adjustments.size);
        adjPrice *= (1 + comp.adjustments.quality);
        adjPrice *= (1 + comp.adjustments.timing);
        return adjPrice;
      });
      comparativeValue = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length;
    }
    
    // 5. 수익환원법 (수익형 부동산)
    let incomeValue: number | undefined;
    if (params.noi && params.exitCapRate) {
      incomeValue = params.noi / params.exitCapRate;
    }
    
    // 6. 최종 공정가치 산정 (가중평균)
    let fairValue = adjustedValue;
    if (comparativeValue && incomeValue) {
      fairValue = adjustedValue * 0.5 + comparativeValue * 0.25 + incomeValue * 0.25;
    } else if (comparativeValue) {
      fairValue = adjustedValue * 0.7 + comparativeValue * 0.3;
    } else if (incomeValue) {
      fairValue = adjustedValue * 0.6 + incomeValue * 0.4;
    }
    
    // 7. 민감도 분석
    const sensitivityAnalysis = this.performSensitivityAnalysis(params, baseValue, discountRate);
    
    // 8. 결과 생성
    const totalRiskDiscount = riskAdjustments.reduce((sum, adj) => 
      sum + (adj.impactType === "ABSOLUTE" ? adj.impact : baseValue * adj.impact), 0);
    
    return {
      assetId: project.id,
      valuationType: "DCF",
      valuationDate,
      baseValue,
      adjustedValue,
      fairValue,
      breakdown: {
        dcfValue: dcfResult.npv,
        comparativeValue,
        incomeValue
      },
      riskAdjustments,
      totalRiskDiscount,
      sensitivityAnalysis,
      metrics: {
        irr: dcfResult.irr,
        npv: dcfResult.npv,
        paybackPeriod: this.calculatePaybackPeriod(params.projectedCashFlows),
        multipleOnInvested: this.calculateMOIC(params.projectedCashFlows)
      },
      recommendation: this.generateRecommendation(fairValue, project.currentValue, dcfResult.irr),
      confidence: this.assessConfidence(params, riskAdjustments)
    };
  },
  
  /**
   * 민감도 분석 수행
   */
  performSensitivityAnalysis(
    params: ValuationParams,
    baseValue: number,
    discountRate: number
  ): SensitivityResult[] {
    const results: SensitivityResult[] = [];
    const changes = [-0.20, -0.10, -0.05, 0.05, 0.10, 0.20];
    
    // 할인율 민감도
    const discountScenarios = changes.map(change => {
      const newRate = discountRate * (1 + change);
      const result = this.calculateDCF(params.projectedCashFlows, newRate, params.terminalValue);
      return {
        change,
        resultValue: result.npv,
        delta: result.npv - baseValue
      };
    });
    results.push({
      variable: "할인율",
      baseCase: discountRate,
      scenarios: discountScenarios
    });
    
    // 현금흐름 민감도
    const cfScenarios = changes.map(change => {
      const adjustedCFs = params.projectedCashFlows.map(cf => ({
        ...cf,
        amount: cf.amount * (1 + change)
      }));
      const result = this.calculateDCF(adjustedCFs, discountRate, params.terminalValue);
      return {
        change,
        resultValue: result.npv,
        delta: result.npv - baseValue
      };
    });
    results.push({
      variable: "현금흐름",
      baseCase: baseValue,
      scenarios: cfScenarios
    });
    
    return results;
  },
  
  /**
   * 회수기간 계산
   */
  calculatePaybackPeriod(cashFlows: CashFlow[]): number {
    let cumulative = 0;
    const initialInvestment = cashFlows
      .filter(cf => cf.category === "투자")
      .reduce((sum, cf) => sum + cf.amount, 0);
    
    for (let i = 0; i < cashFlows.length; i++) {
      const cf = cashFlows[i];
      if (cf.type === "INFLOW") {
        cumulative += cf.amount;
        if (cumulative >= initialInvestment) {
          return cf.period || (i + 1);
        }
      }
    }
    
    return cashFlows.length;
  },
  
  /**
   * MOIC (Multiple on Invested Capital) 계산
   */
  calculateMOIC(cashFlows: CashFlow[]): number {
    const totalInvestment = cashFlows
      .filter(cf => cf.type === "OUTFLOW")
      .reduce((sum, cf) => sum + cf.amount, 0);
    
    const totalReturn = cashFlows
      .filter(cf => cf.type === "INFLOW")
      .reduce((sum, cf) => sum + cf.amount, 0);
    
    if (totalInvestment === 0) return 0;
    return totalReturn / totalInvestment;
  },
  
  /**
   * 리스크 지표 종합 계산
   */
  calculateRiskMetrics(
    project: Project,
    tranches: Tranche[],
    noi: number,
    debtService: number,
    interestExpense: number
  ): RiskMetrics {
    const totalDebt = tranches
      .filter(t => t.seniority !== "EQUITY")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const ltv = this.calculateLTV(totalDebt, project.currentValue);
    const dscr = this.calculateDSCR(noi, debtService);
    const icr = this.calculateICR(noi, interestExpense);
    const debtYield = this.calculateDebtYield(noi, totalDebt);
    
    // 간단한 PD/LGD 추정 (실제로는 더 정교한 모델 필요)
    const pd = Math.min(0.5, Math.max(0.001, (ltv - 0.5) * 0.2 + (1 - dscr) * 0.1));
    const lgd = Math.min(0.8, Math.max(0.2, ltv * 0.6));
    const ead = totalDebt;
    const expectedLoss = pd * lgd * ead;
    
    return {
      ltv,
      dscr,
      icr,
      debtYield,
      pd,
      lgd,
      ead,
      expectedLoss,
      singleNameConcentration: 0,
      sectorConcentration: 0,
      liquidityScore: dscr > 1.5 ? 8 : dscr > 1.2 ? 6 : dscr > 1.0 ? 4 : 2,
      estimatedLiquidationTime: project.assetType === "REAL_ESTATE" ? 180 : 365
    };
  },
  
  /**
   * 추천 의견 생성
   */
  generateRecommendation(fairValue: number, currentValue: number, irr: number): string {
    const premium = ((fairValue - currentValue) / currentValue) * 100;
    
    if (premium > 15) {
      return `현재 가치 대비 ${premium.toFixed(1)}% 저평가 상태. IRR ${(irr * 100).toFixed(1)}%로 투자 매력도 높음. 적극 매수 권고.`;
    } else if (premium > 5) {
      return `현재 가치 대비 ${premium.toFixed(1)}% 저평가 상태. IRR ${(irr * 100).toFixed(1)}%로 양호한 수익 기대. 매수 권고.`;
    } else if (premium > -5) {
      return `현재 가치 대비 적정 수준. IRR ${(irr * 100).toFixed(1)}%. 보유 유지 권고.`;
    } else if (premium > -15) {
      return `현재 가치 대비 ${Math.abs(premium).toFixed(1)}% 고평가 상태. 신규 투자 신중 검토 필요.`;
    } else {
      return `현재 가치 대비 ${Math.abs(premium).toFixed(1)}% 고평가 상태. IRR ${(irr * 100).toFixed(1)}%. 매도 또는 리스크 관리 강화 권고.`;
    }
  },
  
  /**
   * 신뢰도 평가
   */
  assessConfidence(params: ValuationParams, adjustments: RiskAdjustment[]): "HIGH" | "MEDIUM" | "LOW" {
    const hasComparables = params.comparables && params.comparables.length >= 3;
    const hasSufficientCFs = params.projectedCashFlows.length >= 5;
    const lowRiskAdjustments = adjustments.length <= 2;
    
    if (hasComparables && hasSufficientCFs && lowRiskAdjustments) return "HIGH";
    if (hasSufficientCFs || hasComparables) return "MEDIUM";
    return "LOW";
  }
};

export default ValuationEngine;
