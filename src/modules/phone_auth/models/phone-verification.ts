import { model } from "@medusajs/framework/utils"

const PhoneVerification = model.define("phone_verification", {
  id: model.id().primaryKey(),
  phone_number: model.text().searchable(),
  otp_code: model.text(),
  expires_at: model.dateTime(),
  is_verified: model.boolean().default(false),
  attempts: model.number().default(0),
  max_attempts: model.number().default(3),
}).indexes([
  {
    name: "IDX_phone_verification_phone_number",
    on: ["phone_number"],
  },
  {
    name: "IDX_phone_verification_expires_at",
    on: ["expires_at"],
  },
])

export default PhoneVerification