import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AddSubscriptionDialog from "@/features/subscriptions/add-subscription-dialog";
import SubscriptionsList from "@/features/subscriptions/subscriptions-list";
import { getActiveSubscriptions, getMonthlySubscriptionsTotal } from "@/services/subscription.service";
import { formatTRY } from "@/lib/money";
import { getCachedUser } from "@/lib/supabase/server";

export default async function SubscriptionsPage() {
  const user = await getCachedUser();

  if (!user) {
    return null;
  }

  const requestId = "subscriptions-page";
  const [subscriptions, totalMonthly] = await Promise.all([
    getActiveSubscriptions(requestId),
    getMonthlySubscriptionsTotal(requestId),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Aboneliklerim</h1>
        <p className="text-muted-foreground">
          Düzenli aboneliklerini takip et ve yaklaşan ödemeleri gör.
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Sabit Giderin</CardTitle>
          <CardDescription>Tüm aktif aboneliklerinin aylık toplam maliyeti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{formatTRY(totalMonthly)}</div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Aboneliklerim</CardTitle>
            <CardDescription>Tüm aktif ve pasif aboneliklerin</CardDescription>
          </div>
          <AddSubscriptionDialog />
        </CardHeader>
        <CardContent>
          <SubscriptionsList subscriptions={subscriptions} totalMonthly={totalMonthly} />
        </CardContent>
      </Card>
    </div>
  );
}

