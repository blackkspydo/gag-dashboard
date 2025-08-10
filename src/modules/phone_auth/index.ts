import { Module } from "@medusajs/framework/utils"
import PhoneAuthService from "./service"

export default Module("phone_auth", {
  service: PhoneAuthService,
})