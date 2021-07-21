import { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, POST, getInstanceByToken } from 'fastify-decorators';
import TripService from '../services/trip.service';
import { getTripSchema, addTripSchema } from './trip.schema';
import Security from 'utility-layer/dist/security';
import { Trip } from './trip.types'

const security = new Security();

@Controller({ route: '/api/v1/trips' })
export default class TripController {

  private tripService = getInstanceByToken<TripService>(TripService);

  @GET({
    url: '/',
    options: {
      schema: getTripSchema
    }
  })
  async getTripHandler(req: FastifyRequest<{
    Headers: { authorization: string },
    Querystring: { descending?: boolean, page?: number, rowsPerPage?: number, sortBy?: string }
  }>, reply: FastifyReply): Promise<object> {
    try {
      const { page = 1, rowsPerPage = 10 } = req.query

      const userIdFromToken = security.getUserIdByToken(req.headers.authorization);
      const trips = await this.tripService.getTrips(userIdFromToken, req.query);

      return {
        data: trips.data,
        size: rowsPerPage,
        currentPage: page,
        totalPages: Math.ceil(trips.count / (+rowsPerPage)),
        totalElements: trips.count,
        numberOfElements: trips.data.length ?? 0,
      }
    } catch (err) {
      console.log('err :>> ', err);
      reply.status(400);
      throw err;
    }
  }


  @POST({
    url: '/',
    options: {
      schema: addTripSchema
    }
  })
  async addTripHandler(req: FastifyRequest<{ Headers: { authorization: string }, Body: Trip }>, reply: FastifyReply): Promise<object> {
    try {
      const response = await this.tripService.addTrip(req.body, req.headers.authorization);
      console.log("Response final :: ", response)
      return { ...response }
    } catch (err) {
      console.log('err :>> ', err);
      reply.status(400);
      throw err;
    }
  }

}
