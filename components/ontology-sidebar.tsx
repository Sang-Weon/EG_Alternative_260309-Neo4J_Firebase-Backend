"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LayoutDashboard, Network, TrendingUp, AlertTriangle, Calculator, Building2, FileText, Briefcase, Shield, ClipboardList, PieChart } from "lucide-react"

interface OntologySidebarProps {
  selectedMenu: string
  onMenuSelect: (menu: string) => void
}

const menuItems = [
  { id: "포트폴리오 대시보드", icon: LayoutDashboard, label: "자산 포트폴리오 대시보드", group: "공통" },
  { id: "온톨로지 뷰", icon: Network, label: "대체투자 온톨로지 뷰", group: "공통" },
  { id: "가치평가 시뮬레이션", icon: Calculator, label: "가치평가 시뮬레이션", group: "평가" },
  { id: "리스크/약정 모니터링", icon: AlertTriangle, label: "리스크 & 약정 모니터링", group: "평가" },
  { id: "연쇄부도 시뮬레이션", icon: TrendingUp, label: "연쇄부도 시뮬레이션", group: "평가" },
  { id: "약정서 워크플로우", icon: ClipboardList, label: "약정서 워크플로우", group: "평가", isNew: true },
  { id: "포트폴리오 임팩트", icon: PieChart, label: "포트폴리오 임팩트", group: "평가", isNew: true },
  { id: "투자 보고서", icon: FileText, label: "투자 분석 보고서", group: "리포트" },
  { id: "서비스오퍼링", icon: Briefcase, label: "서비스오퍼링 (대고객)", group: "리포트" },
  { id: "규제준수", icon: Shield, label: "규제준수 모니터링", group: "리포트" },
]

export function OntologySidebar({ selectedMenu, onMenuSelect }: OntologySidebarProps) {
  return (
    <div className="w-full lg:w-64 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-sm lg:text-base">이지자산평가</h2>
        </div>
        <p className="text-xs lg:text-sm text-zinc-400 bg-zinc-800/50 rounded px-2 py-1">대체투자 자산 가치평가</p>
      </div>

      {/* 메뉴 항목 */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isSelected = selectedMenu === item.id

            return (
              <Button
                key={item.id}
                variant={isSelected ? "secondary" : "ghost"}
                className={`w-full justify-start text-left ${
                  isSelected ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => onMenuSelect(item.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="text-sm flex-1 text-left">{item.label}</span>
                {"isNew" in item && item.isNew && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 ml-1">NEW</span>
                )}
              </Button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
