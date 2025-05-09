// This file contains price calculations for energy spent. Such calculations are highly country/region specific.
// Below file performans some default calculations valid in Denmark. They should of course be updated for your country.

// The interface is to augment sessionData using the price_session_data function as well as the price_currency function.

import { SESSION, CHARGER } from '../types/types';
import dayjs, { Dayjs} from 'dayjs';
import { setItem, getItem } from './LocalStorage';

type HOUR_PRICE = {
  DKK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: Date;
  time_end: Date;
};

const ZONES = ['DK1', 'DK2'];

// Init zones. Each zone is again a map with mapping of star_time (top of hour) => price
const zone_prices = new Map();

function tarif(start_time: Dayjs): number {
  // Base tariff / kwh
  const base_tariff = .72 + .135;  // Ex-VAT
  // https://radiuselnet.dk/elnetkunder/tariffer-og-netabonnement/
  const winter_tariff = [0.0976, 0.2929, 0.8788];  // Winter ex-VAT
  const summer_tariff = [0.0976, 0.1465, 0.3808];  // Summer ex-VAT
  const start_hour = start_time.hour();
  const time_index = (start_hour >= 0 && start_hour < 6)?0: (start_hour >= 17 && start_hour < 21)?2: 1;
  if (start_time.month() >= 3 && start_time.month() <= 8)   // April to September
    return summer_tariff[time_index] + base_tariff;
  else
    return winter_tariff[time_index] + base_tariff;
}

function total_kwh_price(start_time: Dayjs = dayjs().startOf("hour"), zone: string = "DK2"): number {
  const start_unix = start_time.unix();
  if (!zone_prices.has(zone) || !zone_prices.get(zone).has(start_unix)) {
    console.log("WARNING: Could not find price.", start_time);
    return 0;
  }

  const spot_price = zone_prices.get(zone).get(start_unix);
  const tariff_price = tarif(start_time);
  const addon_price = 0.05;  // E.g. for ensuring green energy, or otherwise
  return spot_price + tariff_price + addon_price;
}

function download_prices(start_time: number) {
  const call_api = async(url: string) => {
    const response = await fetch(url, {mode:'cors'});
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      return null;
    }
  }

  const date_loop = async() => {
      for (let zindex = 0; zindex < ZONES.length; zindex++) {
          for (let date = dayjs.unix(start_time).startOf("day"); date <= dayjs(); date = date.add(1, "day")) {
              const date_string = dayjs(date).format("YYYY-MM-DD");
              const storage_ix = "price-" + ZONES[zindex] + "-" + date.format("YYYY-MM-DD");
              if (getItem(storage_ix) === null || getItem(storage_ix) == ""){
                  console.log("No data for " + date_string);
                  const url = "https://www.elprisenligenu.dk/api/v1/prices/" + date.format("YYYY") + "/" + date.format("MM-DD") + "_" + ZONES[zindex] + ".json";
                  const data = await call_api(url);
                  if (data == null) {
                    console.log("Failed to get data for " + date_string + ", url:" + url);
                    continue;
                  } else {
                    setItem(storage_ix, JSON.stringify(data));
                  }
              }
              // @ts-expect-error
              const price_data: Array<HOUR_PRICE> = JSON.parse(getItem<Array<HOUR_PRICE>>(storage_ix));
              if (price_data == null || price_data.length == 0) {
                console.log("ERROR - no price data", price_data);
              }
              for (let i = 0; i < price_data.length; i++) {
                const ts = dayjs(price_data[i].time_start).unix();
                if (zone_prices.get(ZONES[zindex]) == null)
                  zone_prices.set(ZONES[zindex], new Map());
                zone_prices.get(ZONES[zindex]).set(ts, price_data[i].DKK_per_kWh);
              }
          }
      }
  }
  (async () => {
    await date_loop();
  })();
  console.log("TEST2: " +  total_kwh_price());

}

export function price_session_data(sessionData: Array<SESSION>, chargerData: Array<CHARGER>) {
  if (sessionData.length == 0)
    return;
  download_prices(sessionData[0].start_time);

  // Let's turn chargerData into a map for quick lookup into description which can hold tariff related info.
  const charger_desc_map = new Map();
  for (let i = 0; i < chargerData.length; i++)
    charger_desc_map.set(chargerData[i].charger_id, chargerData[i].description);

  for (let i = 0; i < sessionData.length; i++) {
    const charger_id = sessionData[i].charger_id;
    const charger_desc = charger_desc_map.get(charger_id)??"";
    let zone = "DK2";  // default
    if (charger_desc.includes("DK1"))
      zone = "DK1";

    // Let's calculate electricity prices for each hourly entry
    let total_price = 0;
    const hour_entries = sessionData[i].hourly_history;
    if (hour_entries == null)
      continue;
    for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
      if (hour_entries[hour_index].wh == 0)
          continue;

      const hour = dayjs(hour_entries[hour_index].date).startOf("hour");
      const kwh = (hour_entries[hour_index].wh??0) / 1000.0;
      hour_entries[hour_index].price = total_kwh_price(hour, zone) * kwh;
      total_price += hour_entries[hour_index].price??0;
    }
    sessionData[i].price = total_price;
  }
}

export function price_currency(): string {
  return "DKK";
}