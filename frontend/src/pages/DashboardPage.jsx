import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/composite/EmptyState";

/**
 * DashboardPage — intentionally blank during the design-system migration.
 * Content is re-added once the dependent modules are migrated.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="first-time"
            title="Dashboard sedang dibangun ulang"
            description="Ringkasan pekerjaan akan tampil di sini setelah setiap modul dipindahkan ke tampilan baru."
            testid="dashboard-empty-state"
          />
        </CardContent>
      </Card>
    </div>
  );
}
