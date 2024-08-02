/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Bot, Context, webhookCallback } from 'grammy'
import { User } from 'grammy/types'

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue
	BOT_INFO: string
	BOT_TOKEN: string
}

function escapeMD(str: string) {
	// '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
	return str.replace(/([|{\[\]*_~}+)(#>!=\-.])/gm, '\\$1')
}

function parseUser(user: User) {
	const name = user.id < 1000000 ? '杜叔叔的🐴' : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
	return `[${escapeMD(name)}](tg://user?id=${user.id})`
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const bot = new Bot(env.BOT_TOKEN, { botInfo: JSON.parse(env.BOT_INFO) })

		bot.chatType('private').command('start', async (ctx: Context) => {
			await ctx.reply('Ciallo～(∠・ω< )⌒☆')
		})

		bot
			.chatType(['group', 'supergroup'])
			.on('message:text')
			.filter(
				(ctx: Context) =>
					(ctx.from?.is_bot === false &&
						ctx.message?.reply_to_message?.from &&
						ctx.message!.text!.trimEnd().length > 1 &&
						ctx.message!.text!.startsWith('/')) ||
					ctx.message!.text!.startsWith('\\'),
				async (ctx: Context) => {
					const operator = ctx.from!
					const operated = ctx.message!.reply_to_message!.from!

					let parts = ctx.message!.text!.split(' ')
					const slash = parts[0].charAt(0)

					let op1: User | String = operator
					let op2: User | String = operated
					if (slash == '\\' && operated) {
						op2 = operator
						op1 = operated
					}

					op2 = op2?.id == op1?.id ? `[自己](tg://user?id=${operator.id})` : parseUser(op2!)
					op1 = parseUser(op1!)

					parts[0] = parts[0].slice(1)
					parts = parts.map(escapeMD)

					let text: string
					switch (parts.length) {
						case 1:
							text = `${op1} ${parts[0]}了 ${op2}！`
							break
						case 2:
							text = `${op1} ${parts[0]}了 ${op2} 的${parts[1]}！`
							break
						case 3:
							text = `${op1} ${parts[0]} ${op2} 的${parts[1]}${parts[2]}了！`
							break
						default:
							text = `${parseUser(operator!)}，格式不对吧？再试一次吧！`
					}

					if (operated.id === ctx.me.id) text = `${parseUser(operator!)}，打咩哟～`

					console.log(text)
					await ctx.reply(text, {
						reply_parameters: { message_id: ctx.msg!.message_id },
						parse_mode: 'MarkdownV2',
					})
				}
			)

		return webhookCallback(bot, 'cloudflare-mod')(request)
	},
}
