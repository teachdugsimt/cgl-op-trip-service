import { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, POST, getInstanceByToken, PATCH, DELETE } from 'fastify-decorators';
import TripService, { IShipmentTrip } from '../services/trip.service';
import {
  getTripSchema,
  addTripSchema,
  addBulkTripSchema,
  deleteTripSchema,
  getDetailTripSchema,
  patchJobTripSchema,
  patchTripSchema
} from './trip.schema';
import Security from 'utility-layer/dist/security';
import { Trip } from './trip.types'

interface ITruckProps {
  id: string
  startDate: string
}

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

  @GET({
    url: '/:id',
    options: {
      schema: getDetailTripSchema
    }
  })
  async getDetailHandler(req: FastifyRequest<{
    Params: {
      id: string
    },
    Headers: {
      authorization: string
    }
  }>, reply: FastifyReply): Promise<object> {
    try {
      const { id } = req.params;
      const result = await this.tripService?.getTripDetail(id);
      console.log('result :>> ', result);
      return result;
    } catch (err: any) {
      console.log('err :>> ', err);
      console.log('err.message :>> ', err.message);
      if (err.message === 'Request not found') {
        return reply.status(404).send(err);
      }
      return reply.status(500).send(err);
    }
  }

  @POST({
    url: '/bulk',
    options: {
      schema: addBulkTripSchema
    }
  })
  async createHandler(req: FastifyRequest<{
    Body: {
      jobId: string
      trucks: Array<ITruckProps>
    },
    Headers: {
      authorization: string
    }
  }>, reply: FastifyReply): Promise<object> {
    const { jobId, trucks } = req.body;
    const userIdFromToken = security.getUserIdByToken(req.headers.authorization);
    const userId = security.decodeUserId(userIdFromToken);
    return this.tripService?.bulkTrip(jobId, trucks, userId);
  }

  @DELETE({
    url: '/:id',
    options: {
      schema: deleteTripSchema
    }
  })
  async deleteHandler(req: FastifyRequest<{
    Params: {
      id: string
    },
    Headers: {
      authorization: string
    }
  }>, reply: FastifyReply): Promise<object> {
    const { id } = req.params;
    const userIdFromToken = security.getUserIdByToken(req.headers.authorization);
    const userId = security.decodeUserId(userIdFromToken);
    await this.tripService?.deleteTripById(id, userId);
    return reply.status(204).send();
  }

  @PATCH({
    url: '/jobs/:jobId',
    options: {
      schema: patchJobTripSchema
    }
  })
  async updateTripJobHandler(req: FastifyRequest<{
    Params: {
      jobId: string
    },
    Body: {
      trucks: Array<ITruckProps>
    },
    Headers: {
      authorization: string
    }
  }>, reply: FastifyReply): Promise<object> {
    const { jobId } = req.params;
    const { trucks } = req.body
    const userIdFromToken = security.getUserIdByToken(req.headers.authorization);
    const userId = security.decodeUserId(userIdFromToken);
    await this.tripService?.updateTripByJobId(jobId, trucks, userId);
    return reply.status(204).send();
  }

  @PATCH({
    url: '/:id',
    options: {
      schema: patchTripSchema
    }
  })
  async updateShipmentTripHandler(req: FastifyRequest<{
    Params: {
      id: string
    },
    Body: IShipmentTrip,
    Headers: {
      authorization: string
    }
  }>, reply: FastifyReply): Promise<object> {
    const { id } = req.params;
    const userIdFromToken = security.getUserIdByToken(req.headers.authorization);
    const userId = security.decodeUserId(userIdFromToken);
    await this.tripService?.updateShipmentTrip({
      tripId: id,
      userId,
      data: req.body
    });
    return reply.status(204).send();
  }

}
