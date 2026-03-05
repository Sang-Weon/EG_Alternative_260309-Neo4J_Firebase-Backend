import { db } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    onSnapshot,
    Timestamp,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";

export interface ObjectType {
    id: string;
    name: string;
    description: string;
    properties: Property[];
    source: "manual" | "ai-mapped";
    category?: "company" | "project" | "tranche" | "fund" | "covenant" | "collateral" | "credit_event";
    metadata?: Record<string, any>;
}

export interface Property {
    id: string;
    name: string;
    type: string;
    required: boolean;
}

export interface PropertyType {
    id: string;
    name: string;
    dataType: "string" | "number" | "boolean" | "date" | "json";
    description: string;
    validation?: string;
    defaultValue?: string;
    usedBy: string[];
    source: "manual" | "ai-mapped";
}

export interface LinkType {
    id: string;
    name: string;
    fromType: string;
    toType: string;
    bidirectional: boolean;
    neo4jType?: string;
    description?: string;
}

export interface ActionType {
    id: string;
    name: string;
    description: string;
    targetSystems: string[];
    affectedModules: string[];
}

export interface WritebackAction {
    id?: string;
    actionTypeId: string;
    decision: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    logs: string[];
    results: any[];
    createdAt: any;
}

export const OntologyService = {
    // 객체 타입 조회
    async getObjectTypes(): Promise<ObjectType[]> {
        try {
            const querySnapshot = await getDocs(collection(db, "objectTypes"));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObjectType));
        } catch (e) {
            console.error("Error getting objects:", e);
            return [];
        }
    },

    // 속성 타입 조회
    async getPropertyTypes(): Promise<PropertyType[]> {
        const querySnapshot = await getDocs(collection(db, "propertyTypes"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType));
    },

    // 관계 타입 조회
    async getLinkTypes(): Promise<LinkType[]> {
        const querySnapshot = await getDocs(collection(db, "linkTypes"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkType));
    },

    // 실시간 구독
    subscribeToObjectTypes(callback: (types: ObjectType[]) => void) {
        return onSnapshot(collection(db, "objectTypes"), (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObjectType)));
        });
    },

    subscribeToPropertyTypes(callback: (types: PropertyType[]) => void) {
        return onSnapshot(collection(db, "propertyTypes"), (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyType)));
        });
    },

    subscribeToLinkTypes(callback: (types: LinkType[]) => void) {
        return onSnapshot(collection(db, "linkTypes"), (snapshot) => {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkType)));
        });
    },

    // 액션 처리
    async executeWriteback(actionData: Omit<WritebackAction, "id" | "createdAt">): Promise<string> {
        const docRef = await addDoc(collection(db, "writebackActions"), {
            ...actionData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    },

    async updateWritebackAction(actionId: string, updates: Partial<WritebackAction>): Promise<void> {
        const docRef = doc(db, "writebackActions", actionId);
        await updateDoc(docRef, updates);
    },

    subscribeToAction(actionId: string, callback: (action: WritebackAction) => void) {
        return onSnapshot(doc(db, "writebackActions", actionId), (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as WritebackAction);
            }
        });
    },

    // Neo4j 연동: 고도화된 Cypher 쿼리 생성기
    generateCypher(objectTypes: ObjectType[], linkTypes: LinkType[]): string {
        let cypher = "// [이지자산평가] AI Generated Cypher for Neo4j Alternative Investment Ontology\n";
        cypher += "// Generated at: " + new Date().toLocaleString() + "\n";
        cypher += "// Objects: " + objectTypes.length + " | Links: " + linkTypes.length + "\n\n";

        cypher += "// ─── 1. CONSTRAINTS (Unique IDs) ───────────────────────────────\n";
        const labelSet = new Set<string>();
        objectTypes.forEach(obj => {
            const label = (obj.metadata?.neo4j_label || obj.name).replace(/\s/g, '_');
            if (!labelSet.has(label)) {
                labelSet.add(label);
                cypher += `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE;\n`;
            }
        });
        cypher += "\n";

        cypher += "// ─── 2. ONTOLOGY TYPE NODES (Schema Layer) ─────────────────────\n";
        objectTypes.forEach(obj => {
            const label = (obj.metadata?.neo4j_label || obj.name).replace(/\s/g, '_');
            const category = obj.category || "general";
            cypher += `MERGE (t:OntologyType:${category.toUpperCase()} {name: "${obj.name}"})\n`;
            cypher += `  SET t.description = "${obj.description}", t.source = "${obj.source}", `;
            cypher += `t.neo4j_label = "${label}", t.category = "${category}";\n`;
        });
        cypher += "\n";

        cypher += "// ─── 3. INSTANCE NODE TEMPLATES ────────────────────────────────\n";
        objectTypes.forEach(obj => {
            const label = (obj.metadata?.neo4j_label || obj.name).replace(/\s/g, '_');
            const props = obj.properties?.map(p => `${p.name}: null`).join(", ") || "id: null";
            cypher += `// ${obj.name}: MERGE (n:${label} {id: "<uuid>", ${props}})\n`;
        });
        cypher += "\n";

        cypher += "// ─── 4. RELATIONSHIP SCHEMA ─────────────────────────────────────\n";
        linkTypes.forEach(link => {
            const relType = (link.neo4jType || link.name).toUpperCase().replace(/\s/g, '_');
            const desc = link.description || "";
            cypher += `// [${link.fromType}] -[:${relType}]-> [${link.toType}] | ${desc}\n`;
            cypher += `MATCH (a:OntologyType {name: "${link.fromType}"}), (b:OntologyType {name: "${link.toType}"})\n`;
            cypher += `MERGE (a)-[r:${relType} {bidirectional: ${link.bidirectional}}]->(b);\n`;
            if (link.bidirectional) {
                cypher += `MERGE (b)-[rb:${relType} {bidirectional: true}]->(a);\n`;
            }
        });

        return cypher;
    },

    // ════════════════════════════════════════════════════════════════════
    // 이지자산평가 대체투자 온톨로지 시딩
    // Objects: 15 | Links: 18 | Properties: 28
    // ════════════════════════════════════════════════════════════════════
    async seedInitialData() {
        console.log("[이지자산평가] Starting Alternative Investment Ontology Seed...");
        console.log("Domain: 대체투자 자산 가치평가 (PF, 부동산, 인프라, 항공기/선박, 신재생에너지)");

        try {
            // 1. 기존 데이터 일괄 삭제
            const collections = ["objectTypes", "propertyTypes", "linkTypes", "assetSimulations", "writebackActions"];
            const deleteBatch = writeBatch(db);
            for (const colName of collections) {
                const q = await getDocs(collection(db, colName));
                q.docs.forEach(d => deleteBatch.delete(d.ref));
            }
            await deleteBatch.commit();
            console.log("[이지자산평가] Existing data cleared.");

            // 2. 신규 데이터 배치 생성
            const seedBatch = writeBatch(db);

            // ═══════════════════════════════════════════════════════════════
            // ▶ OBJECTS (15개) - 대체투자 전 도메인 커버리지
            // ═══════════════════════════════════════════════════════════════
            const objects = [
                // ── 회사 (Company) ───────────────────────────────────
                {
                    name: "Constructor",
                    description: "시공사 - 건설 공사 실행 및 책임준공 담당",
                    category: "company",
                    source: "ai-mapped",
                    properties: [
                        { id: "con_name", name: "Name", type: "string", required: true },
                        { id: "con_rating", name: "Credit_Rating", type: "string", required: true },
                        { id: "con_pd", name: "Default_Probability", type: "number", required: true },
                        { id: "con_assets", name: "Total_Assets_B", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Company", role: "시공사" }
                },
                {
                    name: "Developer",
                    description: "시행사 - 부동산 개발 사업 기획 및 추진",
                    category: "company",
                    source: "ai-mapped",
                    properties: [
                        { id: "dev_name", name: "Name", type: "string", required: true },
                        { id: "dev_rating", name: "Credit_Rating", type: "string", required: true },
                        { id: "dev_pd", name: "Default_Probability", type: "number", required: true },
                        { id: "dev_track", name: "Track_Record", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Company", role: "시행사" }
                },
                {
                    name: "Operator",
                    description: "운영사 - 자산 운영 및 관리 담당",
                    category: "company",
                    source: "ai-mapped",
                    properties: [
                        { id: "op_name", name: "Name", type: "string", required: true },
                        { id: "op_rating", name: "Credit_Rating", type: "string", required: true },
                        { id: "op_aum", name: "AUM_B", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Company", role: "운영사" }
                },

                // ── 프로젝트 (Project) ────────────────────────────────
                {
                    name: "PF_Project",
                    description: "부동산 PF 개발 사업 - 준공 전 개발형 프로젝트",
                    category: "project",
                    source: "ai-mapped",
                    properties: [
                        { id: "pf_name", name: "Name", type: "string", required: true },
                        { id: "pf_total", name: "Total_Amount_B", type: "number", required: true },
                        { id: "pf_value", name: "Current_Value_B", type: "number", required: true },
                        { id: "pf_comp", name: "Completion_Rate", type: "number", required: true },
                        { id: "pf_presale", name: "Presale_Rate", type: "number", required: false },
                        { id: "pf_status", name: "Status", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Project", asset_type: "PF_DEVELOPMENT" }
                },
                {
                    name: "Real_Estate",
                    description: "수익형 부동산 - 오피스/상업/물류/호텔 등",
                    category: "project",
                    source: "ai-mapped",
                    properties: [
                        { id: "re_name", name: "Name", type: "string", required: true },
                        { id: "re_value", name: "Current_Value_B", type: "number", required: true },
                        { id: "re_noi", name: "NOI_B", type: "number", required: true },
                        { id: "re_cap", name: "Cap_Rate", type: "number", required: true },
                        { id: "re_occ", name: "Occupancy_Rate", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Project", asset_type: "REAL_ESTATE" }
                },
                {
                    name: "Infrastructure",
                    description: "SOC 인프라 - 도로/항만/공항/에너지 등",
                    category: "project",
                    source: "ai-mapped",
                    properties: [
                        { id: "inf_name", name: "Name", type: "string", required: true },
                        { id: "inf_value", name: "Current_Value_B", type: "number", required: true },
                        { id: "inf_period", name: "Concession_Period_Y", type: "number", required: true },
                        { id: "inf_rev", name: "Revenue_Type", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Project", asset_type: "INFRASTRUCTURE" }
                },
                {
                    name: "Aircraft_Ship",
                    description: "항공기/선박 - 리스 기반 운용자산",
                    category: "project",
                    source: "ai-mapped",
                    properties: [
                        { id: "as_name", name: "Name", type: "string", required: true },
                        { id: "as_value", name: "Current_Value_B", type: "number", required: true },
                        { id: "as_age", name: "Asset_Age_Y", type: "number", required: true },
                        { id: "as_lease", name: "Monthly_Lease_B", type: "number", required: true },
                        { id: "as_residual", name: "Residual_Value_B", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Project", asset_type: "AIRCRAFT_SHIP" }
                },
                {
                    name: "Renewable_Energy",
                    description: "신재생에너지 - 태양광/풍력/ESS 등",
                    category: "project",
                    source: "ai-mapped",
                    properties: [
                        { id: "rn_name", name: "Name", type: "string", required: true },
                        { id: "rn_value", name: "Current_Value_B", type: "number", required: true },
                        { id: "rn_cap", name: "Capacity_MW", type: "number", required: true },
                        { id: "rn_ppa", name: "PPA_Price", type: "number", required: true },
                        { id: "rn_cf", name: "Capacity_Factor", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Project", asset_type: "RENEWABLE_ENERGY" }
                },

                // ── 트랜치 (Tranche) ──────────────────────────────────
                {
                    name: "Senior_Tranche",
                    description: "선순위 트랜치 - 우선 상환, 낮은 리스크",
                    category: "tranche",
                    source: "ai-mapped",
                    properties: [
                        { id: "sr_amount", name: "Amount_B", type: "number", required: true },
                        { id: "sr_ratio", name: "Ratio", type: "number", required: true },
                        { id: "sr_rate", name: "Interest_Rate", type: "number", required: true },
                        { id: "sr_spread", name: "Spread_Bps", type: "number", required: true },
                        { id: "sr_el", name: "Expected_Loss", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Tranche", seniority: "SENIOR" }
                },
                {
                    name: "Mezzanine_Tranche",
                    description: "중순위 트랜치 - 중간 위험/수익",
                    category: "tranche",
                    source: "ai-mapped",
                    properties: [
                        { id: "mz_amount", name: "Amount_B", type: "number", required: true },
                        { id: "mz_ratio", name: "Ratio", type: "number", required: true },
                        { id: "mz_rate", name: "Interest_Rate", type: "number", required: true },
                        { id: "mz_spread", name: "Spread_Bps", type: "number", required: true },
                        { id: "mz_el", name: "Expected_Loss", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Tranche", seniority: "MEZZANINE" }
                },
                {
                    name: "Junior_Tranche",
                    description: "후순위 트랜치 - 높은 위험/수익",
                    category: "tranche",
                    source: "ai-mapped",
                    properties: [
                        { id: "jr_amount", name: "Amount_B", type: "number", required: true },
                        { id: "jr_ratio", name: "Ratio", type: "number", required: true },
                        { id: "jr_rate", name: "Interest_Rate", type: "number", required: true },
                        { id: "jr_spread", name: "Spread_Bps", type: "number", required: true },
                        { id: "jr_el", name: "Expected_Loss", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Tranche", seniority: "JUNIOR" }
                },

                // ── 펀드 (Fund) ───────────────────────────────────────
                {
                    name: "Investment_Fund",
                    description: "투자 펀드 - 부동산/인프라/PEF 등",
                    category: "fund",
                    source: "ai-mapped",
                    properties: [
                        { id: "fund_name", name: "Name", type: "string", required: true },
                        { id: "fund_type", name: "Type", type: "string", required: true },
                        { id: "fund_aum", name: "AUM_B", type: "number", required: true },
                        { id: "fund_target", name: "Target_Return", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Fund" }
                },

                // ── 약정 (Covenant) ───────────────────────────────────
                {
                    name: "Financial_Covenant",
                    description: "재무 약정 - LTV/DSCR/ICR 등 기준",
                    category: "covenant",
                    source: "ai-mapped",
                    properties: [
                        { id: "cov_type", name: "Type", type: "string", required: true },
                        { id: "cov_threshold", name: "Threshold", type: "number", required: true },
                        { id: "cov_current", name: "Current_Value", type: "number", required: true },
                        { id: "cov_status", name: "Status", type: "string", required: true },
                        { id: "cov_breach", name: "Breach_Count", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Covenant" }
                },

                // ── 담보 (Collateral) ─────────────────────────────────
                {
                    name: "Collateral_Asset",
                    description: "담보 자산 - 토지/건물/채권/주식/보증 등",
                    category: "collateral",
                    source: "ai-mapped",
                    properties: [
                        { id: "col_type", name: "Type", type: "string", required: true },
                        { id: "col_appr", name: "Appraised_Value_B", type: "number", required: true },
                        { id: "col_liq", name: "Liquidation_Value_B", type: "number", required: true },
                        { id: "col_haircut", name: "Haircut", type: "number", required: true }
                    ],
                    metadata: { neo4j_label: "Collateral" }
                },

                // ── 신용이벤트 (Credit Event) ─────────────────────────
                {
                    name: "Credit_Event",
                    description: "신용 이벤트 - 부도/구조조정/등급하락 등",
                    category: "credit_event",
                    source: "ai-mapped",
                    properties: [
                        { id: "evt_type", name: "Type", type: "string", required: true },
                        { id: "evt_date", name: "Occurred_Date", type: "date", required: true },
                        { id: "evt_severity", name: "Severity", type: "string", required: true },
                        { id: "evt_loss", name: "Estimated_Loss_B", type: "number", required: false },
                        { id: "evt_resolved", name: "Resolved", type: "boolean", required: false }
                    ],
                    metadata: { neo4j_label: "CreditEvent" }
                }
            ];

            objects.forEach(obj => {
                const ref = doc(collection(db, "objectTypes"));
                seedBatch.set(ref, obj);
            });

            // ═══════════════════════════════════════════════════════════════
            // ▶ LINKS (18개) - 대체투자 비즈니스 관계
            // ═══════════════════════════════════════════════════════════════
            const links = [
                // 회사-프로젝트 관계
                { name: "RESPONSIBLE_FOR", fromType: "Constructor", toType: "PF_Project", bidirectional: false, neo4jType: "RESPONSIBLE_FOR", description: "시공사의 책임준공 담당" },
                { name: "DEVELOPS", fromType: "Developer", toType: "PF_Project", bidirectional: false, neo4jType: "DEVELOPS", description: "시행사의 개발 사업 추진" },
                { name: "OPERATES", fromType: "Operator", toType: "Real_Estate", bidirectional: false, neo4jType: "OPERATES", description: "운영사의 자산 운영" },
                { name: "OPERATES", fromType: "Operator", toType: "Infrastructure", bidirectional: false, neo4jType: "OPERATES", description: "운영사의 인프라 운영" },
                { name: "LEASES", fromType: "Operator", toType: "Aircraft_Ship", bidirectional: false, neo4jType: "LEASES", description: "운영사의 항공기/선박 리스" },

                // 프로젝트-트랜치 관계
                { name: "HAS_TRANCHE", fromType: "PF_Project", toType: "Senior_Tranche", bidirectional: false, neo4jType: "HAS_TRANCHE", description: "프로젝트의 선순위 트랜치" },
                { name: "HAS_TRANCHE", fromType: "PF_Project", toType: "Mezzanine_Tranche", bidirectional: false, neo4jType: "HAS_TRANCHE", description: "프로젝트의 중순위 트랜치" },
                { name: "HAS_TRANCHE", fromType: "PF_Project", toType: "Junior_Tranche", bidirectional: false, neo4jType: "HAS_TRANCHE", description: "프로젝트의 후순위 트랜치" },
                { name: "HAS_TRANCHE", fromType: "Real_Estate", toType: "Senior_Tranche", bidirectional: false, neo4jType: "HAS_TRANCHE", description: "부동산의 선순위 트랜치" },

                // 트랜치-펀드 관계
                { name: "HELD_BY", fromType: "Senior_Tranche", toType: "Investment_Fund", bidirectional: false, neo4jType: "HELD_BY", description: "펀드의 선순위 보유" },
                { name: "HELD_BY", fromType: "Mezzanine_Tranche", toType: "Investment_Fund", bidirectional: false, neo4jType: "HELD_BY", description: "펀드의 중순위 보유" },
                { name: "HELD_BY", fromType: "Junior_Tranche", toType: "Investment_Fund", bidirectional: false, neo4jType: "HELD_BY", description: "펀드의 후순위 보유" },

                // 프로젝트-약정/담보 관계
                { name: "HAS_COVENANT", fromType: "PF_Project", toType: "Financial_Covenant", bidirectional: false, neo4jType: "HAS_COVENANT", description: "프로젝트의 재무 약정" },
                { name: "HAS_COVENANT", fromType: "Real_Estate", toType: "Financial_Covenant", bidirectional: false, neo4jType: "HAS_COVENANT", description: "부동산의 재무 약정" },
                { name: "SECURED_BY", fromType: "PF_Project", toType: "Collateral_Asset", bidirectional: false, neo4jType: "SECURED_BY", description: "프로젝트의 담보 설정" },
                { name: "SECURED_BY", fromType: "Real_Estate", toType: "Collateral_Asset", bidirectional: false, neo4jType: "SECURED_BY", description: "부동산의 담보 설정" },

                // 신용이벤트 관계
                { name: "TRIGGERS", fromType: "Constructor", toType: "Credit_Event", bidirectional: false, neo4jType: "TRIGGERS", description: "시공사 관련 신용 이벤트" },
                { name: "AFFECTS", fromType: "Credit_Event", toType: "PF_Project", bidirectional: false, neo4jType: "AFFECTS", description: "신용 이벤트가 프로젝트에 영향" }
            ];

            links.forEach(link => {
                const ref = doc(collection(db, "linkTypes"));
                seedBatch.set(ref, link);
            });

            // ═══════════════════════════════════════════════════════════════
            // ▶ PROPERTIES (28개) - 대체투자 속성 풀
            // ═══════════════════════════════════════════════════════════════
            const props = [
                // 가치평가 지표
                { name: "Current_Value_B", dataType: "number", description: "현재 가치 (억원)", usedBy: ["PF_Project", "Real_Estate", "Infrastructure", "Aircraft_Ship", "Renewable_Energy"], source: "ai-mapped" },
                { name: "Total_Amount_B", dataType: "number", description: "총 사업비 (억원)", usedBy: ["PF_Project"], source: "ai-mapped" },
                { name: "NOI_B", dataType: "number", description: "순영업이익 Net Operating Income (억원)", usedBy: ["Real_Estate"], source: "ai-mapped" },
                { name: "Cap_Rate", dataType: "number", description: "자본환원율 Capitalization Rate (%)", validation: "0-20", usedBy: ["Real_Estate"], source: "ai-mapped" },
                { name: "IRR", dataType: "number", description: "내부수익률 Internal Rate of Return (%)", usedBy: ["PF_Project", "Real_Estate", "Infrastructure"], source: "ai-mapped" },
                { name: "NPV_B", dataType: "number", description: "순현재가치 Net Present Value (억원)", usedBy: ["PF_Project", "Real_Estate"], source: "ai-mapped" },

                // 리스크 지표
                { name: "LTV", dataType: "number", description: "담보인정비율 Loan-to-Value (%)", validation: "0-100", usedBy: ["PF_Project", "Real_Estate"], source: "ai-mapped" },
                { name: "DSCR", dataType: "number", description: "원리금상환비율 Debt Service Coverage Ratio (배)", usedBy: ["PF_Project", "Real_Estate", "Infrastructure"], source: "ai-mapped" },
                { name: "ICR", dataType: "number", description: "이자보상비율 Interest Coverage Ratio (배)", usedBy: ["PF_Project", "Real_Estate"], source: "ai-mapped" },
                { name: "Default_Probability", dataType: "number", description: "부도확률 PD (%)", validation: "0-100", usedBy: ["Constructor", "Developer"], source: "ai-mapped" },
                { name: "Expected_Loss", dataType: "number", description: "예상손실 EL (%)", usedBy: ["Senior_Tranche", "Mezzanine_Tranche", "Junior_Tranche"], source: "ai-mapped" },
                { name: "Risk_Score", dataType: "number", description: "종합 리스크 점수 (0-100)", validation: "0-100", usedBy: ["PF_Project", "Real_Estate"], source: "ai-mapped" },

                // 프로젝트 진행 지표
                { name: "Completion_Rate", dataType: "number", description: "공정률 (%)", validation: "0-100", usedBy: ["PF_Project"], source: "ai-mapped" },
                { name: "Presale_Rate", dataType: "number", description: "분양률 (%)", validation: "0-100", usedBy: ["PF_Project"], source: "ai-mapped" },
                { name: "Occupancy_Rate", dataType: "number", description: "임대율/가동률 (%)", validation: "0-100", usedBy: ["Real_Estate"], source: "ai-mapped" },
                { name: "Status", dataType: "string", description: "프로젝트 상태 (개발중/준공완료/운영중/부실)", usedBy: ["PF_Project", "Real_Estate"], source: "ai-mapped" },

                // 트랜치 지표
                { name: "Amount_B", dataType: "number", description: "투자 금액 (억원)", usedBy: ["Senior_Tranche", "Mezzanine_Tranche", "Junior_Tranche"], source: "ai-mapped" },
                { name: "Ratio", dataType: "number", description: "전체 대비 비율 (%)", usedBy: ["Senior_Tranche", "Mezzanine_Tranche", "Junior_Tranche"], source: "ai-mapped" },
                { name: "Interest_Rate", dataType: "number", description: "금리 (연 %)", usedBy: ["Senior_Tranche", "Mezzanine_Tranche", "Junior_Tranche"], source: "ai-mapped" },
                { name: "Spread_Bps", dataType: "number", description: "스프레드 (bp)", usedBy: ["Senior_Tranche", "Mezzanine_Tranche", "Junior_Tranche"], source: "ai-mapped" },

                // 신용 지표
                { name: "Credit_Rating", dataType: "string", description: "신용등급 (AAA~D)", usedBy: ["Constructor", "Developer", "Operator"], source: "ai-mapped" },
                { name: "Covenant_Status", dataType: "string", description: "약정 상태 (COMPLIANT/WARNING/BREACH/WAIVED)", usedBy: ["Financial_Covenant"], source: "ai-mapped" },
                { name: "Breach_Count", dataType: "number", description: "약정 위반 횟수", usedBy: ["Financial_Covenant"], source: "ai-mapped" },

                // 담보 지표
                { name: "Appraised_Value_B", dataType: "number", description: "감정가 (억원)", usedBy: ["Collateral_Asset"], source: "ai-mapped" },
                { name: "Liquidation_Value_B", dataType: "number", description: "청산가치 (억원)", usedBy: ["Collateral_Asset"], source: "ai-mapped" },
                { name: "Haircut", dataType: "number", description: "담보인정비율 차감률 (%)", validation: "0-100", usedBy: ["Collateral_Asset"], source: "ai-mapped" },

                // 펀드 지표
                { name: "AUM_B", dataType: "number", description: "운용자산 규모 Assets Under Management (억원)", usedBy: ["Investment_Fund", "Operator"], source: "ai-mapped" },
                { name: "Target_Return", dataType: "number", description: "목표 수익률 (%)", usedBy: ["Investment_Fund"], source: "ai-mapped" }
            ];

            props.forEach(prop => {
                const ref = doc(collection(db, "propertyTypes"));
                seedBatch.set(ref, prop);
            });

            await seedBatch.commit();

            console.log(`[이지자산평가] Seed Complete!`);
            console.log(`  Objects: ${objects.length} | Links: ${links.length} | Properties: ${props.length}`);
            console.log("  Categories: Company(3) + Project(5) + Tranche(3) + Fund(1) + Covenant(1) + Collateral(1) + CreditEvent(1)");

        } catch (error) {
            console.error("[이지자산평가] Critical seeding error:", error);
            throw error;
        }
    },

    // ────────────────────────────────────────────────────────────────
    // 위자드에서 생성한 커스텀 온톨로지 데이터 저장
    // ────────────────────────────────────────────────────────────────
    async seedCustomData(
        objects: Omit<ObjectType, "id">[],
        links: Omit<LinkType, "id">[],
        props: Omit<PropertyType, "id">[]
    ): Promise<void> {
        console.log("[이지자산평가] Seeding custom wizard data...");
        try {
            // 기존 데이터 삭제
            const collections = ["objectTypes", "propertyTypes", "linkTypes"];
            const deleteBatch = writeBatch(db);
            for (const colName of collections) {
                const q = await getDocs(collection(db, colName));
                q.docs.forEach(d => deleteBatch.delete(d.ref));
            }
            await deleteBatch.commit();

            // 새 데이터 저장
            const saveBatch = writeBatch(db);
            objects.forEach(obj => {
                const ref = doc(collection(db, "objectTypes"));
                saveBatch.set(ref, obj);
            });
            links.forEach(link => {
                const ref = doc(collection(db, "linkTypes"));
                saveBatch.set(ref, link);
            });
            props.forEach(prop => {
                const ref = doc(collection(db, "propertyTypes"));
                saveBatch.set(ref, prop);
            });
            await saveBatch.commit();

            console.log(`[이지자산평가] Custom seed complete: ${objects.length} objects, ${links.length} links, ${props.length} properties`);
        } catch (error) {
            console.error("[이지자산평가] Custom seed error:", error);
            throw error;
        }
    }
};
