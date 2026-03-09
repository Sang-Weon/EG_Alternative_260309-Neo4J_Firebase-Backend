"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Activity, Building2, Landmark, Plane, Leaf } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function GlobalMap() {
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const { toast } = useToast()

  const nodes = [
    {
      id: "songdo-pf",
      name: "송도 복합개발 PF",
      location: "인천 송도",
      type: "부동산 PF",
      icon: Building2,
      status: "normal",
      statusText: "정상 진행",
      metrics: { ltv: "65%", dscr: "1.45", irr: "12.5%" },
      position: { top: "28%", left: "72%" },
      totalAmount: 2500,
      fairValue: 2680,
    },
    {
      id: "yeouido-office",
      name: "여의도 오피스 빌딩",
      location: "서울 여의도",
      type: "상업용 부동산",
      icon: Building2,
      status: "warning",
      statusText: "분양률 주의",
      metrics: { ltv: "72%", dscr: "1.18", irr: "9.2%" },
      position: { top: "32%", left: "68%" },
      totalAmount: 1800,
      fairValue: 1720,
    },
    {
      id: "vietnam-solar",
      name: "베트남 태양광 발전소",
      location: "베트남 빈즈엉",
      type: "신재생 에너지",
      icon: Leaf,
      status: "normal",
      statusText: "정상 운영",
      metrics: { ltv: "58%", dscr: "1.62", irr: "14.8%" },
      position: { top: "52%", left: "58%" },
      totalAmount: 850,
      fairValue: 920,
    },
    {
      id: "india-infra",
      name: "인도 고속도로 인프라",
      location: "인도 뭄바이",
      type: "인프라",
      icon: Landmark,
      status: "normal",
      statusText: "정상 운영",
      metrics: { ltv: "52%", dscr: "1.85", irr: "11.2%" },
      position: { top: "45%", left: "38%" },
      totalAmount: 1200,
      fairValue: 1350,
    },
    {
      id: "aircraft-lease",
      name: "항공기 리스 펀드",
      location: "아일랜드 더블린",
      type: "항공기",
      icon: Plane,
      status: "critical",
      statusText: "약정 위반 위험",
      metrics: { ltv: "78%", dscr: "0.95", irr: "6.8%" },
      position: { top: "25%", left: "25%" },
      totalAmount: 650,
      fairValue: 580,
    },
  ]

  const handleAssetClick = (node: any) => {
    setSelectedAsset(node)
    toast({
      title: node.name,
      description: `${node.type} | LTV: ${node.metrics.ltv} | IRR: ${node.metrics.irr}`,
    })
  }

  return (
    <div className="space-y-4">
      {/* 맵 컨테이너 */}
      <Card className="bg-zinc-900 border-zinc-800 p-6 relative h-[400px] lg:h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/southeast-asia-centered-world-map-dark.jpg"
            alt="World Map"
            className="w-full h-full object-cover opacity-30"
            style={{ objectPosition: "center center" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        </div>

        {/* 글로벌 타이틀 */}
        <div className="relative z-10 mb-4">
          <h2 className="text-lg lg:text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            글로벌 대체투자 자산 맵
          </h2>
          <p className="text-xs text-zinc-500 mt-1">자산을 클릭하면 상세 평가 정보를 확인할 수 있습니다</p>
        </div>

        {/* 노드들 */}
        <div className="relative w-full h-full">
          {nodes.map((node) => {
            const IconComponent = node.icon
            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  top: node.position.top,
                  left: node.position.left,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`relative group cursor-pointer ${node.status === "critical" ? "animate-pulse" : ""}`}
                  onClick={() => handleAssetClick(node)}
                >
                  {/* 외곽 링 */}
                  <div
                    className={`absolute inset-0 rounded-full ${
                      node.status === "critical"
                        ? "bg-red-500/20 ring-2 ring-red-500"
                        : node.status === "warning"
                        ? "bg-amber-500/20 ring-2 ring-amber-500"
                        : "bg-green-500/20 ring-2 ring-green-500"
                    } w-12 h-12 lg:w-16 lg:h-16 group-hover:scale-110 transition-transform`}
                  />

                  {/* 중심 아이콘 */}
                  <div
                    className={`relative flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full ${
                      node.status === "critical" 
                        ? "bg-red-500" 
                        : node.status === "warning"
                        ? "bg-amber-500"
                        : "bg-green-500"
                    }`}
                  >
                    <IconComponent className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                  </div>

                  {/* 툴팁 카드 */}
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 lg:w-56 z-20">
                    <Card className="bg-zinc-800 border-zinc-700 p-3 shadow-xl">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm">{node.name}</h3>
                          <p className="text-xs text-zinc-400">{node.location} | {node.type}</p>
                        </div>
                        <Badge 
                          variant={node.status === "critical" ? "destructive" : node.status === "warning" ? "secondary" : "default"} 
                          className="text-xs"
                        >
                          {node.statusText}
                        </Badge>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">LTV:</span>
                            <span className="font-mono">{node.metrics.ltv}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">DSCR:</span>
                            <span className="font-mono">{node.metrics.dscr}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">IRR:</span>
                            <span className="font-mono">{node.metrics.irr}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-700 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">투자금액:</span>
                            <span className="font-mono">{node.totalAmount}억</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">공정가치:</span>
                            <span className={`font-mono ${node.fairValue >= node.totalAmount ? 'text-green-400' : 'text-red-400'}`}>
                              {node.fairValue}억
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* 노드 라벨 */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <p className="text-xs lg:text-sm font-medium">{node.name}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 상태 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {nodes.map((node) => {
          const IconComponent = node.icon
          return (
            <Card
              key={node.id}
              className="bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => handleAssetClick(node)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-zinc-400" />
                  <div>
                    <h3 className="font-semibold text-xs">{node.name}</h3>
                    <p className="text-[10px] text-zinc-400">{node.type}</p>
                  </div>
                </div>
                {node.status === "critical" ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : node.status === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">LTV</span>
                  <span className="font-mono">{node.metrics.ltv}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">DSCR</span>
                  <span className="font-mono">{node.metrics.dscr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">IRR</span>
                  <span className="font-mono">{node.metrics.irr}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
