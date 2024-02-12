import { FastifyInstance } from 'fastify'
import z from 'zod'
import { prisma } from '../../lib/prisma'

export async function createPoll(app: FastifyInstance) {
  app.post('/polls', async (req, res) => {
    const createPollSchema = z.object({
      title: z.string(),
      options: z.array(z.string())
    })

    const { title, options } = createPollSchema.parse(req.body)

    const poll = await prisma.poll.create({
      data: {
        title,
        options: {
          createMany: {
            data: options.map(option => ({ title: option }))
          }
        }
      }
    })

    res.status(201).send({ id: poll.id })
  })
}
