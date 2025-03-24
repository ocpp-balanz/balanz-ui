import { SESSION, HOUR_PRICE, GROUP, CHARGER, CHARGING_ENTRY } from '../types/types';
import dayjs from 'dayjs';
import { setItem, getItem } from '../common/LocalStorage';


const ZONES = ['DK1', 'DK2'];

export type DATAENTRY = {
    id: string;
    timestamp: number;
    x: string;
    energy: number;
};

function download_prices(sessionData: Array<SESSION>) {
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
            for (let date = dayjs.unix(sessionData[0].start_time).startOf("day"); date <= dayjs(); date = date.add(1, "day")) {
                const date_string = dayjs(date).format("YYYY-MM-DD");
                const storage_ix = "price-" + ZONES[zindex] + "-" + date.format("YYYY-MM-DD");
                if (getItem(storage_ix) === null || getItem(storage_ix) == ""){
                    console.log("No data for " + date_string);
                    const url = "https://www.elprisenligenu.dk/api/v1/prices/" + date.format("YYYY") + "/" + date.format("MM-DD") + "_" + ZONES[zindex] + ".json";
                    const data = await call_api(url);
                    setItem(storage_ix, JSON.stringify(data));
                }
            }
        }
    }
    date_loop();
}

export function augment_session_data(sessionData: Array<SESSION>) {
    download_prices(sessionData);
    for (let i = 0; i < sessionData.length; i++) {
      // First, let's quickly set the date field
      sessionData[i].charging_history.map((e) => {
        e.date = new Date(e.timestamp * 1000);
      });

      // Some entries in sessions may be errored, having end_time ahead of start_time.
      // Hack it dramatically.
      if (sessionData[i].end_time != null && sessionData[i].end_time <= sessionData[i].start_time) {
        sessionData[i].end_time = sessionData[i].start_time + 1800;  // 30 min
        console.log("WARNING: Session " + i + ": end time is before start time. Setting to " + sessionData[i].end_time, "usage is", sessionData[i].kwh);
      }
  
      // Next, let's review the entries in more details to determine wh...
      let usage = null;
      let total_wh = 0.0;
      for (let ci = 0; ci < sessionData[i].charging_history.length; ci++) {
        // Work out how long this interval is.
        let seconds = 0;
        if (ci == sessionData[i].charging_history.length - 1) {
          if (sessionData[i].end_time != null)
            seconds = sessionData[i].end_time - sessionData[i].charging_history[ci].timestamp;
          else
            seconds = Date.now() / 1000 - sessionData[i].charging_history[ci].timestamp;
        } else {
          seconds = sessionData[i].charging_history[ci + 1].timestamp - sessionData[i].charging_history[ci].timestamp;
        }
        if (sessionData[i].charging_history[ci].usage != null)
          usage = sessionData[i].charging_history[ci].usage;
        else if (usage == null && sessionData[i].charging_history[ci].offered != null) {
          usage = sessionData[i].charging_history[ci].offered;
        }
        sessionData[i].charging_history[ci].wh = (usage ?? 0) * seconds / 3600.0;
        total_wh += sessionData[i].charging_history[ci].wh ?? 0;
      }

      if (total_wh != 0) {
        // Adjust proportionally to make sure energy total is correct. 
        // Note, that this factor will also take care of the missing voltage (230V) and # phases (typically 3)
        const factor = sessionData[i].energy_meter / total_wh;
        for (let ci = 0; ci < sessionData[i].charging_history.length - 1; ci++)
          sessionData[i].charging_history[ci].wh = (sessionData[i].charging_history[ci].wh??0) * factor;
      } 

      // Ok, that was fun. Do instead hourly entries and distribute across these. This will be much
      // more usefull later on.
      const hour_entries: Array<CHARGING_ENTRY> = [];
      const start_date = dayjs.unix(sessionData[i].start_time).startOf("hour");
      let end_date = sessionData[i].end_time == null? dayjs(): dayjs.unix(sessionData[i].end_time);
      end_date = end_date.add(1, 'hour').startOf("hour");   // Ensure final entry extends.
      for (let date = start_date; date <= end_date; date = date.add(1, 'hour'))
        hour_entries.push({timestamp: date.unix(), offered: null, usage: null, date: date.toDate(), wh: 0});

      // Iterate charging entries and put into the right hour_entry
      for (let ci = 0; ci < sessionData[i].charging_history.length; ci++) {
        const start = sessionData[i].charging_history[ci].timestamp;
        let end = null;
        if (ci == sessionData[i].charging_history.length - 1) {
          if (sessionData[i].end_time != null)
            end = sessionData[i].end_time;
          else
            end = dayjs().unix();
        } else {
          end = sessionData[i].charging_history[ci + 1].timestamp;
        }
        if (start == end)
          continue;   // Same second admin type entry - skip it.

        let remain = sessionData[i].charging_history[ci].wh??0;
        for (let hour_index = 0; hour_index < hour_entries.length - 1; hour_index++) {
          const bstart = hour_entries[hour_index].timestamp;
          const bend = hour_entries[hour_index + 1].timestamp;

          // How much overlap
          const overlap_s = Math.min(end, bend) - Math.max(start, bstart);
          if (overlap_s <= 0)
            continue;

          // Vs. length? - this determines the relative contribution
          const contrib_wh = (sessionData[i].charging_history[ci].wh??0) * (overlap_s / (end - start));
          if (hour_entries[hour_index].wh == null)
            hour_entries[hour_index].wh = contrib_wh;
          else
            // @ts-expect-error
            hour_entries[hour_index].wh += contrib_wh; 
          remain -= contrib_wh;
        }
        if (remain > 1)
          console.log("Warning, remaining for session", sessionData[i].session_id, remain);
      } 

      // First, let's review the totals to make sure they add up. If not, adjust them into first entry.
      let total_check = 0;
      for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) 
        total_check += hour_entries[hour_index].wh??0;
      if (Math.abs(total_check - sessionData[i].energy_meter) > 1) {
        console.log("Adjusting data for session", sessionData[i].session_id, "missed to distribute energy", sessionData[i].energy_meter);
        const diff = sessionData[i].energy_meter - total_check;
        hour_entries[0].wh = (hour_entries[0].wh??0) + diff;
      } 

      // Let's calculate electricity prices for each hourly entry
      let total_price = 0;
      for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
        if (hour_entries[hour_index].wh == 0)
            continue;

        const storage_ix = "price-" + "DK2" + "-" + dayjs.unix(hour_entries[hour_index].timestamp).format("YYYY-MM-DD");
        const prices: Array<HOUR_PRICE> = JSON.parse(getItem<Array<HOUR_PRICE>>(storage_ix));
        // Find the right price
        let found_price: boolean = false;
        const hour_ds = dayjs(hour_entries[hour_index].date).startOf("hour");
        for (let p = 0; p < prices.length; p++) {
            if (dayjs(prices[p].time_start).startOf("hour") == hour_ds) {
                console.log("Found price", prices[p], hour_entries[hour_index].timestamp);
                hour_entries[hour_index].price = prices[p].DKK_per_kWh * (hour_entries[hour_index].wh??0) / 1000.0;
                total_price += hour_entries[hour_index].price??0;
                found_price = true;
                break;
            };
        }
        if (!found_price)
            console.log("Could not find price");
      }
      sessionData[i].total_price = total_price;
      console.log(sessionData[i]);

      // Now, let's add all entries to the session object. 
      sessionData[i].hourly_history = [];
      for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
        sessionData[i].hourly_history.push(hour_entries[hour_index]);
      }
    }
}