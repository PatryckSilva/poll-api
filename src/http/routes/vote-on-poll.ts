import { FastifyInstance } from 'fastify'
import z from 'zod'
import { prisma } from '../../lib/prisma'
import { randomUUID } from 'node:crypto'
import { redis } from '../../lib/redis'
import { voting } from '../../utils/voting-pub-sub'

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (req, res) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollId } = voteOnPollParams.parse(req.params)
    const { pollOptionId } = voteOnPollBody.parse(req.body)

    let { sessionId } = req.cookies

    if (sessionId) {
      const userPreviousVote = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            pollId,
            sessionId
          }
        }
      })

      if (userPreviousVote && userPreviousVote.pollOptionId !== pollOptionId) {
        // deleta a opção antiga do user
        await prisma.vote.delete({
          where: {
            id: userPreviousVote.id
          }
        })
        // decrementa do redis a opção antiga,userPreviousVote.pollOptionId e nao pollOptionId
        const votes = await redis.zincrby(
          pollId,
          -1,
          userPreviousVote.pollOptionId
        )

        voting.publish(pollId, {
          pollOptionId: userPreviousVote.pollOptionId,
          votes: Number(votes)
        })
      } else if (userPreviousVote) {
        // faz o retorno caso o usuario esteja votando na mesma opção que ele ja votou
        return res
          .status(400)
          .send({ message: 'You have already voted on this poll' })
      }
    }

    if (!sessionId) {
      // senao tiver session id, se cria uma
      sessionId = randomUUID()
      res.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true
      })
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionId)

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes)
    })

    res.status(201).send()
  })
}
