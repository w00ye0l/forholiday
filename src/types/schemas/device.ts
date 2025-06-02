import { type Database } from "../supabase";

export type Device = Database["public"]["Tables"]["devices"]["Row"];
export type DeviceInsert = Database["public"]["Tables"]["devices"]["Insert"];
export type DeviceUpdate = Database["public"]["Tables"]["devices"]["Update"];

export type DeviceStatus = Database["public"]["Enums"]["device_status"];
