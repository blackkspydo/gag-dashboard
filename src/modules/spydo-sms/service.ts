import { 
  AbstractNotificationProviderService
} from "@medusajs/framework/utils"

interface SpydoSmsOptions {
  apiKey: string
  senderId: string
  baseUrl?: string
}

interface SpydoSmsResponse {
  status: string
  message: string
}

class SpydoSmsProviderService extends AbstractNotificationProviderService {
  static identifier = "spydo-sms"
  
  private apiKey: string
  private senderId: string
  private baseUrl: string

  constructor(_: any, options: SpydoSmsOptions) {
    super()
    
    this.apiKey = options.apiKey
    this.senderId = options.senderId
    this.baseUrl = options.baseUrl || "https://bulk.bedbyaspokhrel.com.np/smsapi/index"
  }

  static validateOptions(options: SpydoSmsOptions): SpydoSmsOptions | never {
    if (!options.apiKey) {
      throw new Error("Spydo SMS: API key is required")
    }
    if (!options.senderId) {
      throw new Error("Spydo SMS: Sender ID is required")
    }
    return options
  }

  async send(notification: any): Promise<any> {
    const { to, data } = notification
    
    if (!to) {
      throw new Error("Spydo SMS: Recipient phone number is required")
    }

    if (!data?.message) {
      throw new Error("Spydo SMS: Message content is required")
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        contacts: to,
        senderid: this.senderId,
        msg: data.message,
        responsetype: 'json'
      })

      const response = await fetch(`${this.baseUrl}?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`SMS API returned ${response.status}: ${response.statusText}`)
      }

      const result: SpydoSmsResponse = await response.json()
      
      return {
        id: `sms_${Date.now()}`,
        to,
        status: result.status === 'success' ? 'sent' : 'failed',
        data: result
      }
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`)
    }
  }
}

export default SpydoSmsProviderService