import { FastifyInstance } from 'fastify'
import z from 'zod'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'

export async function getPoll(app: FastifyInstance) {
  app.get('/polls/:pollId', async (req, res) => {
    const getPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollId } = getPollParams.parse(req.params)

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!poll) {
      return res.status(404).send({ message: 'Poll not found' })
    }

    const redisResult = await redis.zrange(pollId, 0, -1, 'WITHSCORES')

    const votesResult = redisResult.reduce((obj, line, index) => {
      if (index % 2 === 0) {
        obj[line] = Number(redisResult[index + 1])
      }

      return obj
    }, {} as Record<string, number>)

    const reply = {
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map(option => ({
          id: option.id,
          title: option.title,
          votes: votesResult[option.id] || 0
        }))
      }
    }

    res.status(200).send(reply)
  })
}
