import { AlertTriangle, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '../ui/alert'
import { Insight, InsightSeverity } from '../../lib/insights'

interface Props {
  insights: Insight[]
}

const severityToVariant: Record<InsightSeverity, 'default' | 'warning' | 'destructive' | 'success' | 'info'> = {
  danger:  'destructive',
  warning: 'warning',
  success: 'success',
  info:    'info',
}

const severityIcon: Record<InsightSeverity, typeof AlertTriangle> = {
  danger:  AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info:    Lightbulb,
}

export function InsightsPanel({ insights }: Props) {
  if (insights.length === 0) return null

  return (
    <div className="space-y-2">
      {insights.slice(0, 4).map((insight) => {
        const variant = severityToVariant[insight.severity]
        const Icon = severityIcon[insight.severity]
        return (
          <Alert key={insight.id} variant={variant}>
            <Icon size={15} />
            <AlertTitle className="flex items-center gap-2">
              <span>{insight.icon}</span>
              {insight.title}
              {insight.metric && (
                <span className="ml-auto font-bold text-sm">{insight.metric}</span>
              )}
            </AlertTitle>
            <AlertDescription>{insight.body}</AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}

// Keep old name for backwards compat
export function InsightStrip(props: Props) {
  return <InsightsPanel {...props} />
}
