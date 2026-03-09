/**
 * ════════════════════════════════════════════════════════════════════════════
 * 이지자산평가 - Simulation Writeback Service
 * Digital Twin Dynamic Layer → Kinetic Layer (Neo4j) Writeback
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * 시뮬레이션/가치평가 결과를 Neo4j 그래프 DB의 Kinetic Layer에 반영하여
 * 실시간 의사결정 지원 및 그래프 기반 분석을 가능하게 합니다.
 */

import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";
import { syncService } from "./firebase-neo4j-sync-service";
import { ValuationResult, RiskMetrics, CascadeSimulationResult, EarlyWarningAlert } from "./asset-pricing-types";

// ════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ════════════════════════════════════════════════════════════════════════════

export interface WritebackRecord {
  id?: string;
  type: "valuation" | "risk" | "cascade" | "alert" | "scenario";
  sourceSimulationId: string;
  targetNodeType: string;
  targetNodeId: string;
  updates: Record<string, any>;
  cypherQuery: string;
  status: "pending" | "executing" | "success" | "failed";
  executedAt?: any;
  error?: string;
  createdAt: any;
}

export interface WritebackSummary {
  totalRecords: number;
  pending: number;
  executing: number;
  success: number;
  failed: number;
  lastWritebackAt?: Date;
}

export interface SimulationToWritebackPayload {
  simulationId: string;
  simulationType: "valuation" | "risk" | "cascade" | "scenario";
  projectId?: string;
  companyId?: string;
  trancheId?: string;
  valuationResult?: ValuationResult;
  riskMetrics?: RiskMetrics;
  cascadeResult?: CascadeSimulationResult;
  alerts?: EarlyWarningAlert[];
  recommendation?: string;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// Writeback Service
// ════════════════════════════════════════════════════════════════════════════

export const SimulationWritebackService = {
  /**
   * 시뮬레이션 결과를 Kinetic Layer(Neo4j)에 반영
   */
  async writebackSimulationResult(payload: SimulationToWritebackPayload): Promise<WritebackRecord[]> {
    const records: WritebackRecord[] = [];

    try {
      // 1. 가치평가 결과 Writeback
      if (payload.valuationResult && payload.projectId) {
        const valuationWriteback = await this.createValuationWriteback(
          payload.simulationId,
          payload.projectId,
          payload.valuationResult
        );
        records.push(valuationWriteback);
      }

      // 2. 리스크 지표 Writeback
      if (payload.riskMetrics && payload.projectId) {
        const riskWriteback = await this.createRiskWriteback(
          payload.simulationId,
          payload.projectId,
          payload.riskMetrics
        );
        records.push(riskWriteback);
      }

      // 3. 연쇄부도 시뮬레이션 결과 Writeback
      if (payload.cascadeResult) {
        const cascadeWritebacks = await this.createCascadeWriteback(
          payload.simulationId,
          payload.cascadeResult
        );
        records.push(...cascadeWritebacks);
      }

      // 4. 조기경보 알림 Writeback
      if (payload.alerts && payload.alerts.length > 0) {
        const alertWritebacks = await this.createAlertWritebacks(
          payload.simulationId,
          payload.alerts
        );
        records.push(...alertWritebacks);
      }

      // 5. Neo4j에 실제 반영 (연결된 경우)
      if (syncService.getStatus().neo4jConnected) {
        await this.executeWritebacks(records);
      }

      return records;
    } catch (error) {
      console.error("[SimulationWriteback] Error:", error);
      throw error;
    }
  },

  /**
   * 가치평가 결과 Writeback 레코드 생성
   */
  async createValuationWriteback(
    simulationId: string,
    projectId: string,
    result: ValuationResult
  ): Promise<WritebackRecord> {
    const updates = {
      fair_value_b: result.fairValue,
      npv_b: result.npv,
      irr: result.irr,
      discount_rate: result.discountRate,
      risk_premium: result.riskPremium,
      valuation_date: new Date().toISOString(),
      valuation_method: result.valuationMethod
    };

    const cypherQuery = `
      MATCH (p:Project {id: "${projectId}"})
      SET p.fair_value_b = ${result.fairValue},
          p.npv_b = ${result.npv},
          p.irr = ${result.irr},
          p.discount_rate = ${result.discountRate},
          p.risk_premium = ${result.riskPremium},
          p.last_valuation = datetime(),
          p.valuation_method = "${result.valuationMethod}"
      MERGE (v:ValuationResult {simulation_id: "${simulationId}"})
      SET v.fair_value = ${result.fairValue},
          v.npv = ${result.npv},
          v.irr = ${result.irr},
          v.created_at = datetime()
      MERGE (p)-[:HAS_VALUATION]->(v)
      RETURN p, v
    `;

    const record: Omit<WritebackRecord, "id"> = {
      type: "valuation",
      sourceSimulationId: simulationId,
      targetNodeType: "Project",
      targetNodeId: projectId,
      updates,
      cypherQuery,
      status: "pending",
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "writebackRecords"), record);
    return { ...record, id: docRef.id };
  },

  /**
   * 리스크 지표 Writeback 레코드 생성
   */
  async createRiskWriteback(
    simulationId: string,
    projectId: string,
    metrics: RiskMetrics
  ): Promise<WritebackRecord> {
    const updates = {
      ltv: metrics.ltv,
      dscr: metrics.dscr,
      icr: metrics.icr,
      pd: metrics.pd,
      lgd: metrics.lgd,
      expected_loss: metrics.expectedLoss,
      risk_score: metrics.riskScore,
      risk_grade: metrics.riskGrade
    };

    const cypherQuery = `
      MATCH (p:Project {id: "${projectId}"})
      SET p.ltv = ${metrics.ltv},
          p.dscr = ${metrics.dscr},
          p.icr = ${metrics.icr || 0},
          p.pd = ${metrics.pd},
          p.lgd = ${metrics.lgd},
          p.expected_loss = ${metrics.expectedLoss},
          p.risk_score = ${metrics.riskScore},
          p.risk_grade = "${metrics.riskGrade}",
          p.last_risk_assessment = datetime()
      MERGE (r:RiskAssessment {simulation_id: "${simulationId}"})
      SET r.ltv = ${metrics.ltv},
          r.dscr = ${metrics.dscr},
          r.risk_score = ${metrics.riskScore},
          r.created_at = datetime()
      MERGE (p)-[:HAS_RISK_ASSESSMENT]->(r)
      RETURN p, r
    `;

    const record: Omit<WritebackRecord, "id"> = {
      type: "risk",
      sourceSimulationId: simulationId,
      targetNodeType: "Project",
      targetNodeId: projectId,
      updates,
      cypherQuery,
      status: "pending",
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "writebackRecords"), record);
    return { ...record, id: docRef.id };
  },

  /**
   * 연쇄부도 시뮬레이션 결과 Writeback
   */
  async createCascadeWriteback(
    simulationId: string,
    result: CascadeSimulationResult
  ): Promise<WritebackRecord[]> {
    const records: WritebackRecord[] = [];

    // 영향받은 각 엔티티에 대해 Writeback 생성
    for (const entity of result.affectedEntities) {
      const cypherQuery = `
        MATCH (n {id: "${entity.id}"})
        SET n.cascade_impacted = true,
            n.cascade_probability = ${entity.impactProbability},
            n.cascade_severity = "${entity.impactSeverity}",
            n.cascade_simulation_id = "${simulationId}",
            n.cascade_assessed_at = datetime()
        MERGE (c:CascadeEvent {simulation_id: "${simulationId}", entity_id: "${entity.id}"})
        SET c.impact_probability = ${entity.impactProbability},
            c.impact_severity = "${entity.impactSeverity}",
            c.propagation_path = "${entity.propagationPath?.join(" -> ") || ""}"
        MERGE (n)-[:IMPACTED_BY]->(c)
        RETURN n, c
      `;

      const record: Omit<WritebackRecord, "id"> = {
        type: "cascade",
        sourceSimulationId: simulationId,
        targetNodeType: entity.type,
        targetNodeId: entity.id,
        updates: {
          cascade_impacted: true,
          cascade_probability: entity.impactProbability,
          cascade_severity: entity.impactSeverity
        },
        cypherQuery,
        status: "pending",
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "writebackRecords"), record);
      records.push({ ...record, id: docRef.id });
    }

    return records;
  },

  /**
   * 조기경보 알림 Writeback
   */
  async createAlertWritebacks(
    simulationId: string,
    alerts: EarlyWarningAlert[]
  ): Promise<WritebackRecord[]> {
    const records: WritebackRecord[] = [];

    for (const alert of alerts) {
      const cypherQuery = `
        MATCH (n {id: "${alert.entityId}"})
        SET n.has_warning = true,
            n.warning_severity = "${alert.severity}",
            n.warning_type = "${alert.type}",
            n.warning_threshold = ${alert.threshold},
            n.warning_current = ${alert.currentValue}
        MERGE (w:EarlyWarning {alert_id: "${alert.id}"})
        SET w.type = "${alert.type}",
            w.severity = "${alert.severity}",
            w.threshold = ${alert.threshold},
            w.current_value = ${alert.currentValue},
            w.message = "${alert.message.replace(/"/g, '\\"')}",
            w.triggered_at = datetime()
        MERGE (n)-[:HAS_WARNING]->(w)
        RETURN n, w
      `;

      const record: Omit<WritebackRecord, "id"> = {
        type: "alert",
        sourceSimulationId: simulationId,
        targetNodeType: alert.entityType,
        targetNodeId: alert.entityId,
        updates: {
          has_warning: true,
          warning_severity: alert.severity,
          warning_type: alert.type
        },
        cypherQuery,
        status: "pending",
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "writebackRecords"), record);
      records.push({ ...record, id: docRef.id });
    }

    return records;
  },

  /**
   * Writeback 레코드들을 Neo4j에 실행
   */
  async executeWritebacks(records: WritebackRecord[]): Promise<void> {
    for (const record of records) {
      if (!record.id) continue;

      try {
        // 상태를 executing으로 업데이트
        await updateDoc(doc(db, "writebackRecords", record.id), {
          status: "executing"
        });

        // Neo4j에 Cypher 실행
        const result = await syncService.runCypher(record.cypherQuery);

        if (result.success) {
          await updateDoc(doc(db, "writebackRecords", record.id), {
            status: "success",
            executedAt: serverTimestamp()
          });
        } else {
          await updateDoc(doc(db, "writebackRecords", record.id), {
            status: "failed",
            error: result.message
          });
        }
      } catch (error: any) {
        await updateDoc(doc(db, "writebackRecords", record.id), {
          status: "failed",
          error: error.message
        });
      }
    }
  },

  /**
   * Writeback 기록 조회
   */
  async getWritebackRecords(simulationId?: string): Promise<WritebackRecord[]> {
    try {
      let q;
      if (simulationId) {
        q = query(
          collection(db, "writebackRecords"),
          where("sourceSimulationId", "==", simulationId),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "writebackRecords"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WritebackRecord));
    } catch (error) {
      console.error("[SimulationWriteback] Error fetching records:", error);
      return [];
    }
  },

  /**
   * Writeback 요약 통계
   */
  async getWritebackSummary(): Promise<WritebackSummary> {
    try {
      const records = await this.getWritebackRecords();
      
      const summary: WritebackSummary = {
        totalRecords: records.length,
        pending: records.filter(r => r.status === "pending").length,
        executing: records.filter(r => r.status === "executing").length,
        success: records.filter(r => r.status === "success").length,
        failed: records.filter(r => r.status === "failed").length
      };

      const successRecords = records.filter(r => r.status === "success" && r.executedAt);
      if (successRecords.length > 0) {
        summary.lastWritebackAt = successRecords[0].executedAt?.toDate?.() || new Date();
      }

      return summary;
    } catch (error) {
      console.error("[SimulationWriteback] Error getting summary:", error);
      return { totalRecords: 0, pending: 0, executing: 0, success: 0, failed: 0 };
    }
  },

  /**
   * Pending 상태의 Writeback을 재시도
   */
  async retryPendingWritebacks(): Promise<number> {
    try {
      const q = query(
        collection(db, "writebackRecords"),
        where("status", "in", ["pending", "failed"])
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WritebackRecord));

      if (records.length > 0 && syncService.getStatus().neo4jConnected) {
        await this.executeWritebacks(records);
      }

      return records.length;
    } catch (error) {
      console.error("[SimulationWriteback] Error retrying:", error);
      return 0;
    }
  },

  /**
   * Writeback 상태 실시간 구독
   */
  subscribeToWritebacks(callback: (records: WritebackRecord[]) => void) {
    const q = query(
      collection(db, "writebackRecords"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WritebackRecord));
      callback(records);
    });
  }
};
