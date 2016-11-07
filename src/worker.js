var port;

self.addEventListener('push', function(event) {

  try {
    var notification = event.data.json();
  } catch (e) {
    var notification = {};
    console.dir(e);
  }

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
  var headers = {};
  var config = {};
  var server;

  try {
    config = JSON.parse(localStorage.getItem('abode'));
    config = config || {};

    server = config.server;
    if (config.auth && config.auth.token) {
      headers = {
        'client_token': config.auth.token.client_token,
        'auth_token': config.auth.token.auth_token,
      }
    }
  } catch (e) {}

  console.dir(config);
  if (event.action) {
    fetch(server + '/api/notifications/' + event.notification + '/do_action/' + event.action, {'method': 'POST', 'headers': headers});
  }

  fetch(server + '/api/notifications/' + event.notification + '/deactivate', {'method': 'POST'});

  event.notification.close();
});

function new_notification(event, notification) {
  var actions = [];

  notification.actions = notification.actions || [];
  notification.actions.forEach(function (action) {
    actions.push({
      'action': action._id,
      'title': action.title,
      'args': action.args,
      'notification': notification._id,
    })
  });

  event.waitUntil(
    self.registration.showNotification('Abode Notification', {
      body: notification.message || 'Test Notification',
      tag: notification._id || 'test-notification',
      actions: actions
    })
  );
};

function clear_notification(event, notification) {
  self.registration.getNotifications({ tag : notification.notification._id || 'test-notification' }).then(function (notifications) {
    notifications.forEach(function (item) {
      item.close();
    });
  })
};
