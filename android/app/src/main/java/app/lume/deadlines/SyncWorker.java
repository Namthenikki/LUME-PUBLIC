package app.lume.deadlines;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

/** Keeps the phone's alarms in step with Lume: every 15 minutes, and right after the app opens. */
public class SyncWorker extends Worker {
    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        try {
            Api.Schedule schedule = Api.fetchSchedule(c, 15_000);
            if (schedule == null) {
                Device.setPaired(c, false);
                // Not paired with anyone (not approved yet, signed out, or alarms stopped): nothing set on this
                // phone should ring, since it may be the previous student's.
                Alarms.replaceAll(c, new JSONArray(), Collections.emptySet());
                // Not approved yet. The owner is probably unlocking Lume right now, so keep checking
                // every minute for the first 10 minutes after launch instead of waiting for the next 15-minute run.
                long sinceLaunch = System.currentTimeMillis() - Device.prefs(c).getLong("launched_at", 0);
                if (sinceLaunch < 10 * 60_000L) {
                    WorkManager.getInstance(c).enqueueUniqueWork("lume-alarms-pairing", ExistingWorkPolicy.REPLACE,
                            new OneTimeWorkRequest.Builder(SyncWorker.class).setInitialDelay(1, TimeUnit.MINUTES).build());
                }
                return Result.success();
            }
            Device.setPaired(c, true);
            Alarms.replaceAll(c, schedule.alarms, schedule.pendingTaskIds);
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    /** One sync right away, e.g. after a snooze moved a task's reminders. */
    static void syncNow(Context c) {
        Constraints online = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(c).enqueueUniqueWork("lume-alarms-now", ExistingWorkPolicy.REPLACE,
                new OneTimeWorkRequest.Builder(SyncWorker.class).setConstraints(online).build());
    }

    static void enqueue(Context c) {
        Device.prefs(c).edit().putLong("launched_at", System.currentTimeMillis()).apply();
        WorkManager wm = WorkManager.getInstance(c);
        Constraints online = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        wm.enqueueUniquePeriodicWork("lume-alarms", ExistingPeriodicWorkPolicy.KEEP,
                new PeriodicWorkRequest.Builder(SyncWorker.class, 15, TimeUnit.MINUTES).setConstraints(online).build());
        wm.enqueueUniqueWork("lume-alarms-now", ExistingWorkPolicy.REPLACE,
                new OneTimeWorkRequest.Builder(SyncWorker.class).setConstraints(online).build());
    }
}
