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
    category?: "organization" | "process" | "equipment" | "material" | "product" | "supply_chain" | "quality" | "finance";
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
        let cypher = "// [K-Palantir] AI Generated Cypher for Neo4j Digital Twin Ontology\n";
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

    // ────────────────────────────────────────────────────────────────
    // 드림텍 핸드폰 모듈 비즈니스 완전판 온톨로지 시딩
    // Objects: 18 | Links: 20 | Properties: 22
    // ────────────────────────────────────────────────────────────────
    async seedInitialData() {
        console.log("[K-Palantir] Starting Full Dreamtech Ontology Seed...");
        console.log("Domain: Mobile Fingerprint Sensor Module (Galaxy S24/S25)");

        try {
            // 1. 기존 데이터 일괄 삭제
            const collections = ["objectTypes", "propertyTypes", "linkTypes", "simulationScenarios", "writebackActions"];
            const deleteBatch = writeBatch(db);
            for (const colName of collections) {
                const q = await getDocs(collection(db, colName));
                q.docs.forEach(d => deleteBatch.delete(d.ref));
            }
            await deleteBatch.commit();
            console.log("[K-Palantir] Existing data cleared.");

            // 2. 신규 데이터 배치 생성
            const seedBatch = writeBatch(db);

            // ═══════════════════════════════════════════════════════
            // ▶ OBJECTS (18개) - 드림텍 전 도메인 커버리지
            // ═══════════════════════════════════════════════════════
            const objects = [
                // ── 조직 계층 (Organization) ──────────────────────
                {
                    name: "Global_HQ",
                    description: "드림텍 본사 (충남 천안) - 경영 전략 및 글로벌 공급망 총괄",
                    category: "organization",
                    source: "ai-mapped",
                    properties: [
                        { id: "hq_loc", name: "Location", type: "string", required: true },
                        { id: "hq_emp", name: "Employee_Count", type: "number", required: false },
                        { id: "hq_rev", name: "Annual_Revenue_B_KRW", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "HQ", sap_entity: "Company_Code_1000" }
                },
                {
                    name: "Vina1_Factory",
                    description: "드림텍 베트남 빈딘 1공장 - SMT/PBA 제조 전문",
                    category: "organization",
                    source: "ai-mapped",
                    properties: [
                        { id: "v1_reg", name: "Region", type: "string", required: true },
                        { id: "v1_cap", name: "Monthly_Capacity_K", type: "number", required: true },
                        { id: "v1_wk", name: "Worker_Count", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Factory", sap_entity: "Plant_V100" }
                },
                {
                    name: "Vina2_Factory",
                    description: "드림텍 베트남 빈딘 2공장 - 모듈 조립 및 최종 검사",
                    category: "organization",
                    source: "ai-mapped",
                    properties: [
                        { id: "v2_reg", name: "Region", type: "string", required: true },
                        { id: "v2_cap", name: "Monthly_Capacity_K", type: "number", required: true },
                        { id: "v2_yield", name: "Yield_Rate", type: "number", required: true }
                    ],
                    metadata: { neo4j_label: "Factory", sap_entity: "Plant_V200" }
                },
                {
                    name: "RD_Center",
                    description: "드림텍 R&D 연구소 - 신제품 개발 및 공정 혁신",
                    category: "organization",
                    source: "ai-mapped",
                    properties: [
                        { id: "rd_proj", name: "Active_Projects", type: "number", required: false },
                        { id: "rd_pat", name: "Patent_Count", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "RDCenter" }
                },

                // ── 생산 공정 (Process) ───────────────────────────
                {
                    name: "SMT_Line",
                    description: "표면실장기술 라인 - 솔더 페이스트 → 마운팅 → 리플로우",
                    category: "process",
                    source: "ai-mapped",
                    properties: [
                        { id: "smt_util", name: "Utilization", type: "number", required: true },
                        { id: "smt_eff", name: "OEE", type: "number", required: true },
                        { id: "smt_ct", name: "Cycle_Time", type: "number", required: true },
                        { id: "smt_tput", name: "Throughput", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Line", mes_code: "SMT-01" }
                },
                {
                    name: "Assembly_Line",
                    description: "모듈 최종 조립 라인 - FPCB + 렌즈 + 하우징 결합",
                    category: "process",
                    source: "ai-mapped",
                    properties: [
                        { id: "asm_yield", name: "Yield_Rate", type: "number", required: true },
                        { id: "asm_util", name: "Utilization", type: "number", required: true },
                        { id: "asm_cpu", name: "Cost_Per_Unit", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Line", mes_code: "ASM-01" }
                },
                {
                    name: "Test_Line",
                    description: "전기적 특성 및 기능 검사 공정 - PASS/FAIL 판정",
                    category: "process",
                    source: "ai-mapped",
                    properties: [
                        { id: "tst_drate", name: "Defect_Rate", type: "number", required: true },
                        { id: "tst_tput", name: "Throughput", type: "number", required: true },
                        { id: "tst_grade", name: "Quality_Grade", type: "string", required: false }
                    ],
                    metadata: { neo4j_label: "Line", mes_code: "TST-01" }
                },

                // ── 설비 (Equipment) ──────────────────────────────
                {
                    name: "AOI_Machine",
                    description: "자동 광학 검사기 - SMT 후 납접 불량 자동 검출",
                    category: "equipment",
                    source: "ai-mapped",
                    properties: [
                        { id: "aoi_fcr", name: "False_Call_Rate", type: "number", required: true },
                        { id: "aoi_oee", name: "OEE", type: "number", required: true },
                        { id: "aoi_mtbf", name: "MTBF", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Equipment", asset_id: "AOI-VN1-001" }
                },
                {
                    name: "SMT_Equipment",
                    description: "SMT 설비군 - 스크린프린터/마운터/리플로우 오븐",
                    category: "equipment",
                    source: "ai-mapped",
                    properties: [
                        { id: "smt_eq_oee", name: "OEE", type: "number", required: true },
                        { id: "smt_eq_mtbf", name: "MTBF", type: "number", required: false },
                        { id: "smt_eq_st", name: "Status", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Equipment" }
                },
                {
                    name: "Assembly_Robot",
                    description: "모듈 조립 자동화 로봇 - 고정밀 부품 결합",
                    category: "equipment",
                    source: "ai-mapped",
                    properties: [
                        { id: "rob_util", name: "Utilization", type: "number", required: true },
                        { id: "rob_status", name: "Status", type: "string", required: true },
                        { id: "rob_mtbf", name: "MTBF", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Equipment", asset_id: "ROB-VN2-001" }
                },

                // ── 부품/자재 (Material) ──────────────────────────
                {
                    name: "IC_Chip",
                    description: "지문인식 핵심 IC 소자 (EgisTec/Goodix 공급)",
                    category: "material",
                    source: "ai-mapped",
                    properties: [
                        { id: "ic_stock", name: "Stock_Level", type: "number", required: true },
                        { id: "ic_price", name: "Unit_Price", type: "number", required: true },
                        { id: "ic_lt", name: "Lead_Time", type: "number", required: true },
                        { id: "ic_moq", name: "Quantity", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "Component", sap_material: "MAT-IC-001" }
                },
                {
                    name: "FPCB_Board",
                    description: "연성 회로 기판 - 센서 모듈 핵심 기판",
                    category: "material",
                    source: "ai-mapped",
                    properties: [
                        { id: "fpcb_stock", name: "Stock_Level", type: "number", required: true },
                        { id: "fpcb_price", name: "Unit_Price", type: "number", required: true },
                        { id: "fpcb_lt", name: "Lead_Time", type: "number", required: true }
                    ],
                    metadata: { neo4j_label: "Component", sap_material: "MAT-FPCB-001" }
                },
                {
                    name: "Sensor_Lens",
                    description: "광학 센서 렌즈 - 지문 인식률 핵심 부품",
                    category: "material",
                    source: "ai-mapped",
                    properties: [
                        { id: "lens_stock", name: "Stock_Level", type: "number", required: true },
                        { id: "lens_price", name: "Unit_Price", type: "number", required: true },
                        { id: "lens_rohs", name: "RoHS_Compliant", type: "boolean", required: true }
                    ],
                    metadata: { neo4j_label: "Component", sap_material: "MAT-LENS-001" }
                },

                // ── 제품 (Product) ────────────────────────────────
                {
                    name: "Sensor_Module_WIP",
                    description: "반제품 센서 모듈 - SMT 완료, 조립 전 재공품",
                    category: "product",
                    source: "ai-mapped",
                    properties: [
                        { id: "wip_cnt", name: "WIP_Count", type: "number", required: true },
                        { id: "wip_grade", name: "Quality_Grade", type: "string", required: false },
                        { id: "wip_cpu", name: "Cost_Per_Unit", type: "number", required: false }
                    ],
                    metadata: { neo4j_label: "WIP", sap_material: "SFG-MOD-001" }
                },
                {
                    name: "Galaxy_S24_Module",
                    description: "삼성전자 갤럭시 S24 향 완제품 지문인식 모듈 (량산)",
                    category: "product",
                    source: "ai-mapped",
                    properties: [
                        { id: "s24_grade", name: "Quality_Grade", type: "string", required: true },
                        { id: "s24_drate", name: "Defect_Rate", type: "number", required: true },
                        { id: "s24_price", name: "Unit_Price", type: "number", required: true },
                        { id: "s24_iso", name: "ISO_Certified", type: "boolean", required: true }
                    ],
                    metadata: { neo4j_label: "Product", customer_pn: "SEC-FP-S24-001" }
                },
                {
                    name: "Galaxy_S25_Module",
                    description: "삼성전자 갤럭시 S25 향 차세대 지문인식 모듈 (개발중)",
                    category: "product",
                    source: "ai-mapped",
                    properties: [
                        { id: "s25_grade", name: "Quality_Grade", type: "string", required: false },
                        { id: "s25_price", name: "Unit_Price", type: "number", required: false },
                        { id: "s25_st", name: "Status", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Product", customer_pn: "SEC-FP-S25-001" }
                },

                // ── 공급망 (Supply Chain) ─────────────────────────
                {
                    name: "IC_Supplier",
                    description: "IC 칩 공급업체 (EgisTec/Goodix/IDEX) - 전략 부품 조달",
                    category: "supply_chain",
                    source: "ai-mapped",
                    properties: [
                        { id: "sup_lt", name: "Lead_Time", type: "number", required: true },
                        { id: "sup_rating", name: "Quality_Grade", type: "string", required: true },
                        { id: "sup_region", name: "Region", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Supplier" }
                },
                {
                    name: "SEC_Factory",
                    description: "삼성전자 스마트폰 조립 공장 (구미/베트남) - 핵심 고객",
                    category: "supply_chain",
                    source: "ai-mapped",
                    properties: [
                        { id: "sec_sched", name: "Delivery_Rate", type: "number", required: true },
                        { id: "sec_qty", name: "Quantity", type: "number", required: true },
                        { id: "sec_region", name: "Region", type: "string", required: true }
                    ],
                    metadata: { neo4j_label: "Customer", customer_code: "SEC-001" }
                }
            ];

            objects.forEach(obj => {
                const ref = doc(collection(db, "objectTypes"));
                seedBatch.set(ref, obj);
            });

            // ═══════════════════════════════════════════════════════
            // ▶ LINKS (20개) - 드림텍 전 비즈니스 관계
            // ═══════════════════════════════════════════════════════
            const links = [
                // 조직 관계
                { name: "MANAGES", fromType: "Global_HQ", toType: "Vina1_Factory", bidirectional: false, neo4jType: "MANAGES", description: "본사의 공장 관리 권한" },
                { name: "MANAGES", fromType: "Global_HQ", toType: "Vina2_Factory", bidirectional: false, neo4jType: "MANAGES", description: "본사의 공장 관리 권한" },
                { name: "MANAGES", fromType: "Global_HQ", toType: "RD_Center", bidirectional: false, neo4jType: "MANAGES", description: "본사의 R&D 센터 관리" },

                // 공장-공정 관계
                { name: "OPERATES", fromType: "Vina1_Factory", toType: "SMT_Line", bidirectional: false, neo4jType: "OPERATES", description: "Vina1이 SMT 라인 운영" },
                { name: "OPERATES", fromType: "Vina2_Factory", toType: "Assembly_Line", bidirectional: false, neo4jType: "OPERATES", description: "Vina2가 조립 라인 운영" },
                { name: "OPERATES", fromType: "Vina2_Factory", toType: "Test_Line", bidirectional: false, neo4jType: "OPERATES", description: "Vina2가 테스트 라인 운영" },

                // 공정-설비 관계
                { name: "INSTALLS", fromType: "SMT_Line", toType: "SMT_Equipment", bidirectional: false, neo4jType: "INSTALLS", description: "SMT 라인에 설비 배치" },
                { name: "INSTALLS", fromType: "SMT_Line", toType: "AOI_Machine", bidirectional: false, neo4jType: "INSTALLS", description: "SMT 라인 내 AOI 배치" },
                { name: "INSTALLS", fromType: "Assembly_Line", toType: "Assembly_Robot", bidirectional: false, neo4jType: "INSTALLS", description: "조립 라인에 로봇 배치" },

                // 자재 소비 관계
                { name: "CONSUMES", fromType: "SMT_Line", toType: "IC_Chip", bidirectional: false, neo4jType: "CONSUMES", description: "SMT 공정에서 IC 칩 소비" },
                { name: "CONSUMES", fromType: "SMT_Line", toType: "FPCB_Board", bidirectional: false, neo4jType: "CONSUMES", description: "SMT 공정에서 FPCB 소비" },
                { name: "CONSUMES", fromType: "Assembly_Line", toType: "Sensor_Lens", bidirectional: false, neo4jType: "CONSUMES", description: "조립 공정에서 렌즈 소비" },

                // 생산 흐름 관계
                { name: "PRODUCES", fromType: "SMT_Line", toType: "Sensor_Module_WIP", bidirectional: false, neo4jType: "PRODUCES", description: "SMT 공정이 반제품 생산" },
                { name: "VERIFIES", fromType: "AOI_Machine", toType: "Sensor_Module_WIP", bidirectional: false, neo4jType: "VERIFIES", description: "AOI가 반제품 품질 검증" },
                { name: "FEEDS_INTO", fromType: "Sensor_Module_WIP", toType: "Assembly_Line", bidirectional: false, neo4jType: "FEEDS_INTO", description: "반제품이 조립 라인에 투입" },
                { name: "FINISHES", fromType: "Assembly_Line", toType: "Galaxy_S24_Module", bidirectional: false, neo4jType: "FINISHES", description: "조립 공정이 S24 모듈 완성" },
                { name: "FINISHES", fromType: "Assembly_Line", toType: "Galaxy_S25_Module", bidirectional: false, neo4jType: "FINISHES", description: "조립 공정이 S25 모듈 완성" },
                { name: "INSPECTS", fromType: "Test_Line", toType: "Galaxy_S24_Module", bidirectional: false, neo4jType: "INSPECTS", description: "테스트 라인에서 완제품 최종 검사" },

                // 공급망 관계
                { name: "SUPPLIES_TO", fromType: "IC_Supplier", toType: "IC_Chip", bidirectional: false, neo4jType: "SUPPLIES_TO", description: "공급사가 IC 칩 납품" },
                { name: "SHIPS_TO", fromType: "Galaxy_S24_Module", toType: "SEC_Factory", bidirectional: false, neo4jType: "SHIPS_TO", description: "완제품 모듈을 삼성전자에 납품" }
            ];

            links.forEach(link => {
                const ref = doc(collection(db, "linkTypes"));
                seedBatch.set(ref, link);
            });

            // ═══════════════════════════════════════════════════════
            // ▶ PROPERTIES (22개) - 전사 속성 풀
            // ═══════════════════════════════════════════════════════
            const props = [
                // 생산 효율 지표
                { name: "Utilization", dataType: "number", description: "설비/라인 가동율 (%)", validation: "0-100", usedBy: ["SMT_Line", "Assembly_Line", "Assembly_Robot"], source: "ai-mapped" },
                { name: "OEE", dataType: "number", description: "설비종합효율 - Overall Equipment Effectiveness (%)", validation: "0-100", usedBy: ["SMT_Line", "AOI_Machine", "SMT_Equipment"], source: "ai-mapped" },
                { name: "Yield_Rate", dataType: "number", description: "공정 수율 - 불량 제외 양품 비율 (%)", validation: "0-100", usedBy: ["Assembly_Line", "Vina2_Factory"], source: "ai-mapped" },
                { name: "Defect_Rate", dataType: "number", description: "불량율 - 전체 대비 불량품 비율 (%)", validation: "0-100", usedBy: ["Test_Line", "Galaxy_S24_Module"], source: "ai-mapped" },
                { name: "Throughput", dataType: "number", description: "처리량 - 단위시간당 생산량 (pcs/hr)", usedBy: ["SMT_Line", "Test_Line"], source: "ai-mapped" },
                { name: "Cycle_Time", dataType: "number", description: "사이클타임 - 제품 1개 처리 소요시간 (sec)", usedBy: ["SMT_Line"], source: "ai-mapped" },
                { name: "MTBF", dataType: "number", description: "평균 고장 간격 - Mean Time Between Failures (hr)", usedBy: ["AOI_Machine", "SMT_Equipment", "Assembly_Robot"], source: "ai-mapped" },
                { name: "False_Call_Rate", dataType: "number", description: "AOI 과검출율 - 양품을 불량으로 오판하는 비율 (%)", usedBy: ["AOI_Machine"], source: "ai-mapped" },

                // 재고/물류 지표
                { name: "Stock_Level", dataType: "number", description: "재고 수위 - 현재 보유 재고량 (pcs)", usedBy: ["IC_Chip", "FPCB_Board", "Sensor_Lens"], source: "ai-mapped" },
                { name: "Lead_Time", dataType: "number", description: "리드타임 - 발주에서 입고까지 소요 기간 (일)", usedBy: ["IC_Chip", "FPCB_Board", "IC_Supplier"], source: "ai-mapped" },
                { name: "WIP_Count", dataType: "number", description: "재공품 수량 - 공정 중인 반제품 수 (pcs)", usedBy: ["Sensor_Module_WIP"], source: "ai-mapped" },
                { name: "Quantity", dataType: "number", description: "수량 - 범용 수량 필드 (pcs)", usedBy: ["IC_Chip", "SEC_Factory"], source: "ai-mapped" },
                { name: "Delivery_Rate", dataType: "number", description: "납기 준수율 - 약속 납기 이내 납품 비율 (%)", validation: "0-100", usedBy: ["SEC_Factory"], source: "ai-mapped" },

                // 원가/재무 지표
                { name: "Unit_Price", dataType: "number", description: "개당 단가 (KRW)", usedBy: ["IC_Chip", "FPCB_Board", "Galaxy_S24_Module"], source: "ai-mapped" },
                { name: "Cost_Per_Unit", dataType: "number", description: "개당 원가 - 제조원가 (KRW)", usedBy: ["Assembly_Line", "Sensor_Module_WIP"], source: "ai-mapped" },
                { name: "Monthly_Capacity_K", dataType: "number", description: "월 생산능력 (천 개 단위)", usedBy: ["Vina1_Factory", "Vina2_Factory"], source: "ai-mapped" },
                { name: "Annual_Revenue_B_KRW", dataType: "number", description: "연간 매출 (억 원)", usedBy: ["Global_HQ"], source: "ai-mapped" },

                // 품질/인증 지표
                { name: "Quality_Grade", dataType: "string", description: "품질 등급 (S/A/B/C/NG)", usedBy: ["Galaxy_S24_Module", "Test_Line", "IC_Supplier"], source: "ai-mapped" },
                { name: "RoHS_Compliant", dataType: "boolean", description: "유해물질 제한 지침(RoHS) 준수 여부", usedBy: ["Sensor_Lens", "FPCB_Board"], source: "ai-mapped" },
                { name: "ISO_Certified", dataType: "boolean", description: "ISO 품질 인증 보유 여부 (ISO 9001/IATF16949)", usedBy: ["Galaxy_S24_Module"], source: "ai-mapped" },

                // 일반 지표
                { name: "Status", dataType: "string", description: "현재 운영 상태 (Running/Idle/Maintenance/Error)", usedBy: ["SMT_Equipment", "Assembly_Robot", "Galaxy_S25_Module"], source: "ai-mapped" },
                { name: "Region", dataType: "string", description: "지역 코드 (KR/VN/CN 등)", usedBy: ["Vina1_Factory", "Vina2_Factory", "IC_Supplier", "SEC_Factory"], source: "ai-mapped" }
            ];

            props.forEach(prop => {
                const ref = doc(collection(db, "propertyTypes"));
                seedBatch.set(ref, prop);
            });

            await seedBatch.commit();

            console.log(`[K-Palantir] Seed Complete!`);
            console.log(`  Objects: ${objects.length} | Links: ${links.length} | Properties: ${props.length}`);
            console.log("  Categories: Organization(4) + Process(3) + Equipment(3) + Material(3) + Product(3) + SupplyChain(2)");

        } catch (error) {
            console.error("[K-Palantir] Critical seeding error:", error);
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
        console.log("[K-Palantir] Seeding custom wizard data...");
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

            console.log(`[K-Palantir] Custom seed complete: ${objects.length} objects, ${links.length} links, ${props.length} properties`);
        } catch (error) {
            console.error("[K-Palantir] Custom seed error:", error);
            throw error;
        }
    }
};
