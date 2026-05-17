import { prisma } from '../prisma/client'

export class IngestionRepository {
  async findById(id: string) {
    return prisma.ingestion.findUnique({ where: { id } })
  }
}
