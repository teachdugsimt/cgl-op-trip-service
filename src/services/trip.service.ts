import { Service, Initializer, Destructor } from 'fastify-decorators';
import { FindManyOptions } from 'typeorm';
import TripRepository from '../repositories/trip.repository';
import VwTripInprogressRepository from '../repositories/vw-trip-inprogress.repository';
import VwTripAllRepository from '../repositories/vw-trip-all.repository';
import JobCarrierRepository from '../repositories/job-carrier.repository';
import Security from 'utility-layer/dist/security'
import * as Types from '../controllers/trip.types'
import axios from 'axios'
import { Trip } from '../models'

interface FindTripProps {
  descending?: boolean
  page?: number
  rowsPerPage?: number
  sortBy?: string
}

const tripRepository = new TripRepository();
const jobCarrierRepository = new JobCarrierRepository();
const security = new Security();
const vwTripInprogressRepository = new VwTripInprogressRepository()
const vwTripAllRepository = new VwTripAllRepository()

const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

@Service()
export default class TripService {
  @Initializer()
  async init(): Promise<void> { }

  async getTrips(userId: string, filter: FindTripProps): Promise<any> {
    let {
      descending = true,
      page = 1,
      rowsPerPage = 10,
      sortBy = 'id',
    } = filter

    const numbOfPage = page <= 1 ? 0 : (+page - 1) * rowsPerPage;

    const options: any = {
      // where: `carrier_id = ${decodeUserId} OR (job_owner ->> 'id')::INTEGER = ${decodeUserId} OR trips::JSONB @> '[{"owner":{"id": ${decodeUserId}}}]'`,
      select: [
        'id', 'jobId', 'truckId', 'price', 'priceType', 'productName', 'productTypeId', 'truckType',
        'totalWeight', 'requiredTruckAmount', 'status', 'from', 'to', 'owner'
      ],
      take: rowsPerPage,
      skip: numbOfPage,
      order: {
        [camelToSnakeCase(sortBy)]: descending ? 'DESC' : 'ASC'
      },
    }

    const trips = await vwTripAllRepository.findAndCount(options);
    console.log("Trip :: ", trips)
    const newTrips = trips[0].map((trip: any) => {
      return {
        ...trip,
        price: Math.round(trip.price * 100) / 100,
        weight: Math.round(trip.totalWeight * 100) / 100,
      }
    })

    return {
      data: newTrips || [],
      count: trips[1] || 0,
    }
  }
  async getTruck(truckId: string, authorization: string | null): Promise<any> {
    const mainUrl = process.env.API_URL || 'https://2kgrbiwfnc.execute-api.ap-southeast-1.amazonaws.com/prod';
    return axios.get(`${mainUrl}/api/v1/trucks/${truckId}/mst`, { headers: { Authorization: authorization || '' } });
  }

  async addTrip(body: Types.Trip, authorization: string): Promise<any> {
    const userIdFromToken = security.getUserIdByToken(authorization);
    const decodeUserId = security.decodeUserId(userIdFromToken);
    console.log("Body : ", body)
    console.log("decode user id : ", decodeUserId)

    const truckData = await this.getTruck(body.truckId, authorization)
    const truck = truckData.data
    console.log("Truck data : ", truck)

    const checkExistCarrierJobTable = await jobCarrierRepository.find({
      where: [{ jobId: security.decodeUserId(body.jobId), carrierId: truck.carrierId }]
    })
    console.log("Find carrier job id :: ", checkExistCarrierJobTable)
    let addCarrierJob
    if (checkExistCarrierJobTable.length < 1)
      addCarrierJob = await jobCarrierRepository.add({ jobId: security.decodeUserId(body.jobId), carrierId: truck.carrierId })
    else addCarrierJob = checkExistCarrierJobTable[0]

    const newBody: Partial<Trip> = {
      jobCarrierId: addCarrierJob.id,
      truckId: security.decodeUserId(body.truckId),
      weight: body.weight.toString(),
      price: body.price.toString(),
      priceType: body.priceType,
      createdUser: decodeUserId.toString(),
      status: "OPEN",
      bookingId: 0
    }
    return tripRepository.add(newBody)
  }

  @Destructor()
  async destroy(): Promise<void> { }
}
