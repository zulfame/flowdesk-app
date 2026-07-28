import React from "react";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { LifeBuoy } from "lucide-react";

export default function HelpTickets() {
  return (
    <div data-testid="help-tickets-page">
      <PageHeader
        title="Tiket Bantuan"
        subtitle="Ajukan dan pantau permintaan bantuan Anda di satu tempat."
      />
      <Card className="p-2">
        <EmptyState
          icon={LifeBuoy}
          title="Belum ada tiket bantuan"
          description="Halaman ini masih dalam pengembangan. Fitur untuk membuat dan mengelola tiket bantuan akan segera tersedia."
        />
      </Card>
    </div>
  );
}
