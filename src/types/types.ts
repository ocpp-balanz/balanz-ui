export enum CONN_STATE {
  NOT_CONNECTED,
  CONNECTED,
  LOGGED_IN
};

export type CONNECTOR = {
  state: string;
};

export type CHARGING_ENTRY = {
  timestamp: number;
  offered: number | null;
  usage: number | null;
  date: Date | null;
  wh: number | null;
  price: number | null;
}

export type CHARGER = {
  charger_id: string;
  alias: string;
  description: string;
  group_id: string;
  priority: number;
  connectors: Map<string, CONNECTOR>;
  network_connected: boolean;
  charge_box_serial_number: string;
  charge_point_model: string;
  charge_point_vendor: string;
  conn_max: number;
  firmware_version: string;
};

export type PRI_AMP = [number, number];

export type GROUP = {
  group_id: string;
  description: string;
  max_allocation: string;
  max_allocation_now: Array<PRI_AMP>;
  chargers: Array<CHARGER>;
  offered: number;
  usage: number;
};

export type TAG = {
  id_tag: string;
  user_name: string;
  parent_id_tag: string | null;
  description: string | null;
  status: string;
  priority: number | null;
};

export type SESSION = {
  session_id: string;
  charger_id: string;
  charger_alias: string;
  group_id: string;
  id_tag: string;
  user_name: string;
  stop_id_tag: string;
  start_time: number;
  end_time: number;
  duration: number;
  energy_meter: number;
  reason: string;
  kwh: string;
  charging_history: Array<CHARGING_ENTRY>;
  hourly_history: Array<CHARGING_ENTRY>;
  price: number;
};

export type USER = {
  user_id: string;
  user_type: string;
  description: string;
};

