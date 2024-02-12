import fastify from 'fastify'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'
import { createPoll } from './routes/create-poll'
import { getPoll } from './routes/get-poll'
import { voteOnPoll } from './routes/vote-on-poll'
import { pollResults } from './ws/pollResults'

const app = fastify()

app.register(websocket)
app.register(cookie, {
  secret: 'polls-app',
  hook: 'onRequest'
})
app.register(createPoll)
app.register(getPoll)
app.register(voteOnPoll)
app.register(pollResults)

app.listen({ port: 3333 }).then(() => {
  console.log('Server is running on port 3333')
})