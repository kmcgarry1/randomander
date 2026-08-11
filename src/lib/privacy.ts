export type AnalyticsDecisionInput = Readonly<{
  production: boolean
  enabledFlag: string | boolean | undefined
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}>

export const shouldEnableAnalytics = ({
  production,
  enabledFlag,
  doNotTrack,
  globalPrivacyControl,
}: AnalyticsDecisionInput) => {
  const normalizedDnt = doNotTrack?.trim().toLowerCase()
  const privacySignal =
    normalizedDnt === '1' ||
    normalizedDnt === 'yes' ||
    globalPrivacyControl === true

  return production && enabledFlag === 'true' && !privacySignal
}

