import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoursSplit } from '@/lib/utils/job-calculations';

// ==========================================
// Types
// ==========================================

interface EstimatedBillable {
  businessTotal: number;
  afterHoursTotal: number;
  hoursSubtotal: number;
  businessRate: number;
  afterHoursRate: number;
  emergencyFee: number;
  holidayFee: number;
  feesTotal: number;
  total: number;
}

interface JobEstimatedBillableProps {
  hoursSplit: HoursSplit;
  billableTotal: EstimatedBillable;
}

// ==========================================
// Component
// ==========================================

export function JobEstimatedBillable({
  hoursSplit,
  billableTotal,
}: JobEstimatedBillableProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Estimated Billable</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Hours Breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Hours Breakdown</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span>Business Hours</span>
                <span className="tabular-nums">
                  {hoursSplit.businessHours.toFixed(2)} hrs × ${billableTotal.businessRate.toFixed(2)}
                  <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.businessTotal.toFixed(2)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>After Hours</span>
                <span className="tabular-nums">
                  {hoursSplit.afterHours.toFixed(2)} hrs × ${billableTotal.afterHoursRate.toFixed(2)}
                  <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.afterHoursTotal.toFixed(2)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">
                  Total Billable Hours
                  {hoursSplit.minimumApplied > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (incl. {hoursSplit.minimumApplied.toFixed(2)}hr minimum)
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {hoursSplit.billableHours.toFixed(2)} hrs
                  <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.hoursSubtotal.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Additional Fees */}
          {billableTotal.feesTotal > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Additional Fees</div>
              <div className="space-y-1 text-sm">
                {billableTotal.emergencyFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Emergency Fee</span>
                    <span className="tabular-nums">
                      <span className="w-24 inline-block text-right font-medium ml-4">+${billableTotal.emergencyFee.toFixed(2)}</span>
                    </span>
                  </div>
                )}
                {billableTotal.holidayFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Holiday Fee</span>
                    <span className="tabular-nums">
                      <span className="w-24 inline-block text-right font-medium ml-4">+${billableTotal.holidayFee.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t text-base font-semibold">
            <span>ESTIMATED TOTAL</span>
            <span className="tabular-nums text-lg">${billableTotal.total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobEstimatedBillable;
