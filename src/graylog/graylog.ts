import * as Rx from '../shims/rxjs.ts'
import type { GraylogMessage } from './graylog_worker.ts'
import { EventEmitter } from 'https://deno.land/x/event/mod.ts'

export type GraylogEvents = {
	message: [GraylogMessage]
	request: [
		{
			ConnectionId: string
			ContentLength: number
			ContentType: string
			ElapsedMilliseconds: number
			Host: string
			HostingRequestFinishedLog: string
			Method: string
			Path: string
			Protocol: string
			QueryString: string
			RequestId: string
			RequestPath: string
			Scheme: string
			StatusCode: number
		} & GraylogMessage,
	]
}
export const ee = new EventEmitter<GraylogEvents>()

let worker: Worker
export function start() {
	worker?.terminate()

	worker = new Worker(new URL('./graylog_worker.ts', import.meta.url).href, {
		deno: { namespace: true, permissions: 'inherit' },
		name: 'graylog_worker',
		type: 'module',
	})

	worker.onerror = function onerror(error) {
		console.error('graylog error ->', error.message)
	}
	worker.onmessageerror = function onmessageerror(event) {
		console.error('graylog messageerror ->', event.data)
	}

	worker.onmessage = function onmessage({ data: message }: MessageEvent<GraylogMessage>) {
		// console.log('graylog message ->', message)
		ee.emit('message', message)
		let { context, event, level, line } = message
		if (
			level == 'Information' &&
			context == 'Microsoft.AspNetCore.Hosting.Diagnostics' &&
			event == 'RequestFinished'
		) {
			ee.emit('request', message as never)
		}
	}
}

// const request = {}
// ee.on('request', (event) => Object.assign(request, event))
// setInterval(() => console.log('request ->', request), 3000)

// const rxMessage = Rx.fromEvent<MessageEvent<GraylogMessage>>(worker, 'message').pipe(
// 	Rx.op.map((event) => event.data),
// 	Rx.op.share(),
// )

// rxMessage.subscribe(message => {
// 	message.level == 'Debug'
// })

// worker.addEventListener('message', function onmessage(event: MessageEvent<GraylogMessage>) {
// 	console.log('graylog message ->', event.data.timestamp)
// })
