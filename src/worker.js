var port;

self.addEventListener('push', function(event) {

  try {
    var notification = event.data.json();
  } catch (e) {
    var notification = {};
    console.dir(e);
  }

  console.dir(notification);
  if (!notification.type) {
    console.error('Notification type not specified');
    return;
  }

  if (notification.type === 'new') {
    new_notification(event, notification);
  }

  if (notification.type === 'acknowledge') {
    clear_notification(event, notification);
  }


});

self.addEventListener('notificationclick', function(event) {

  if (event.action) {
    fetch('/api/action/' + event.action, {'method': 'POST'});
  }

  fetch('/api/acknowledge/' + event.notification.tag, {'method': 'POST'});

  event.notification.close();
});

function new_notification(event, notification) {
  event.waitUntil(
    self.registration.showNotification('Abode Notification', {
      body: notification.message || 'Test Notification',
      tag: 'test-notify',
      actions: [
        {
          'action': 'action1',
          'title': 'Action1',
        },
        {
          'action': 'action2',
          'title': 'Action2',
        }
      ]
    })
  );
};

function clear_notification(event, notification) {
  self.registration.getNotifications({ tag : notification.tag }).then(function (notifications) {
    notifications.forEach(function (item) {
      item.close();
    });
  })
};
