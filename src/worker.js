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

  //Default to a dismiss_token
  var action_url = event.action;

  if (!event.action) {
    event.notification.actions.forEach(function (action) {
      if (action.title === 'Dismiss') {
        action_url = action.action
      }
    });
  }

  //If we have a action_token and url, send out request
  if (action_url) {
    fetch(action_url, {'method': 'POST'});
  } else {
    console.log('no action and/or url');
  }

  //And then close our notification
  event.notification.close();
});

function new_notification(event, notification) {
  var actions = [];

  notification.actions = notification.actions || [];
  notification.actions.forEach(function (action) {
    actions.push({
      'action': notification.url + '/api/notifications/action/' + action.token,
      'title': action.title,
    })
  });

  if (notification.deactive_token) {
    actions.push({
      'action': notification.url + '/api/notifications/action/' + notification.deactive_token,
      'title': 'Dismiss',
    });
  }

  event.waitUntil(
    self.registration.showNotification('Abode', {
      icon: notification.icon || '/images/home.png',
      body: notification.message || 'Test Notification',
      tag: notification._id || 'test-notification',
      actions: actions,
    })
  );
};

function clear_notification(event, notification) {
  self.registration.getNotifications({ tag : notification._id || 'test-notification' }).then(function (notifications) {
    notifications.forEach(function (item) {
      item.close();
    });
  })
};
