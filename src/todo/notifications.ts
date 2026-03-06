import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === 'granted') return true;

  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function scheduleTaskReminder(taskTitle: string) {
  // Simple & stabil: Erinnerung in 1 Stunde (später bauen wir Datum/Uhrzeit Picker)
  const trigger: Notifications.NotificationTriggerInput = {
  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  seconds: 60 * 60,
  repeats: false,
};

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Kalendulu · Aufgabe',
      body: taskTitle,
      sound: true,
    },
    trigger,
  });

  return id;
}

export async function cancelReminder(notificationId?: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

export async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  });
}