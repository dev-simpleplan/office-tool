import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("officeDesktop", {
  platform: process.platform,
});
