import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SpydoSmsProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SpydoSmsProviderService]
})