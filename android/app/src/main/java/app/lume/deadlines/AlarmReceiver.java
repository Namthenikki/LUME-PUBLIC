package app.lume.deadlines;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * An alarm or a reminder is due. First ask Lume (briefly) whether the task is still pending, so a
 * task marked done since the last sync stays quiet. If Lume can't be reached, go ahead anyway.
 */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        JSONObject alarm;
        try {
            alarm = new JSONObject(intent.getStringExtra(Alarms.EXTRA));
        } catch (JSONException | NullPointerException e) {
            return;
        }
        Context app = context.getApplicationContext();
        if (alarm.optString("taskId").startsWith(BridgeActivity.TEST_TASK)) {
            Alarms.ring(app, alarm); // the test alarm has no task to check, and rings even at night
            return;
        }
        boolean reminder = Reminders.isReminder(alarm);
        // Quiet hours: alarms don't ring (e.g. a snooze that lands after midnight); reminders still show, silently.
        if (!reminder && Alarms.isQuietNow()) return;
        PendingResult result = goAsync();
        new Thread(() -> {
            try {
                boolean ring = true;
                try {
                    Api.Schedule schedule = Api.fetchSchedule(app, 4000);
                    if (schedule != null) {
                        Alarms.replaceAll(app, schedule.alarms, schedule.pendingTaskIds);
                        ring = schedule.pendingTaskIds.contains(alarm.optString("taskId"));
                    }
                } catch (Exception offline) {
                    // No connection: better to ring for a finished task than miss a deadline.
                }
                if (ring && reminder) Reminders.show(app, alarm);
                else if (ring) Alarms.ring(app, alarm);
            } finally {
                result.finish();
            }
        }).start();
    }
}
