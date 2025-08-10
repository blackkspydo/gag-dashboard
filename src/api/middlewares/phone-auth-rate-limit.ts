import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

interface RateLimitStore {
  [key: string]: {
    count: number
    windowStart: number
  }
}

const rateLimitStore: RateLimitStore = {}
const WINDOW_SIZE = 60 * 1000
const MAX_REQUESTS = 3

function cleanupExpiredEntries() {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach(key => {
    if (now - rateLimitStore[key].windowStart > WINDOW_SIZE) {
      delete rateLimitStore[key]
    }
  })
}

export function phoneAuthRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
  const phoneNumber = (req.body as any)?.phone_number
  
  if (!phoneNumber) {
    return next()
  }
  
  const key = `${clientIp}:${phoneNumber}`
  const now = Date.now()
  
  cleanupExpiredEntries()
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      windowStart: now
    }
    return next()
  }
  
  const entry = rateLimitStore[key]
  
  if (now - entry.windowStart > WINDOW_SIZE) {
    entry.count = 1
    entry.windowStart = now
    return next()
  }
  
  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP requests. Please wait before trying again.",
      retryAfter: Math.ceil((WINDOW_SIZE - (now - entry.windowStart)) / 1000)
    })
  }
  
  entry.count++
  next()
}