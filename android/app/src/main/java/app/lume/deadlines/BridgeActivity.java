package app.lume.deadlines;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Buttons in Lume's web Settings reach the app through lume:// links (sent as Android intent URLs):
 *   lume://test-alarm  rings a test alarm in 10 seconds
 *   lume://sync        fetches the alarm schedule right now
 *   lume://update      downloads and installs the latest Lume
 */
public class BridgeActivity extends Activity {
    static final String TEST_TASK = "lume-test";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent().getData();
        String what = data == null ? "" : data.getHost();

        if ("test-alarm".equals(what)) {
            if (PermissionActivity.needed(this)) {
                startActivity(new android.content.Intent(this, PermissionActivity.class));
                Toast.makeText(this, "Allow notifications, then tap Ring a test alarm again", Toast.LENGTH_LONG).show();
            } else {
                scheduleTest();
                Toast.makeText(this, "Test alarm rings in 10 seconds", Toast.LENGTH_LONG).show();
            }
        } else if ("sync".equals(what)) {
            SyncWorker.enqueue(this);
            Toast.makeText(this, "Syncing alarms…", Toast.LENGTH_SHORT).show();
        } else if ("update".equals(what)) {
            startActivity(new android.content.Intent(this, UpdateActivity.class));
        }
        finish();
    }

    private void scheduleTest() {
        long now = System.currentTimeMillis();
        try {
            JSONObject alarm = new JSONObject()
                    .put("id", TEST_TASK + ":" + now)
                    .put("taskId", TEST_TASK)
                    .put("at", now + 10_000)
                    .put("dueAt", now + 10 * 60_000 + 10_000)
                    .put("minutesLeft", 10)
                    .put("title", "Test alarm")
                    .put("course", "This is how Lume rings before a deadline")
                    .put("actionToken", "");
            Alarms.scheduleOnce(this, alarm);
        } catch (JSONException ignored) {
            // fixed keys and values; can't fail
        }
    }
}
