"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { breadcrumbMap, defaultBreadcrumb } from "@/lib/layout/nav-config"

export function Header({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const pathname = usePathname()
  const crumbs = breadcrumbMap[pathname] ?? defaultBreadcrumb

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="text-muted-foreground size-3.5" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <ThemeToggle />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-foreground text-sm font-medium">Administrador Campus</p>
            <p className="text-muted-foreground text-xs">Soporte Técnico</p>
          </div>
          <Avatar className="size-9">
            <AvatarFallback className="bg-unillanos-red-dark type-display text-sm text-white">
              AC
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
