import { SESSION, CHARGING_ENTRY } from "../types/types";
import dayjs from "dayjs";

export function augment_1session(session: SESSION) {
  // First, let's quickly set the date field
  session.charging_history.map((e) => {
    e.date = new Date(e.timestamp * 1000);
  });

  // Some entries in sessions may be errored, having end_time ahead of start_time.
  // Hack it dramatically.
  if (session.end_time != null && session.end_time <= session.start_time) {
    session.end_time = session.start_time + 1800; // 30 min
    console.log(
      "WARNING: Session end time is before start time. Setting to " +
        session.end_time,
      "usage is",
      session.kwh,
    );
  }

  // Next, let's review the entries in more details to determine wh...
  let usage = null;
  let total_wh = 0.0;
  for (let ci = 0; ci < session.charging_history.length; ci++) {
    // Work out how long this interval is.
    let seconds = 0;
    if (ci == session.charging_history.length - 1) {
      if (session.end_time != null)
        seconds = session.end_time - session.charging_history[ci].timestamp;
      else seconds = Date.now() / 1000 - session.charging_history[ci].timestamp;
    } else {
      seconds =
        session.charging_history[ci + 1].timestamp -
        session.charging_history[ci].timestamp;
    }
    if (session.charging_history[ci].usage != null)
      usage = session.charging_history[ci].usage;
    else if (usage == null && session.charging_history[ci].offered != null) {
      usage = session.charging_history[ci].offered;
    }
    session.charging_history[ci].wh = ((usage ?? 0) * seconds) / 3600.0;
    total_wh += session.charging_history[ci].wh ?? 0;
  }

  if (total_wh != 0) {
    // Adjust proportionally to make sure energy total is correct.
    // Note, that this factor will also take care of the missing voltage (230V) and # phases (typically 3)
    const factor = session.energy_meter / total_wh;
    for (let ci = 0; ci < session.charging_history.length - 1; ci++)
      session.charging_history[ci].wh =
        (session.charging_history[ci].wh ?? 0) * factor;
  }

  // Ok, that was fun. Do instead hourly entries and distribute across these. This will be much
  // more usefull later on.
  const hour_entries: Array<CHARGING_ENTRY> = [];
  const start_date = dayjs.unix(session.start_time).startOf("hour");
  let end_date =
    session.end_time == null ? dayjs() : dayjs.unix(session.end_time);
  end_date = end_date.add(1, "hour").startOf("hour"); // Ensure final entry extends.
  for (let date = start_date; date <= end_date; date = date.add(1, "hour"))
    hour_entries.push({
      timestamp: date.unix(),
      offered: null,
      usage: null,
      date: date.toDate(),
      wh: 0,
      price: 0,
      tariff_price: 0,
      spot_price: 0,
      kwh_total: null,
    });

  // Iterate charging entries and put into the right hour_entry
  for (let ci = 0; ci < session.charging_history.length; ci++) {
    const start = session.charging_history[ci].timestamp;
    let end = null;
    if (ci == session.charging_history.length - 1) {
      if (session.end_time != null) end = session.end_time;
      else end = dayjs().unix();
    } else {
      end = session.charging_history[ci + 1].timestamp;
    }
    if (start == end) continue; // Same second admin type entry - skip it.

    let remain = session.charging_history[ci].wh ?? 0;
    for (
      let hour_index = 0;
      hour_index < hour_entries.length - 1;
      hour_index++
    ) {
      const bstart = hour_entries[hour_index].timestamp;
      const bend = hour_entries[hour_index + 1].timestamp;

      // How much overlap
      const overlap_s = Math.min(end, bend) - Math.max(start, bstart);
      if (overlap_s <= 0) continue;

      // Vs. length? - this determines the relative contribution
      const contrib_wh =
        (session.charging_history[ci].wh ?? 0) * (overlap_s / (end - start));
      if (hour_entries[hour_index].wh == null)
        hour_entries[hour_index].wh = contrib_wh;
      else
        // @ts-expect-error
        hour_entries[hour_index].wh += contrib_wh;
      remain -= contrib_wh;
    }
    if (remain > 1)
      console.log("Warning, remaining for session", session.session_id, remain);
  }

  // First, let's review the totals to make sure they add up. If not, adjust them into first entry.
  let total_check = 0;
  for (let hour_index = 0; hour_index < hour_entries.length; hour_index++)
    total_check += hour_entries[hour_index].wh ?? 0;
  if (Math.abs(total_check - session.energy_meter) > 1) {
    //console.log("Adjusting data for session", session.session_id, "missed to distribute energy", session.energy_meter);
    const diff = session.energy_meter - total_check;
    hour_entries[0].wh = (hour_entries[0].wh ?? 0) + diff;
  }

  // Separate loop for kwh_total
  let kwh_total = 0.0;
  for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
    kwh_total += hour_entries[hour_index].wh ?? 0 / 1000.0;
    hour_entries[hour_index].kwh_total = kwh_total;
  }

  // Now, let's add all entries to the session object.
  session.hourly_history = [];
  for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
    session.hourly_history.push(hour_entries[hour_index]);
  }
}

export function augment_session_data(sessionData: Array<SESSION>) {
  for (let i = 0; i < sessionData.length; i++) {
    augment_1session(sessionData[i]);
  }
}
