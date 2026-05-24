import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { lazy, Suspense, type CSSProperties } from "react"

import { DashboardMetricsSection } from "@/components/dashboard-metrics-section"
import { OrganizationsChart } from "@/components/organizations-chart"
import { BlockchainDistributionChart } from "@/components/blockchain-distribution-chart"
import { AssetsOverviewChart } from "@/components/assets-overview-chart"
import { SubmissionsStatusTable } from "@/components/submissions-status-table"
import { PendingApprovalsPanel } from "@/components/pending-approvals-panel"

export default function Dashboard() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {/* KPI Metrics Section */}
              <Suspense fallback={<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>}>
                <DashboardMetricsSection />
              </Suspense>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                  <OrganizationsChart />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                  <BlockchainDistributionChart />
                </Suspense>
              </div>

              {/* Assets Overview Section */}
              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <AssetsOverviewChart />
              </Suspense>

              {/* Submissions and Approvals Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                    <SubmissionsStatusTable />
                  </Suspense>
                </div>
                <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                  <PendingApprovalsPanel />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
