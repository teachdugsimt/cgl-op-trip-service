import { FastifyInstance } from 'fastify';
import { FastifyInstanceToken, getInstanceByToken } from 'fastify-decorators';
import { FindManyOptions, Repository } from 'typeorm';
import { VwTripAll } from '../models'

interface FindAllProps {
  where: any
  select?: string[]
  take: number
  skip: number
  order: any
}

export default class VwTripAllRepository {

  private instance: FastifyInstance = getInstanceByToken(FastifyInstanceToken);

  async find(options: FindManyOptions): Promise<any> {
    const server: any = this.instance
    const viewTripInprogressRepository: Repository<VwTripAll> = server?.db?.vwTripAll;
    return viewTripInprogressRepository.find(options);
  }

  async findAndCount(options: FindManyOptions): Promise<any> {
    const server: any = this.instance
    const viewTripInprogressRepository: Repository<VwTripAll> = server?.db?.vwTripAll;
    return viewTripInprogressRepository.findAndCount(options);
  }

  async findAndCountV2(options: FindAllProps): Promise<any> {
    const server: any = this.instance
    const viewTripInprogressRepository: Repository<VwTripAll> = server?.db?.vwTripAll;
    return viewTripInprogressRepository.createQueryBuilder()
      .select(options?.select?.length ? options.select : ['*'])
      .where(options.where)
      .orderBy(options.order)
      .take(options.take)
      .skip(options.skip)
      .getRawMany();
  }

}
