package app.lume.deadlines;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * "Mark done" and "Snooze 10 min" from an alarm (notification or full screen), and "Mark done" and
 * "Remind in 2h" from a reminder.
 */
public class ActionReceiver extends BroadcastReceiver {
    static final String DONE = "app.lume.deadlines.DONE";
    static final String SNOOZE = "app.lume.deadlines.SNOOZE";
    static final String REMIND_LATER = "app.lume.deadlines.REMIND_LATER";

    static Intent intent(Context c, String action, JSONObject alarm) {
        return new Intent(c, ActionReceiver.class)
                .setAction(action)
                .setData(Uri.parse("lume://task/" + Uri.encode(alarm.optString("taskId"))))
                .putExtra(Alarms.EXTRA, alarm.toString());
    }

    static PendingIntent pending(Context c, String action, JSONObject alarm) {
        return PendingIntent.getBroadcast(c, 0, intent(c, action, alarm), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        JSONObject alarm;
        try {
            alarm = new JSONObject(intent.getStringExtra(Alarms.EXTRA));
        } catch (JSONException | NullPointerException e) {
            return;
        }
        Context app = context.getApplicationContext();
        String taskId = alarm.optString("taskId");
        Alarms.stop(app, taskId);
        Reminders.cancel(app, taskId);
        app.sendBroadcast(new Intent(AlarmActivity.CLOSE).setPackage(app.getPackageName()));

        if (SNOOZE.equals(intent.getAction())) {
            Alarms.snooze(app, alarm);
            return;
        }
        if (REMIND_LATER.equals(intent.getAction())) {
            // Lume snoozes the task for 2 hours; the next sync moves its reminders and alarms.
            PendingResult result = goAsync();
            new Thread(() -> {
                try {
                    if (Api.postAction(taskId, "snooze", alarm.optString("actionToken"))) SyncWorker.syncNow(app);
                    else notifyFailure(app, alarm, "Couldn't snooze " + alarm.optString("title"));
                } finally {
                    result.finish();
                }
            }).start();
            return;
        }
        if (DONE.equals(intent.getAction())) {
            if (taskId.startsWith(BridgeActivity.TEST_TASK)) return; // nothing to mark on the server
            Alarms.cancelTask(app, taskId);
            PendingResult result = goAsync();
            new Thread(() -> {
                try {
                    if (!Api.postAction(taskId, "done", alarm.optString("actionToken"))) {
                        notifyFailure(app, alarm, "Couldn't mark " + alarm.optString("title") + " done");
                    }
                } finally {
                    result.finish();
                }
            }).start();
        }
    }

    private static void notifyFailure(Context c, JSONObject alarm, String title) {
        Alarms.ensureChannel(c);
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        if (!nm.areNotificationsEnabled()) return;
        try {
            nm.notify(("done-failed:" + alarm.optString("taskId")).hashCode(), new NotificationCompat.Builder(c, Alarms.CHANNEL)
                    .setSmallIcon(R.drawable.ic_stat_lume)
                    .setContentTitle(title)
                    .setContentText("No connection. Open Lume to do it there.")
                    .setSilent(true)
                    .setAutoCancel(true)
                    .setContentIntent(PendingIntent.getActivity(c, 0, new Intent(c, LumeLauncherActivity.class), PendingIntent.FLAG_IMMUTABLE))
                    .build());
        } catch (SecurityException ignored) {
            // notification permission was revoked
        }
    }
}
