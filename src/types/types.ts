export type CONNECTOR = {
  state: string;
};

export type CHARGING_ENTRY = {
  timestamp: number;
  offered: number | null;
  usage: number | null;
  date: Date | null;
  wh: number | null;
}

export type CHARGER = {
  charger_id: string;
  alias: string;
  description: string;
  group_id: string;
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
};
