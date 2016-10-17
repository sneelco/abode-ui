var notifications = angular.module('abode.notifications', ['ngResource']);

notifications.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.when('/notifications', '/notifications/list');

  $stateProvider
  .state('main.notifications', {
    url: '/notifications',
    templateUrl: '/views/notifications/notifications.html',
  })
  .state('main.notifications.list', {
    url: '/list',
    templateUrl: '/views/notifications/notifications.list.html',
    controller: 'notificationsList'
  })
  .state('main.notifications.add', {
    url: '/add',
    templateUrl: '/views/notifications/notifications.add.html',
    controller: 'notificationsAdd'
  })
  .state('main.notifications.edit', {
    url: '/:id',
    templateUrl: '/views/notifications/notifications.edit.html',
    controller: 'notificationsEdit',
    resolve: {
      'notification': ['$stateParams', '$state', 'Notifications', function ($stateParams, $state, Notifications) {

        return Notifications.get({'id': $stateParams.id}).$promise;

      }]
    }
  });
});

notifications.factory('Notifications', ['$resource', '$http', '$q', '$uibModal', 'abode', function ($resource, $http, $q, $uibModal, abode) {

  var model = $resource(abode.url('/api/notifications/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'refresh': { method: 'GET' },
    'active': { method: 'GET', isArray: true, params: {'id': 'active'} },
  });

  model.prototype.$deactivate = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/notifications/' + this._id + '/deactivate').value();

    $http.post(url).then(function () {
      defer.resolve(self);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  return model;

}]);

notifications.directive('notifications', [function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      'view': '@'
    },
    controller: ['$rootScope', '$scope', '$interval', '$q', 'abode', 'Notifications', function ($rootScope, $scope, $interval, $q, abode, Notifications) {
      $scope.notifications = [];
      $scope.loader = false;
      $scope.loading = false;
      $scope.error = false;

      $scope.dismissAll = function () {
        var defers = [];

        $scope.notifications.forEach(function (notification) {
          defers.push(notification.$deactivate());
        });

        $q.all(defers).then(function () {
          $scope.refresh();
        });
      };

      $scope.refresh = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;

        Notifications.active().$promise.then(function (results) {
          if (results.length !== 0 && results.length !== $scope.notifications.length) {
            $rootScope.breakIdle();
          }
          $scope.loading = false;
          $scope.notifications = results;
        }, function () {
          $scope.loading = false;
        });
      };

      $scope.dismiss = function () {
        $scope.refresh();
      };

      $scope.loader = $interval($scope.refresh, 5000);
      $scope.refresh();

      $scope.$on('$destroy', function () {
        $interval.cancel($scope.loader);
      });
    }],
    templateUrl: 'views/notifications/index.html'
  };
}]);

notifications.controller('notificationsList', ['$scope', 'Notifications', function ($scope, Notifications) {

  $scope.notifications = Notifications.query();

  $scope.add = function () {

  };

}]);

notifications.controller('notificationsAdd', ['$scope', '$state', 'abode', 'Notifications', function ($scope, $state, abode, Notifications) {

  $scope.saving = false;
  $scope.notification = new Notifications({'actions': [], 'triggers': []});


  $scope.add = function () {
    $scope.saving = true;

    $scope.notification.$save().then(function () {
      $scope.saving = false;
      abode.message({'type': 'success', 'message': 'Notification Added'});

      $state.go('^.list');
    }, function (err) {
      $scope.saving = false;
      abode.message({'type': 'failed', 'message': 'Failed to Add Notification', 'details': err});
      $scope.errors = err;
    });

  };

}]);

notifications.controller('notificationsEdit', ['$scope', '$state', 'abode', 'notification', function ($scope, $state, abode, notification) {

  $scope.notification = notification;
  $scope.saving = false;
  $scope.deleting = false;

  $scope.save = function () {
    $scope.saving = true;

    $scope.notification.$update().then(function () {
      $scope.saving = false;
      abode.message({'type': 'success', 'message': 'Notification Updated'});
    }, function (err) {
      $scope.saving = false;
      abode.message({'type': 'failed', 'message': 'Failed to Update Notification', 'details': err});
      $scope.errors = err;
    });

  };

  $scope.delete = function () {

    $scope.deleting = true;

    $scope.notification.$delete().then(function () {
      $scope.deleting = false;
      abode.message({'type': 'success', 'message': 'Notification Deleted'});

      $state.go('^.list');
    }, function (err) {
      $scope.deleting = false;
      abode.message({'type': 'failed', 'message': 'Failed to Delete Notification', 'details': err});
      $scope.errors = err;
    });
  };

}]);
