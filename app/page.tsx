"use client"

import { useState } from "react"
import { OntologySidebar } from "@/components/ontology-sidebar"
import { AssetPortfolioDashboard } from "@/components/asset-portfolio-dashboard"
import { ValuationSimulator } from "@/components/valuation-simulator"
import { RiskCovenantMonitor } from "@/components/risk-covenant-monitor"
import { CascadeDefaultSimulator } from "@/components/cascade-default-simulator"
import { OntologyGraphViewer } from "@/components/ontology-graph-viewer"
import { OntologyConfigManager } from "@/components/ontology-config-manager"
import { FeedbackLoopViewer } from "@/components/feedback-loop-viewer"
import { InvestmentReportDashboard } from "@/components/investment-report-dashboard"
import { ServiceOfferingDashboard } from "@/components/service-offering-dashboard"
import { RegulatoryComplianceDashboard } from "@/components/regulatory-compliance-dashboard"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Page() {
  const [selectedMenu, setSelectedMenu] = useState("포트폴리오 대시보드")
  const { toast } = useToast()

  return (
    <div className="h-screen w-full bg-slate-950 text-white overflow-hidden flex flex-col lg:flex-row">
      {/* 좌측 사이드바 */}
      <OntologySidebar selectedMenu={selectedMenu} onMenuSelect={setSelectedMenu} />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* 중앙 캔버스 */}
        <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-auto">
          <header className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-balance">
              이지자산평가 Graph Platform
            </h1>
            <p className="text-sm lg:text-base text-zinc-400">
              대체투자 자산 가치평가 및 리스크 분석 시스템
            </p>
          </header>

          {selectedMenu === "온톨로지 뷰" && (
            <Tabs defaultValue="graph" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
                <TabsTrigger value="graph">온톨로지 그래프</TabsTrigger>
                <TabsTrigger value="config">구성 관리</TabsTrigger>
                <TabsTrigger value="feedback">피드백 루프</TabsTrigger>
              </TabsList>
              <TabsContent value="graph" className="mt-6">
                <OntologyGraphViewer />
              </TabsContent>
              <TabsContent value="config" className="mt-6">
                <OntologyConfigManager />
              </TabsContent>
              <TabsContent value="feedback" className="mt-6">
                <FeedbackLoopViewer />
              </TabsContent>
            </Tabs>
          )}

          {selectedMenu === "포트폴리오 대시보드" && <AssetPortfolioDashboard />}

          {selectedMenu === "가치평가 시뮬레이션" && <ValuationSimulator />}

          {selectedMenu === "리스크/약정 모니터링" && <RiskCovenantMonitor />}

          {selectedMenu === "연쇄부도 시뮬레이션" && <CascadeDefaultSimulator />}

          {selectedMenu === "투자 보고서" && <InvestmentReportDashboard />}

          {selectedMenu === "서비스오퍼링" && <ServiceOfferingDashboard />}

          {selectedMenu === "규제준수" && <RegulatoryComplianceDashboard />}
        </div>
      </div>

      <Toaster />
    </div>
  )
}
