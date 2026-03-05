"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Briefcase,
  Landmark,
  Plane,
  Leaf,
  CircleDollarSign
} from "lucide-react"

interface AssetSummary {
  id: string
  name: string
  type: string
  typeIcon: typeof Building2
  value: number
  change: number
  ltv: number
  dscr: number
  status: "정상" | "주의" | "위험"
  completionRate?: number
}

const portfolioSummary = {
  totalAUM: 52800,
  totalProjects: 24,
  avgLTV: 68.5,
  avgDSCR: 1.32,
  criticalAlerts: 2,
  warningAlerts: 5
}

const assetTypeBreakdown = [
  { type: "PF 개발", value: 18500, ratio: 35.0, color: "bg-blue-500" },
  { type: "수익형 부동산", value: 15200, ratio: 28.8, color: "bg-emerald-500" },
  { type: "인프라", value: 9800, ratio: 18.6, color: "bg-purple-500" },
  { type: "항공기/선박", value: 5500, ratio: 10.4, color: "bg-amber-500" },
  { type: "신재생에너지", value: 3800, ratio: 7.2, color: "bg-teal-500" },
]

const sampleAssets: AssetSummary[] = [
  {
    id: "pf-1",
    name: "강남 오피스 PF",
    type: "PF 개발",
    typeIcon: Building2,
    value: 2800,
    change: -2.3,
    ltv: 72,
    dscr: 1.15,
    status: "주의",
    completionRate: 42
  },
  {
    id: "re-1",
    name: "판교 물류센터",
    type: "수익형 부동산",
    typeIcon: Briefcase,
    value: 1850,
    change: 1.8,
    ltv: 58,
    dscr: 1.52,
    status: "정상"
  },
  {
    id: "inf-1",
    name: "서해안 고속도로",
    type: "인프라",
    typeIcon: Landmark,
    value: 3200,
    change: 0.5,
    ltv: 65,
    dscr: 1.38,
    status: "정상"
  },
  {
    id: "air-1",
    name: "B737 리스",
    type: "항공기",
    typeIcon: Plane,
    value: 850,
    change: -5.2,
    ltv: 78,
    dscr: 1.05,
    status: "위험"
  },
  {
    id: "ren-1",
    name: "영암 태양광",
    type: "신재생에너지",
    typeIcon: Leaf,
    value: 420,
    change: 2.1,
    ltv: 55,
    dscr: 1.65,
    status: "정상"
  }
]

const recentAlerts = [
  { id: 1, severity: "위험", title: "B737 리스 DSCR 약정 위반", target: "B737 리스", time: "30분 전" },
  { id: 2, severity: "위험", title: "태영건설 신용등급 BB- 하향", target: "시공사 신용", time: "2시간 전" },
  { id: 3, severity: "주의", title: "강남 오피스 PF LTV 70% 초과", target: "강남 오피스 PF", time: "4시간 전" },
  { id: 4, severity: "주의", title: "분양률 60% 미달 - 인천 주상복합", target: "인천 주상복합", time: "1일 전" },
]

export function AssetPortfolioDashboard() {
  return (
    <div className="space-y-6">
      {/* 포트폴리오 요약 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">총 운용자산 (AUM)</div>
          <div className="text-2xl font-bold text-emerald-400">{(portfolioSummary.totalAUM / 10000).toFixed(1)}조</div>
          <div className="text-xs text-zinc-500 mt-1">{portfolioSummary.totalAUM.toLocaleString()}억원</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">총 프로젝트</div>
          <div className="text-2xl font-bold">{portfolioSummary.totalProjects}</div>
          <div className="text-xs text-zinc-500 mt-1">개 자산</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">평균 LTV</div>
          <div className={`text-2xl font-bold ${portfolioSummary.avgLTV > 70 ? "text-amber-400" : "text-emerald-400"}`}>
            {portfolioSummary.avgLTV}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">기준 70%</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">평균 DSCR</div>
          <div className={`text-2xl font-bold ${portfolioSummary.avgDSCR < 1.2 ? "text-amber-400" : "text-emerald-400"}`}>
            {portfolioSummary.avgDSCR}x
          </div>
          <div className="text-xs text-zinc-500 mt-1">기준 1.2x</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">위험 경보</div>
          <div className="text-2xl font-bold text-red-400">{portfolioSummary.criticalAlerts}</div>
          <div className="text-xs text-zinc-500 mt-1">건 발생</div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-1">주의 경보</div>
          <div className="text-2xl font-bold text-amber-400">{portfolioSummary.warningAlerts}</div>
          <div className="text-xs text-zinc-500 mt-1">건 발생</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 자산 유형별 분포 */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-emerald-400" />
            자산 유형별 분포
          </h3>
          <div className="space-y-4">
            {assetTypeBreakdown.map((item) => (
              <div key={item.type} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.type}</span>
                  <span className="text-zinc-400">
                    {item.value.toLocaleString()}억 ({item.ratio}%)
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.ratio}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 주요 자산 현황 */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            주요 자산 현황
          </h3>
          <div className="space-y-3">
            {sampleAssets.map((asset) => {
              const Icon = asset.typeIcon
              return (
                <div 
                  key={asset.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      asset.status === "위험" ? "bg-red-500/20" :
                      asset.status === "주의" ? "bg-amber-500/20" : "bg-emerald-500/20"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        asset.status === "위험" ? "text-red-400" :
                        asset.status === "주의" ? "text-amber-400" : "text-emerald-400"
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{asset.name}</div>
                      <div className="text-xs text-zinc-400">{asset.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium">{asset.value.toLocaleString()}억</div>
                      <div className={`text-xs flex items-center gap-1 ${asset.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {asset.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(asset.change)}%
                      </div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-xs text-zinc-400">LTV</div>
                      <div className={`text-sm font-mono ${asset.ltv > 70 ? "text-amber-400" : "text-zinc-300"}`}>
                        {asset.ltv}%
                      </div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-xs text-zinc-400">DSCR</div>
                      <div className={`text-sm font-mono ${asset.dscr < 1.2 ? "text-amber-400" : "text-zinc-300"}`}>
                        {asset.dscr}x
                      </div>
                    </div>
                    {asset.completionRate !== undefined && (
                      <div className="w-20">
                        <div className="text-xs text-zinc-400 mb-1">공정률</div>
                        <Progress value={asset.completionRate} className="h-1.5" />
                        <div className="text-xs text-zinc-500 mt-0.5">{asset.completionRate}%</div>
                      </div>
                    )}
                    <Badge 
                      variant={asset.status === "정상" ? "default" : asset.status === "주의" ? "secondary" : "destructive"}
                      className={`w-14 justify-center ${
                        asset.status === "정상" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        asset.status === "주의" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {asset.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* 최근 경보 */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          최근 경보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.severity === "위험" 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              {alert.severity === "위험" ? (
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{alert.title}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {alert.target} - {alert.time}
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={alert.severity === "위험" ? "text-red-400 border-red-400/50" : "text-amber-400 border-amber-400/50"}
              >
                {alert.severity}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
