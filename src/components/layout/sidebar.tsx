"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { navGroups } from "@/lib/layout/nav-config"
import { cn } from "@/lib/utils"

function Label({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "overflow-hidden truncate whitespace-nowrap transition-all duration-300 ease-in-out",
        collapsed ? "w-0 opacity-0" : "min-w-0 flex-1 opacity-100",
        className
      )}
    >
      {children}
    </span>
  )
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        {collapsed ? (
          <div className="type-display flex size-8 shrink-0 items-center justify-center rounded-sm bg-unillanos-red-dark text-sm text-white">
            ID
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="IDEAD - Unillanos"
            width={1600}
            height={434}
            priority
            className="h-9 w-auto object-contain"
          />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-5">
            <Label
              collapsed={collapsed}
              className="text-sidebar-foreground/60 block px-3 pb-1.5 text-xs font-medium"
            >
              {group.label}
            </Label>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.status === "active" && item.href === pathname

                if (item.status === "active" && item.href) {
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex items-center gap-3 rounded-sm border-l-2 px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "border-unillanos-red-dark bg-sidebar-accent text-sidebar-foreground font-semibold"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border-transparent"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <Label collapsed={collapsed}>{item.label}</Label>
                      </Link>
                    </li>
                  )
                }

                return (
                  <li key={item.id}>
                    <div
                      aria-disabled="true"
                      title={`${item.label} (Próximamente)`}
                      className="text-sidebar-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-sm border-l-2 border-transparent px-3 py-2 text-sm"
                    >
                      <Icon className="size-4 shrink-0" />
                      <Label collapsed={collapsed} className="flex-1">
                        {item.label}
                      </Label>
                      {!collapsed && (
                        <Badge variant="outline" className="shrink-0 text-[11px]">
                          Próximamente
                        </Badge>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
