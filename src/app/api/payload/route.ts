import { getPayload } from 'payload'
import config from '../../payload.config'

export const POST = async (req: Request) => {
  const payload = await getPayload({ config })

  return payload.router(req)
}

export const GET = async (req: Request) => {
  const payload = await getPayload({ config })

  return payload.router(req)
}
