"use client"

import { useState } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-x-hidden px-6 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
