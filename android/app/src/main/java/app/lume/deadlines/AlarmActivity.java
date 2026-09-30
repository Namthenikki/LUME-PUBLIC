package app.lume.deadlines;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

/** The full-screen alarm, shown over the lock screen: countdown, Mark done, Snooze. */
public class AlarmActivity extends Activity {
    static final String CLOSE = "app.lume.deadlines.CLOSE_ALARM";

    private final Handler tick = new Handler(Looper.getMainLooper());
    private JSONObject alarm;
    private ObjectAnimator pulse;

    private final BroadcastReceiver closer = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            finish();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setShowWhenLocked(true);
        setTurnScreenOn(true);
        setContentView(R.layout.activity_alarm);
        ContextCompat.registerReceiver(this, closer, new IntentFilter(CLOSE), ContextCompat.RECEIVER_NOT_EXPORTED);

        findViewById(R.id.done).setOnClickListener(v -> act(ActionReceiver.DONE));
        findViewById(R.id.snooze).setOnClickListener(v -> act(ActionReceiver.SNOOZE));
        findViewById(R.id.open).setOnClickListener(v -> {
            Alarms.stop(this, alarm.optString("taskId"));
            startActivity(new Intent(this, LumeLauncherActivity.class)
                    .setData(Uri.parse(Api.ORIGIN + "/dashboard?task=" + Uri.encode(alarm.optString("taskId"))))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            finish();
        });

        View mark = findViewById(R.id.mark);
        pulse = ObjectAnimator.ofPropertyValuesHolder(mark,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.14f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.14f));
        pulse.setDuration(650);
        pulse.setRepeatCount(ValueAnimator.INFINITE);
        pulse.setRepeatMode(ValueAnimator.REVERSE);
        pulse.start();

        show(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        show(intent);
    }

    private void show(Intent intent) {
        try {
            alarm = new JSONObject(intent.getStringExtra(Alarms.EXTRA));
        } catch (JSONException | NullPointerException e) {
            finish();
            return;
        }
        ((TextView) findViewById(R.id.title)).setText(alarm.optString("title"));
        ((TextView) findViewById(R.id.course)).setText(alarm.optString("course"));
        ((TextView) findViewById(R.id.due)).setText("Due " + Alarms.timeIST(alarm.optLong("dueAt")));
        tick.removeCallbacksAndMessages(null);
        tick.post(new Runnable() {
            @Override
            public void run() {
                long left = Math.max(0, alarm.optLong("dueAt") - System.currentTimeMillis()) / 1000;
                String text = left >= 3600
                        ? String.format(Locale.ENGLISH, "%dh %02dm", left / 3600, (left % 3600) / 60)
                        : String.format(Locale.ENGLISH, "%02d:%02d", left / 60, left % 60);
                ((TextView) findViewById(R.id.countdown)).setText(text);
                tick.postDelayed(this, 1000);
            }
        });
    }

    private void act(String action) {
        sendBroadcast(ActionReceiver.intent(this, action, alarm));
        finish();
    }

    @Override
    protected void onDestroy() {
        tick.removeCallbacksAndMessages(null);
        if (pulse != null) pulse.cancel();
        unregisterReceiver(closer);
        super.onDestroy();
    }
}
