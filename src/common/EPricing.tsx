// This file contains price calculations for energy spent. Such calculations are highly country/region specific.
// Below file performans some default calculations valid in Denmark. They should of course be updated for your country.

// The interface is to augment sessionData using the price_session_data function as well as the price_currency function.

import { SESSION, CHARGER } from "../types/types";
import dayjs, { Dayjs } from "dayjs";
import { setItem, getItem } from "./LocalStorage";

type HOUR_PRICE = {
  DKK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: Date;
  time_end: Date;
};

const ZONES = ["DK1", "DK2"];
const MAX_CACHE_DAYS = 90;

// Init zones. Each zone is again a map with mapping of start_time (top of hour) => price
const zone_prices = new Map<string, Map<number, number>>();

function normalize_price_data(raw: unknown): Array<HOUR_PRICE> | null {
  if (Array.isArray(raw)) return raw as Array<HOUR_PRICE>;
  if (typeof raw == "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as Array<HOUR_PRICE>;
    } catch {
      return null;
    }
  }
  return null;
}

function tarif(start_time: Dayjs): number {
  // Energy tariff. Fixed
  let energy_tariff = 0.727; // DKK/kwh

  // Temporarily at 0.008 DKK/kwh for 2026 and 2027
  if (start_time.year() == 2026 || start_time.year() == 2027)
    energy_tariff = 0.008;

  // Base tariff / kwh
  const base_tariff = energy_tariff + 0.135; // Ex-VAT.  0.135 = 0.061 nettarif + 0.074 systemtarif
  // https://radiuselnet.dk/elnetkunder/tariffer-og-netabonnement/
  const winter_tariff = [0.0976, 0.2929, 0.8788]; // Winter ex-VAT
  const summer_tariff = [0.0976, 0.1465, 0.3808]; // Summer ex-VAT
  const start_hour = start_time.hour();
  const time_index =
    start_hour >= 0 && start_hour < 6
      ? 0
      : start_hour >= 17 && start_hour < 21
        ? 2
        : 1;
  const addon_price = 0.05; // E.g. for ensuring green energy, or otherwise
  if (start_time.month() >= 3 && start_time.month() <= 8)
    // April to September
    return summer_tariff[time_index] + base_tariff + addon_price;
  else return winter_tariff[time_index] + base_tariff + addon_price;
}

function total_kwh_price(
  start_time: Dayjs = dayjs().startOf("hour"),
  zone: string = "DK2",
): [number, number] {
  const start_unix = start_time.unix();
  if (!zone_prices.has(zone) || !zone_prices.get(zone)?.has(start_unix)) {
    console.log("WARNING: Could not find price.", start_time);
    return [0, 0];
  }

  const spot_price = zone_prices.get(zone)?.get(start_unix) ?? 0;
  const tariff_price = tarif(start_time);
  return [spot_price, tariff_price];
}

async function download_prices(start_time: number, end_time: number): Promise<void> {
  const call_api = async (url: string) => {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      return null;
    }
  };

  const start_date = dayjs.unix(start_time).startOf("day");
  const end_date = dayjs.unix(end_time).startOf("day");
  const total_days = Math.max(0, end_date.diff(start_date, "day") + 1);
  const allow_cache = total_days <= MAX_CACHE_DAYS;

  const date_loop = async () => {
    for (let zindex = 0; zindex < ZONES.length; zindex++) {
      for (
        let date = start_date;
        date <= end_date;
        date = date.add(1, "day")
      ) {
        const date_string = dayjs(date).format("YYYY-MM-DD");
        const storage_ix =
          "price-" + ZONES[zindex] + "-" + date.format("YYYY-MM-DD");
        const storage_value = getItem<unknown>(storage_ix);
        let price_data = normalize_price_data(storage_value);
        if (price_data == null || price_data.length == 0) {
          console.log("No data for " + date_string);
          const url =
            "https://www.elprisenligenu.dk/api/v1/prices/" +
            date.format("YYYY") +
            "/" +
            date.format("MM-DD") +
            "_" +
            ZONES[zindex] +
            ".json";
          const data = await call_api(url);
          if (data == null) {
            console.log(
              "Failed to get data for " + date_string + ", url:" + url,
            );
            continue;
          } else {
            price_data = normalize_price_data(data);
            if (allow_cache) setItem(storage_ix, data);
          }
        }
        if (price_data == null || price_data.length == 0) {
          console.log("ERROR - no price data", price_data);
          continue;
        }
        for (let i = 0; i < price_data.length; i++) {
          const ts = dayjs(price_data[i].time_start).unix();
          if (zone_prices.get(ZONES[zindex]) == null)
            zone_prices.set(ZONES[zindex], new Map());
          zone_prices.get(ZONES[zindex])?.set(ts, price_data[i].DKK_per_kWh);
        }
      }
    }
  };
  await date_loop();
}

export async function price_session_data(
  sessionData: Array<SESSION>,
  chargerData: Array<CHARGER>,
) {
  if (sessionData.length == 0) return;

  const earliest_start_time = sessionData.reduce(
    (min_start, session) => Math.min(min_start, session.start_time),
    sessionData[0].start_time,
  );
  const latest_end_time = sessionData.reduce((max_end, session) => {
    const session_end =
      typeof session.end_time === "number" && session.end_time > 0
        ? session.end_time
        : session.start_time;
    return Math.max(max_end, session_end);
  }, sessionData[0].start_time);

  await download_prices(earliest_start_time, latest_end_time);

  // Let's turn chargerData into a map for quick lookup into description which can hold tariff related info.
  const charger_desc_map = new Map<string, string>();
  for (let i = 0; i < chargerData.length; i++)
    charger_desc_map.set(chargerData[i].charger_id, chargerData[i].description);

  for (let i = 0; i < sessionData.length; i++) {
    const charger_id = sessionData[i].charger_id;
    const charger_desc = charger_desc_map.get(charger_id) ?? "";
    let zone = "DK2"; // default
    if (charger_desc.includes("DK1")) zone = "DK1";

    // Let's calculate electricity prices for each hourly entry
    let total_price = 0,
      total_tariff_price = 0,
      total_spot_price = 0;
    const hour_entries = sessionData[i].hourly_history;
    if (hour_entries == null) continue;
    for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
      if (hour_entries[hour_index].wh == 0) continue;

      const hour = dayjs(hour_entries[hour_index].date).startOf("hour");
      const kwh = (hour_entries[hour_index].wh ?? 0) / 1000.0;
      const [spot, tariff] = total_kwh_price(hour, zone);
      hour_entries[hour_index].spot_price = spot * kwh;
      hour_entries[hour_index].tariff_price = tariff * kwh;
      hour_entries[hour_index].price = (spot + tariff) * kwh;
      total_tariff_price += hour_entries[hour_index].tariff_price ?? 0;
      total_spot_price += hour_entries[hour_index].spot_price ?? 0;
      total_price += hour_entries[hour_index].price ?? 0;
    }
    sessionData[i].tariff_price = total_tariff_price;
    sessionData[i].spot_price = total_spot_price;
    sessionData[i].price = total_price;
  }
}

export function price_currency(): string {
  return "DKK";
}

export function tariff_tooltip(): string {
  return (
    "Tariffen best\u00e5r af 4 konstante elementer og 1 dynamisk element (alt uden moms):\n" +
    "1. Elafgift: 0.727 DKK/kWh (0.008 DKK/kwh i hele 2026/2027)\n" +
    "2. Nettarif: 0.061 DKK/kWh\n" +
    "3. Systemtarif: 0.074 DKK/kWh\n" +
    "4. El leverand\u00f8r gr\u00f8n str\u00f8m: 0.05 DKK/kWh\n" +
    "5. Distributionsafgift (afh\u00e6nger af tidspunkt og \u00e5rstid):\n" +
    "   - Vinter: 0.0976 DKK/kWh (00-06), 0.2929 DKK/kWh (06-17 & 21-00), 0.8788 DKK/kWh (17-21)\n" +
    "   - Sommer: 0.0976 DKK/kWh (00-06), 0.1465 DKK/kWh (06-17 & 21-00), 0.3808 DKK/kWh (17-21)"
  );
}

export function spot_tooltip(): string {
  return "El spotpris afh\u00e6ngig tidspunkt og laderens lokation (DK1 or DK2)";
}
