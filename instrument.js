// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from '@sentry/node'

Sentry.init({
	dsn: 'https://1cbd40762f637f2af8cb7af683c460b6@o4507068179349504.ingest.us.sentry.io/4509557816688640',

	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	sendDefaultPii: true,
})
