import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Payables() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payables</h1>
        <p className="text-muted-foreground">Manage payments to interpreters</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Payables management will be available in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
